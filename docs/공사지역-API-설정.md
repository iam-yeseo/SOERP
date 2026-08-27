# 공사지역 조회 — Cloudflare 설정 안내

입찰 금액 도우미의 **공사지역** 칸은 공공데이터포털
**‘행정안전부_행정표준코드_법정동코드’(StanReginCd)** 에서 입력한 지역명을 찾습니다.
시도·시군구는 물론 **읍면동·리까지** 조회됩니다.

인증키가 브라우저로 새어 나가지 않도록, 오픈API는 브라우저가 직접 부르지 않고
서버 쪽 프록시가 대신 호출합니다.

```
브라우저 ──GET /api/regions?q=미아동──▶ 프록시 ──인증키 첨부──▶ 공공데이터포털
                                        (인증키는 여기에만 있음)
```

전체 목록을 내려받지 않고 **검색어를 그때그때 넘기는 방식**입니다.
(`locatadd_nm` 파라미터로 서버에서 검색됩니다.)

## 프록시를 어디에 둘지 — 먼저 이것부터

정적 사이트를 무엇이 서빙하느냐에 따라 두 가지입니다.
**`/api/regions` 가 404라면 A가 아니라 B입니다.**

| | 쓰는 파일 | 조건 |
|---|---|---|
| **A. Cloudflare Pages** | `functions/api/regions.js` | 저장소가 Cloudflare **Pages**에 Git 연결돼 있을 것 |
| **B. Cloudflare Worker** | `worker/regions-worker.js` | 그 외 전부 (GitHub Pages 등) |

### 지금 어느 쪽인지 확인하기

Cloudflare 대시보드 → Workers & Pages → 해당 Pages 프로젝트 →
최근 **Deployment → Build log** 를 열어 `Functions` 관련 줄을 봅니다.

- `Found Functions directory` / `Compiled Worker successfully` → **A**. 그런데도 404면
  Settings의 **Root directory**가 `/` 인지 확인해주세요. 다른 폴더로 잡혀 있으면
  `functions/`를 못 찾습니다.
- Functions 언급이 아예 없음, 또는 Pages 프로젝트 자체가 없음 → **B**

> 저장소에 GitHub Pages(`pages build and deployment`) 워크플로도 함께 돌고 있습니다.
> Cloudflare로만 배포한다면 GitHub 저장소 Settings → Pages 에서 꺼두는 편이 헷갈리지 않습니다.
> (`CNAME` 파일은 GitHub Pages 전용이라 Cloudflare Pages에서는 무시됩니다.)

---

## B를 쓸 경우 — Worker 만들기

1. Cloudflare 대시보드 → **Workers & Pages → Create → Worker** 로 새 Worker를 만듭니다.
2. **Edit code** 를 열고 `worker/regions-worker.js` 내용을 **통째로 붙여넣습니다.**
   import이 없는 단일 파일이라 그대로 동작합니다.
3. 아래 1번대로 환경변수를 넣습니다.
4. **Settings → Domains & Routes → Add route** 에 이렇게 겁니다.

   ```
   soerp.yeseo.im/api/*
   ```

   이러면 정적 사이트보다 Worker가 먼저 가로채므로 **프런트엔드는 손댈 필요가 없습니다.**

5. 라우트를 못 걸고 `xxx.workers.dev` 주소를 쓸 거라면, `index.html` 의
   `regionApi.js` **앞에** 한 줄만 넣어주세요. (Worker가 CORS 헤더를 붙입니다.)

   ```html
   <script>window.SOERP_REGION_API = "https://xxx.workers.dev/api/regions";</script>
   ```

`wrangler` CLI가 편하면 `worker/wrangler.toml` 이 준비돼 있습니다.

```bash
npx wrangler secret put DATA_GO_KR_SERVICE_KEY --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

---

## 1. 환경변수 넣기

Pages를 쓰면 **Pages 프로젝트 → Settings → Variables and Secrets**,
Worker를 쓰면 **Worker → Settings → Variables and Secrets** 입니다.

| 변수명 | 필수 | 값 |
|---|:---:|---|
| `DATA_GO_KR_SERVICE_KEY` | ✅ | 공공데이터포털 마이페이지의 **일반 인증키** |
| `REGION_API_URL` | 선택 | 요청 URL이 바뀌었을 때만 (아래 2번) |

- 인증키는 **Secret**(암호화)으로 넣는 것을 권장합니다.
- `DATA_GO_KR_SERVICE_KEY` 대신 `DATA_GO_KR_API_KEY`, `REGION_API_KEY`,
  `SERVICE_KEY`, `DATA_PORTAL_KEY` 이름으로 넣어도 인식합니다.
- **Encoding / Decoding 인증키 아무거나** 넣어도 됩니다.
  `%2B` 같은 퍼센트 인코딩이 들어 있으면 그대로, 아니면 함수가 인코딩해서 붙입니다.
- 값을 바꾼 뒤에는 **재배포**(Pages는 Retry deployment, Worker는 Deploy)를 해야 반영됩니다.

## 2. 요청 URL — 보통은 안 넣어도 됩니다

기본 주소가 이미 코드에 들어 있습니다.

```
https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList
```

함수가 붙이는 파라미터는 `ServiceKey`, `type=json`, `pageNo=1`,
`numOfRows=1000`(오픈API 한 번 호출 최대치), `flag=Y`, `locatadd_nm=<검색어>` 입니다.

포털에서 주소가 바뀌었을 때만 `REGION_API_URL`에 새 주소의 **`?` 앞부분**까지 넣으면 됩니다.

## 3. 잘 붙었는지 확인 — 자가 점검

배포된 주소에서 **검색어 없이** `/api/regions` 를 열면 스스로 점검해서 알려줍니다.

```
https://soerp.yeseo.im/api/regions
```

```json
{ "ok": true,
  "인증키": "설정됨 (환경변수 DATA_GO_KR_SERVICE_KEY, 88자)",
  "요청주소": "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList",
  "검사": [ { "검색어": "서울특별시", "결과수": 3, "예시": "서울특별시" },
            { "검색어": "강북구",   "결과수": 2, "예시": "서울특별시 강북구" },
            { "검색어": "미아동",   "결과수": 1, "예시": "서울특별시 강북구 미아동" } ],
  "판정": "정상입니다. 시도·시군구·읍면동까지 모두 검색됩니다." }
