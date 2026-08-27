# 공사지역 조회 — Cloudflare 설정 안내

입찰 금액 도우미의 **공사지역** 칸은 공공데이터포털
**‘행정안전부_통계연보_지방자치단체’** 오픈API에서 시도·시군구 목록을 받아와
입력한 지역명이 어느 지방자치단체인지 찾아줍니다.

인증키가 브라우저로 새어 나가지 않도록, 오픈API는 브라우저가 직접 부르지 않고
Cloudflare Pages Function(`functions/api/regions.js`)이 대신 호출합니다.

```
브라우저  ──GET /api/regions──▶  Cloudflare Pages Function  ──인증키 첨부──▶  공공데이터포털
                                (인증키는 여기에만 있음)
```

---

## 1. 환경변수 넣기

Cloudflare 대시보드 → **Workers & Pages → 해당 Pages 프로젝트 → Settings → Variables and Secrets**

| 변수명 | 필수 | 값 |
|---|:---:|---|
| `DATA_GO_KR_SERVICE_KEY` | ✅ | 공공데이터포털 마이페이지의 **일반 인증키** |
| `REGION_API_URL` | 선택 | 요청 URL을 바꿔야 할 때만 (아래 2번 참고) |

- 인증키는 **Secret**(암호화)으로 넣는 것을 권장합니다.
- `DATA_GO_KR_SERVICE_KEY` 대신 `DATA_GO_KR_API_KEY`, `REGION_API_KEY`,
  `SERVICE_KEY`, `DATA_PORTAL_KEY` 이름으로 넣어도 인식합니다.
- **Encoding / Decoding 인증키 아무거나** 넣어도 됩니다.
  `%2B` 같은 퍼센트 인코딩이 들어 있으면 그대로, 아니면 함수가 인코딩해서 붙입니다.
- 값을 바꾼 뒤에는 **재배포(Retry deployment)** 를 해야 반영됩니다.

## 2. `REGION_API_URL` — 보통은 안 넣어도 됩니다

기본 주소가 이미 코드에 들어 있습니다.

```
https://apis.data.go.kr/1741000/LocalGovernment/getLocalGovernment
```

('행정안전부_통계연보_지방자치단체'의 상세기능 **‘지방자치단체 통계 정보’**)

포털에서 주소가 바뀌었을 때만 `REGION_API_URL`에 새 주소를 넣으면 됩니다.
찾는 법은 데이터 상세 페이지 → **상세기능 → ‘미리보기’** 를 누르면 새 탭이 열리는데,
그 탭 **주소창 URL의 `?` 앞부분**까지가 값입니다.

인증키·`pageNo`·`numOfRows`·`type`은 함수가 알아서 붙이니 빼고 넣으세요.
파라미터 이름이 `serviceKey`인지 `ServiceKey`인지도 신경 쓸 필요 없습니다 — 둘 다 보냅니다.

## 3. 잘 붙었는지 확인

배포된 주소에서 `/api/regions` 를 열어봅니다.

- 성공: `{"ok":true,"source":"https://apis.data.go.kr/...","count":229,"regions":[...]}`
- 실패: `{"ok":false,"error":"...","hint":"...","tried":[...]}`
  → `tried` 안의 `reason`에 원인이 적혀 있습니다.
  (`SERVICE_KEY_IS_NOT_REGISTERED_ERROR` = 인증키/승인 문제,
  `HTTP 404` = `REGION_API_URL`이 틀림)

화면 아래쪽에도 어느 자료를 썼는지 항상 표시됩니다.

- `공공데이터포털 ‘행정안전부_통계연보_지방자치단체’ 자료 기준`
  → 오픈API 연결됨. 시군구까지 포털 자료를 씁니다.
- `시도는 공공데이터포털, 시군구는 내장 표 기준`
  → 오픈API는 붙었는데 응답에 시군구가 없는 경우입니다. 조회는 정상 동작합니다.
- `내장 지자체 표 기준 (오픈API 미연결)`
  → 아직 연결 안 됨. 위 `/api/regions` 응답을 확인해주세요.

## 4. 오픈API가 없어도 동작합니다

인증키를 넣기 전이거나 포털이 점검 중이어도 조회 자체는 됩니다.
`js/regionApi.js`에 전국 시도·시군구 표(228건)가 들어 있어 그것으로 대신 찾습니다.
오픈API가 시군구까지 내려주면 그 결과를 우선 쓰고, 브라우저에 7일간 캐시합니다.

## 5. 전남광주통합특별시

통합 지자체라 오픈API 목록에 없을 수 있어 `js/regionApi.js`의 시도 기준표에
직접 넣어두었습니다. 조회하면 공식 명칭과 줄임말이 **두 줄**로 나옵니다.

```
전남광주통합특별시
전남광주
```

## 참고 — Pages가 아니라 Workers를 쓴다면

`functions/api/regions.js`는 **Cloudflare Pages Functions** 규칙(`functions/` 폴더 =
라우트)을 따릅니다. Workers로 배포한다면 이 파일의 `onRequestGet`을
`export default { fetch(request, env) { ... } }` 형태로 감싸고
`/api/regions` 경로를 라우트에 연결하면 그대로 쓸 수 있습니다.
