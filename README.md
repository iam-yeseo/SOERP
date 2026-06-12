# SOERP - 김소은상회(주) 업무 매니지먼트

건설/공사 행정 업무를 카테고리별 체크리스트와 함께 관리하는 대시보드입니다.
**순수 HTML/CSS/Vanilla JS + Supabase**로 만들어져 빌드 과정 없이 GitHub Pages에서 바로 작동합니다.

> 샘플 데이터는 모두 가상의 데이터입니다.

## 주요 기능

- **로그인**: 이메일/비밀번호 회원가입·로그인 (Supabase Auth). 로그인해야 업무 화면에 접근할 수 있고, 계정별로 데이터가 분리됩니다.
- **대시보드**: 오늘의 업무 / 마감 지난 업무 / 마감 임박(3일) / 확인 대기, 완료율·상태/카테고리/우선순위 현황, 최근 완료 업무
- **업무 현황**: 검색(제목·요청자·현장·거래처·메모), 상태/카테고리/우선순위/완료여부 필터, 마감일·생성일·우선순위 정렬, 카드형/테이블형 전환, 상태 빠른 변경, 등록/삭제
- **업무 상세**: 체크리스트 추가·수정·삭제·체크(진행률 자동 계산), 상태 변경, 완료 처리, 수정, 삭제, 댓글형 메모(작성 일시 표시, 바로 입력/삭제)
- **달력**: 마감일(없으면 업무 날짜) 기준 월별 일정 보기, 이전/다음/오늘 이동, 업무 클릭 시 상세 이동
- **업무 템플릿**: 기본 9종(입찰 / 낙찰 / 착공 / 준공 / 보증서 / 회계·청구 / 증명서 / 문서정리 / 연락·확인) — 업무 등록 시 한 번에 불러오기, 항목 복사. 웹에서 직접 템플릿 추가·삭제, 이름·설명·항목 수정, 기본값 복원 가능
- **설정**: JSON 내보내기/가져오기(형식 검증 포함), 데이터 초기화, 샘플 데이터 재생성

## 데이터 저장

- **업무 데이터**: Supabase `tasks` 테이블에 저장됩니다. 어느 기기에서나 같은 계정으로 로그인하면 동일한 데이터를 볼 수 있습니다.
- **업무 템플릿**: 브라우저 localStorage에 저장됩니다 (키: `work-management-templates`).
- **백업 미러**: 마지막으로 불러온 업무 데이터가 localStorage(키: `work-management-tasks`)에도 참고용으로 보관됩니다.
- 댓글형 메모(comments)는 DB의 `memo`(text) 컬럼에 JSON 문자열로 저장됩니다. 구버전의 일반 텍스트 메모는 읽을 때 자동으로 댓글 1건으로 변환됩니다.

## Supabase 설정 방법

### 1. URL과 Key 넣는 위치

`js/supabaseClient.js` 상단의 두 상수만 수정하면 됩니다.

```js
var SUPABASE_URL = "https://<프로젝트>.supabase.co";       // Project URL
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";        // Publishable Key
```

> **경고: 프론트엔드에는 publishable key만 사용하세요.**
> `service_role` key, secret key는 모든 데이터를 우회 접근할 수 있으므로 **절대** 프론트엔드 코드에 넣으면 안 됩니다.

### 2. 필요한 테이블 / 정책

- `public.tasks` 테이블이 필요합니다 (컬럼: id, user_id, title, category, status, priority, requester, site_name, client_name, amount, task_date, due_date, completed_at, confirmation_note, memo, checklist, attachments, created_at, updated_at).
- **RLS(Row Level Security)가 활성화**되어 있어야 하고, `user_id = auth.uid()` 기준으로 자기 데이터만 select/insert/update/delete 할 수 있는 정책이 있어야 합니다.
- 이 정책 덕분에 클라이언트에서 `select("*")`를 호출해도 본인 데이터만 조회됩니다.

### 3. 인증 테스트

