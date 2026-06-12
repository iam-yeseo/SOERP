# 업무 매니지먼트 (정적 웹 버전)

건설/공사 행정 업무를 카테고리별 체크리스트와 함께 관리하는 대시보드입니다.
**순수 HTML/CSS/JS로만 만들어져 빌드 과정 없이 GitHub Pages에서 바로 작동합니다.**

> 샘플 데이터는 모두 가상의 데이터입니다.

## 주요 기능

- **대시보드**: 오늘의 업무 / 마감 지난 업무 / 마감 임박(3일) / 확인 대기, 완료율·상태/카테고리/우선순위 현황, 최근 완료 업무
- **업무 현황**: 검색(제목·요청자·현장·거래처·메모), 상태/카테고리/우선순위/완료여부 필터, 마감일·생성일·우선순위 정렬, 카드형/테이블형 전환, 상태 빠른 변경, 등록/삭제
- **업무 상세**: 체크리스트 추가·수정·삭제·체크(진행률 자동 계산), 상태 변경, 완료 처리, 수정, 삭제
- **업무 템플릿**: 입찰/계약/보증서/회계·청구/증명서/문서정리/연락·확인 7종 — 업무 등록 시 한 번에 불러오기, 항목 복사
- **설정**: JSON 내보내기/가져오기(형식 검증 포함), 데이터 초기화, 샘플 데이터 재생성

## 데이터 저장

- 브라우저 **localStorage**에 저장됩니다 (키: `work-management-tasks`).
- 서버가 없으므로 기기·브라우저별로 데이터가 분리됩니다. 다른 기기와 공유하려면 설정 페이지의 **JSON 내보내기/가져오기**를 이용하세요.
- Next.js + Supabase 버전과 동일한 저장 키·데이터 형식을 사용하므로, 내보낸 JSON을 서로 가져오기 할 수 있습니다.

## 로컬에서 실행

방법 1 — 그냥 열기:

```
index.html 파일을 더블클릭 (브라우저에서 바로 열림)
```

방법 2 — 간단한 로컬 서버 (권장):

```bash
# 이 폴더에서
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## GitHub Pages에 배포하기

1. GitHub에서 새 저장소(Repository)를 만듭니다. 예: `work-management`
2. 이 폴더의 파일을 모두 올립니다.

   ```bash
   cd work-management-web
   git init
   git add .
   git commit -m "업무 매니지먼트 정적 버전"
   git branch -M main
   git remote add origin https://github.com/<내아이디>/work-management.git
   git push -u origin main
   ```

   (또는 GitHub 웹에서 "Add file → Upload files"로 드래그해서 올려도 됩니다.)

3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Source**를 `Deploy from a branch`, **Branch**를 `main` / `/ (root)`로 선택하고 Save.
5. 1~2분 뒤 `https://<내아이디>.github.io/work-management/` 주소로 접속하면 바로 작동합니다.

## 파일 구조

```
work-management-web/
├── index.html        # 앱 셸 (사이드바/헤더/뷰 컨테이너)
├── css/
│   └── style.css     # 전체 스타일 (디자인 토큰 + 반응형)
└── js/
    ├── utils.js      # 날짜/포맷 유틸 + 라벨 상수
    ├── templates.js  # 업무 유형별 체크리스트 템플릿 7종 ← 항목 수정은 여기
    ├── store.js      # localStorage 저장/필터/정렬/통계/검증/샘플 데이터
    ├── ui.js         # 아이콘/뱃지/토스트/확인 모달
    ├── views.js      # 페이지별 화면 렌더링
    └── app.js        # 해시 라우터 + 이벤트 처리
```

## 커스터마이징

- **템플릿 항목 수정**: `js/templates.js`의 `items` 배열만 고치면 됩니다.
- **색상 변경**: `css/style.css` 상단 `:root`의 CSS 변수(`--brand-700` 등)를 수정합니다.
- **카테고리/상태/우선순위 라벨**: `js/utils.js`의 `*_LABELS` 상수를 수정합니다.

## Next.js 버전과의 관계

이 저장소는 같은 앱의 **정적(서버리스) 버전**입니다. 별도로 제작된 Next.js 14 + Supabase 버전은 서버 저장/배포(Vercel 등)가 필요할 때 사용하고, 두 버전은 JSON 백업 파일이 서로 호환됩니다.
