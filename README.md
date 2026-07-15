# SOERP — 건설·공사 행정 업무 매니지먼트

건설/공사 행정 업무를 카테고리별 체크리스트와 함께 관리하는 웹 기반 업무 관리 도구입니다.
입찰부터 준공, 회계·청구까지 반복되는 행정 업무를 템플릿으로 등록하고, 대시보드에서 오늘 처리할 일과 마감 일정을 한눈에 확인할 수 있습니다.

**순수 HTML / CSS / Vanilla JS + Supabase**로 제작되어 별도의 빌드 과정 없이 GitHub Pages 같은 정적 호스팅에서 바로 동작합니다.

> 저장소에 포함된 샘플 데이터는 모두 가상의 데이터입니다.

## 이런 프로그램입니다

- 건설/공사 행정 담당자가 **여러 현장·거래처의 업무를 한 곳에서** 추적할 수 있습니다.
- 업무마다 요청자, 현장명, 거래처, 금액, 시작일, 마감일, 체크리스트를 기록합니다.
- 로그인 계정별로 데이터가 분리되어, 어느 기기에서든 같은 계정으로 접속하면 동일한 데이터를 볼 수 있습니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| **대시보드** | 오늘의 업무(시작일~마감일 기준), 마감 지남/임박(3일), 확인 대기, 완료율과 상태·카테고리·우선순위 현황 |
| **업무 현황** | 제목·요청자·현장·거래처·메모 검색, 상태/카테고리/우선순위 필터, 정렬, 카드형·테이블형 전환, 상태 빠른 변경 |
| **업무 상세** | 체크리스트(진행률 자동 계산), 상태 변경, 완료 처리, 댓글형 메모 |
| **달력** | 마감일 기준 월별 일정 보기, 업무 클릭 시 상세로 이동 |
| **업무 템플릿** | 기본 9종(입찰/낙찰/착공/준공/보증서/회계·청구/증명서/문서정리/연락·확인) 제공, 웹에서 직접 추가·수정·삭제 |
| **인증** | 이메일/비밀번호 회원가입·로그인 (Supabase Auth), 계정별 데이터 분리 |
| **설정** | JSON 내보내기/가져오기, 데이터 초기화, 샘플 데이터 재생성 |

## 기술 스택

- **프론트엔드**: HTML, CSS, Vanilla JavaScript — 프레임워크·빌드 도구 없음
- **백엔드**: [Supabase](https://supabase.com) — 인증(Auth) + 데이터베이스(PostgreSQL, RLS)
- **배포**: GitHub Pages 등 정적 호스팅

### 데이터 저장 구조

- 업무 데이터: Supabase `tasks` 테이블 (RLS로 계정별 접근 제어)
- 업무 템플릿: 브라우저 localStorage (`work-management-templates`)
- 댓글형 메모: `memo`(text) 컬럼에 JSON 문자열로 저장, 구버전 텍스트 메모는 자동 변환

## 시작하기

### 1. Supabase 프로젝트 연결

`js/supabaseClient.js` 상단의 두 상수를 본인 프로젝트 값으로 수정합니다.

```js
var SUPABASE_URL = "https://<프로젝트>.supabase.co";       // Project URL
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";        // Publishable Key
```

> **경고**: 프론트엔드에는 반드시 publishable key만 사용하세요. `service_role` key와 secret key는 모든 데이터에 우회 접근할 수 있으므로 절대 클라이언트 코드에 넣으면 안 됩니다.

### 2. 테이블 및 RLS 정책

- `public.tasks` 테이블 필요 — 컬럼: `id, user_id, title, category, status, priority, requester, site_name, client_name, amount, task_date, due_date, completed_at, confirmation_note, memo, checklist, attachments, created_at, updated_at`
- **RLS(Row Level Security)를 활성화**하고, `user_id = auth.uid()` 기준으로 본인 데이터만 select/insert/update/delete 가능한 정책을 추가합니다.

### 3. 로컬 실행

```bash
# 이 폴더에서
python -m http.server 8000
# 브라우저에서 http://localhost:8000/login.html 접속
```

`file://`로 직접 열면 일부 브라우저에서 인증 세션이 동작하지 않을 수 있어 로컬 서버 사용을 권장합니다.

### 4. GitHub Pages 배포

1. 새 저장소를 만들고 이 폴더의 파일을 모두 올립니다.
2. **Settings → Pages**에서 Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 설정합니다.
3. 잠시 후 `https://<아이디>.github.io/<저장소>/` 주소로 접속하면 바로 동작합니다.

배포 시 주의사항:

- publishable key는 공개되어도 RLS가 데이터를 보호하지만, **RLS가 꺼져 있으면 누구나 데이터에 접근할 수 있으므로 배포 전 반드시 활성 상태를 확인**하세요.
- Supabase 대시보드의 **Authentication → URL Configuration**에 배포 주소를 Site URL로 등록해야 인증 메일 링크가 올바르게 동작합니다.

## 파일 구조

```
work-management-web/
├── index.html            # 앱 셸 (사이드바/헤더/뷰 컨테이너) — 로그인 필요
├── login.html            # 로그인/회원가입 페이지
├── assets/
│   ├── soerp-logo.svg    # 로고 (사이드바/로그인 페이지)
│   └── soerp-mark.svg    # 파비콘용 심볼 SVG
├── css/
│   └── style.css         # 전체 스타일 (디자인 토큰 + 반응형)
└── js/
    ├── supabaseClient.js # Supabase 연결 설정
    ├── authGuard.js      # 로그인 보호 — 세션 없으면 login.html로 이동
    ├── auth.js           # 회원가입/로그인
    ├── logout.js         # 로그아웃 처리
    ├── taskApi.js        # tasks 테이블 CRUD + snake_case↔camelCase 변환
    ├── utils.js          # 날짜/포맷 유틸 + 라벨 상수
    ├── templates.js      # 체크리스트 템플릿
    ├── store.js          # 필터/정렬/통계/검증/샘플 데이터
    ├── ui.js             # 아이콘/뱃지/토스트/모달/로딩
    ├── views.js          # 페이지별 화면 렌더링
    └── app.js            # 해시 라우터 + 이벤트 처리 + Supabase 연동
```

## 커스터마이징

- **템플릿**: Templates 페이지에서 직접 관리하거나, `js/templates.js`의 `WM.DEFAULT_TEMPLATES`로 기본 목록을 변경합니다.
- **색상**: `css/style.css` 상단 `:root`의 CSS 변수(`--brand-700` 등)를 수정합니다.
- **카테고리/상태/우선순위 라벨**: `js/utils.js`의 `*_LABELS` 상수를 수정합니다.
