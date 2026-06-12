/* ===== 업무 유형별 체크리스트 템플릿 =====
   항목을 수정하려면 이 파일의 items 배열만 고치면 됩니다. */
window.WM = window.WM || {};

WM.CHECKLIST_TEMPLATES = [
  {
    id: "tpl-bid", category: "bid", name: "입찰 업무 템플릿",
    description: "K-APT / 나라장터 공고 확인부터 결과 확인까지",
    items: ["공고문 확인", "마감일 확인", "현장설명회 여부 확인", "입찰보증서 필요 여부 확인",
      "결격심사 서류 확인", "대리인 서류 확인", "입찰 금액 확인", "제출 완료", "결과 확인"]
  },
  {
    id: "tpl-contract", category: "contract", name: "계약 업무 템플릿",
    description: "낙찰 후 계약 체결과 청구 일정 등록까지",
    items: ["낙찰/계약 대상 확인", "관리사무소 또는 담당자 연락", "계약 금액 확인", "부가세 포함 여부 확인",
      "지급조건 확인", "계약서 초안 작성", "계약보증서 발급", "하자보증서 필요 여부 확인",
      "계약서 송부", "중도금/잔금 청구 일정 등록"]
  },
  {
    id: "tpl-guarantee", category: "guarantee", name: "보증서 업무 템플릿",
    description: "전문건설공제조합 신청부터 보관까지",
    items: ["계약금액 확인", "보증기간 확인", "하자보수기간 확인", "전문건설공제조합 신청",
      "심사 확인", "결제", "출력", "스캔", "PDF 변환", "메일 송부", "보관 완료"]
  },
  {
    id: "tpl-accounting", category: "accounting", name: "회계/청구 업무 템플릿",
    description: "세금계산서 발행과 입금 확인까지",
    items: ["계약금/중도금/잔금 구분", "청구 금액 확인", "부가세 확인", "세금계산서 발행",
      "청구서류 정리", "거래처 제출", "입금 여부 확인", "완료 처리"]
  },
  {
    id: "tpl-certificate", category: "certificate", name: "증명서 업무 템플릿",
    description: "증명서 발급부터 제출·보관까지",
    items: ["필요한 증명서 종류 확인", "발급 기관 확인", "유효기간 확인", "발급",
      "PDF 저장", "제출처 확인", "제출 완료", "보관 완료"]
  },
  {
    id: "tpl-document", category: "document", name: "문서정리 업무 템플릿",
    description: "스캔·변환·파일 정리와 메일 송부까지",
    items: ["원본 파일 확인", "스캔", "PDF 변환", "파일명 정리", "라벨 출력",
      "제출용 문구 작성", "메일 첨부", "보관 완료"]
  },
  {
    id: "tpl-communication", category: "communication", name: "연락/확인 템플릿",
    description: "연락 → 회신 확인 → 후속 처리 흐름",
    items: ["연락 대상 확인", "연락처 확인", "문의 내용 정리", "전화 또는 메일 발송",
      "회신 여부 확인", "후속 처리 등록", "완료 처리"]
  }
];

WM.getTemplateByCategory = function (category) {
  return WM.CHECKLIST_TEMPLATES.find(function (t) { return t.category === category; });
};

/** 템플릿 → 체크리스트 항목 배열 */
WM.templateToChecklist = function (template) {
  return template.items.map(function (label) {
    return { id: WM.uid(), label: label, checked: false };
  });
};
