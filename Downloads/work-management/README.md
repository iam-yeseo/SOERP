# 업무 매니지먼트 웹앱 — 1단계 (프로젝트 구조 + 기본 레이아웃)

건설/공사 행정 업무 관리 대시보드의 1차 MVP 중 **1단계** 구현본입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속 → 자동으로 /dashboard 로 이동합니다.
첫 실행 시 샘플 업무 5건이 localStorage("work-management-tasks")에 자동 생성됩니다.

## 1단계에 포함된 것

- Next.js 14 (App Router) + TypeScript + Tailwind CSS 프로젝트 구조
- 좌측 Sidebar (Dashboard / Tasks 활성, Templates / Settings는 2단계 표시)
- 상단 Header (검색창 자리, 오늘 날짜, 새 업무 추가 버튼 자리)
- /dashboard: 요약 카드 4개, 오늘의 업무, 마감 임박, 상태별 진행 현황,
  카테고리별 현황, 최근 완료 업무
- /tasks: 전체 업무 목록 (마감일 순), 필터 영역 자리만 확보
- lib/types.ts: Task / ChecklistItem / 카테고리·상태·우선순위 타입
- lib/storage.ts: localStorage 로드/저장 + 첫 실행 시 샘플 데이터 시드
- hooks/useTasks.ts: add / update / remove / complete 포함 (UI 연결은 2단계)
- lib/date.ts: 오늘 업무 / 이번 주 마감 / 마감 임박(3일) 계산 유틸

## 파일 구조

```
work-management/
├── app/
│   ├── layout.tsx          # Sidebar + Header 포함 전역 레이아웃
│   ├── globals.css
│   ├── page.tsx            # / → /dashboard 리다이렉트
│   ├── dashboard/page.tsx
│   └── tasks/page.tsx
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/Header.tsx
│   ├── dashboard/SummaryCard.tsx
│   ├── dashboard/StatusOverview.tsx
│   ├── tasks/TaskCard.tsx
│   └── ui/Badge.tsx
├── hooks/useTasks.ts
└── lib/
    ├── types.ts            # 데이터 타입 (Supabase 전환 대비 직렬화 구조)
    ├── constants.ts        # 라벨 / 뱃지 색상 / STORAGE_KEY
    ├── date.ts             # 날짜 계산 유틸
    ├── sample-data.ts      # 샘플 5건 생성
    ├── storage.ts          # localStorage 접근 단일 창구
    └── utils.ts            # cn, uid, 금액 포맷, 체크리스트 진행률
```

## 데이터 저장 방식

- 모든 데이터는 `lib/storage.ts` 를 통해서만 읽고 씁니다.
- key: `work-management-tasks`, 값: Task[] JSON
- Supabase 전환 시 storage.ts의 load/save만 비동기 API 호출로 교체하면
  나머지 코드는 그대로 사용할 수 있는 구조입니다.

## 남은 작업 (다음 단계)

### 2단계 — 업무 CRUD
- [ ] 업무 등록/수정 폼 (TaskForm.tsx) + 헤더 '새 업무 추가' 버튼 연결
- [ ] /tasks 검색 / 상태 / 카테고리 / 우선순위 필터 (TaskFilters.tsx)
- [ ] /tasks/[id] 상세 페이지 (상태 변경, 체크리스트 체크, 완료 처리, 삭제)
- [ ] 카테고리 선택 시 템플릿 체크리스트 자동 불러오기

### 3단계 — 템플릿 / 설정
- [ ] /templates 페이지 + lib/templates.ts (입찰·계약·보증서 등 6종 기본 템플릿)
- [ ] /settings: 데이터 초기화, JSON 내보내기/가져오기, 샘플 재생성
- [ ] 모바일 사이드바 (햄버거 메뉴)

### 이후
- [ ] Supabase 연동 (storage.ts 교체)
- [ ] 파일 첨부 필드 구조