1. `login.html` 접속 → 이메일/비밀번호 입력 후 **회원가입**
2. (Supabase 이메일 인증이 켜져 있으면 메일함에서 인증 후) **로그인**
3. 로그인 성공 시 `index.html`로 자동 이동
4. 사이드바 하단 로그아웃 버튼 → `login.html`로 이동
5. 로그아웃 상태에서 `index.html` 직접 접근 → `login.html`로 리다이렉트
6. 로그인된 상태에서 `login.html` 접근 → `index.html`로 자동 이동

### 4. 데이터 저장 테스트

1. 로그인 후 새 업무 추가 → Supabase **Table Editor → tasks**에서 행 생성 확인 (`user_id`가 현재 사용자 id인지 확인)
2. 업무 수정/삭제 → 테이블에 반영되는지 확인
3. 체크리스트 체크/해제 → `checklist`(jsonb) 변경 확인
4. 새로고침 → 데이터가 다시 로드되는지 확인
5. 다른 계정으로 로그인 → 기존 계정의 업무가 보이지 않는지 확인

### 5. 배포 시 주의사항

- GitHub Pages 등 정적 호스팅에 그대로 배포 가능합니다 (빌드 불필요).
- publishable key는 공개되어도 RLS가 데이터를 보호하지만, **RLS 정책이 꺼져 있으면 누구나 데이터에 접근할 수 있으므로 배포 전 반드시 RLS 활성 상태를 확인**하세요.
- Supabase 대시보드의 **Authentication → URL Configuration**에서 배포 주소를 Site URL로 등록하면 인증 메일 링크가 올바르게 동작합니다.
- `file://`로 직접 열면 일부 브라우저에서 인증 세션이 동작하지 않을 수 있습니다. 로컬 서버(`python -m http.server`) 사용을 권장합니다.

## 로컬에서 실행

```bash
# 이 폴더에서
python -m http.server 8000
# 브라우저에서 http://localhost:8000/login.html 접속
```

## GitHub Pages에 배포하기

1. GitHub에서 새 저장소를 만들고 이 폴더의 파일을 모두 올립니다.
2. 저장소의 **Settings → Pages**로 이동합니다.
3. **Source**를 `Deploy from a branch`, **Branch**를 `main` / `/ (root)`로 선택하고 Save.
4. 1~2분 뒤 `https://<내아이디>.github.io/<저장소>/` 주소로 접속하면 바로 작동합니다.

## 파일 구조

```
work-management-web/
├── index.html            # 앱 셸 (사이드바/헤더/뷰 컨테이너) — 로그인 필요
├── login.html            # 로그인/회원가입 페이지
├── css/
│   └── style.css         # 전체 스타일 (디자인 토큰 + 반응형 + 인터랙션)
└── js/
    ├── supabaseClient.js # Supabase 연결 (URL/publishable key는 여기서 수정)
    ├── authGuard.js      # 로그인 보호 — 세션 없으면 login.html로 이동
    ├── auth.js           # 회원가입/로그인 (login.html 전용)
    ├── logout.js         # 로그아웃 버튼 처리
    ├── taskApi.js        # tasks 테이블 CRUD + snake_case↔camelCase 변환
    ├── utils.js          # 날짜/포맷 유틸 + 라벨 상수
    ├── templates.js      # 체크리스트 템플릿 (localStorage, 웹에서 수정 가능)
    ├── store.js          # 필터/정렬/통계/검증/샘플 데이터
    ├── ui.js             # 아이콘/뱃지/토스트/확인 모달/로딩
    ├── views.js          # 페이지별 화면 렌더링
    └── app.js            # 해시 라우터 + 이벤트 처리 + Supabase 연동
```

## 커스터마이징

- **템플릿**: Templates 페이지에서 직접 추가/수정/삭제할 수 있습니다. 기본 템플릿 목록 자체를 바꾸려면 `js/templates.js`의 `WM.DEFAULT_TEMPLATES`를 수정합니다.
- **색상 변경**: `css/style.css` 상단 `:root`의 CSS 변수(`--brand-700` 등)를 수정합니다.
- **카테고리/상태/우선순위 라벨**: `js/utils.js`의 `*_LABELS` 상수를 수정합니다.