```

인증키 값은 응답에 담기지 않습니다. 설정 여부와 길이만 나옵니다.

### 개별 검색 확인

`/api/regions?q=강북구` 처럼 검색어를 붙이면 실제 조회 결과가 나옵니다.

성공:

```json
{ "ok": true, "q": "강북구", "exact": true, "total": 1,
  "items": [ { "code": "1130500000", "level": 2,
               "full": "서울특별시 강북구", "name": "강북구" } ] }
```

실패하면 `{"ok":false,"error":...,"detail":...,"hint":...}` 가 나옵니다.
`detail`에 원인이 적혀 있습니다.

| detail | 원인 |
|---|---|
| `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` | 인증키가 틀렸거나 아직 승인 전 |
| `290 ...` | 인증키가 유효하지 않음 |
| `337 ...` | 일별 트래픽 제한 초과 |
| `HTTP 404` | `REGION_API_URL`이 틀림 |

화면 아래쪽에도 어느 자료를 썼는지 항상 표시됩니다.

- `공공데이터포털 ‘행정안전부_행정표준코드_법정동코드’ 기준` → 정상
- `내장 시도·시군구 표 기준 (오픈API 미연결 — 읍면동·리는 조회되지 않습니다)` → 아직 연결 안 됨

## 4. 검색이 동작하는 방식

1. 줄임말은 공식 명칭으로 바꿔 물어봅니다. (`서울시` → `서울특별시`)
2. `locatadd_nm=<검색어>` 로 오픈API를 호출합니다.
3. 결과가 하나도 없고 검색어가 **시/군/구/읍/면/동/리로 끝나지 않으면**,
   그 7개를 붙여 한 번에 다시 찾아봅니다. (`강북` → `강북구`)
4. 최하위지역명이 **정확히 일치**하는 게 있으면 그것만 보여줍니다.
   `중구` 를 치면 전국의 중구들만 나오고, 그 안의 동까지 딸려 나오지 않습니다.
   접미사를 뺀 입력도 같이 봅니다. (`여수` → `여수시`, `신월` → 신월동·신월리)
5. 정확히 일치하는 게 없으면 부분일치를 시도→시군구→읍면동→리 순으로 보여줍니다.
   너무 많으면 앞쪽 40곳만 보여주고 몇 곳이 더 있는지 알려줍니다.

같은 검색어는 브라우저 안에서 한 번만 호출하고, Cloudflare에서도 6시간 캐시합니다.
입력이 멈추고 0.35초 뒤에 호출하므로 글자마다 호출되지는 않습니다.

## 5. 오픈API가 없어도 동작합니다

인증키를 넣기 전이거나 포털이 점검 중이어도 **시도·시군구까지는** 조회됩니다.
`js/regionApi.js`에 전국 시도·시군구 표(228건)가 들어 있어 그것으로 대신 찾습니다.
다만 **읍면동·리는 오픈API가 연결되어야만** 나옵니다.

## 6. 전남광주통합특별시

통합 지자체라 법정동코드에 없어서 `js/regionApi.js`의 시도 기준표에 직접 넣어두었습니다.
조회하면 오픈API를 거치지 않고 공식 명칭과 줄임말이 **두 줄**로 나옵니다.

```
전남광주통합특별시
전남광주
```

## 참고 — 두 파일의 관계

`functions/api/regions.js`(Pages Functions)와 `worker/regions-worker.js`(Worker)는
**검색 로직·응답 형식·자가 점검이 모두 같습니다.** 차이는 진입점뿐입니다.

| | 진입점 | CORS |
|---|---|---|
| `functions/api/regions.js` | `export async function onRequestGet(context)` | 같은 도메인이라 불필요 |
| `worker/regions-worker.js` | `export default { fetch(request, env) }` | 붙임 (workers.dev 대응) |

한쪽을 고치면 다른 쪽도 같이 고쳐야 합니다.
