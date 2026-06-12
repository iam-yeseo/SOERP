/* ===== 업무 유형별 체크리스트 템플릿 =====
   템플릿은 localStorage에 저장되며, Templates 페이지에서 직접 수정할 수 있습니다. */
window.WM = window.WM || {};

WM.TEMPLATE_STORAGE_KEY = "work-management-templates";

WM.DEFAULT_TEMPLATES = [
  {
    id: "tpl-bid", category: "bid", name: "입찰 업무 템플릿",
    description: "K-APT / 나라장터 공고 확인부터 결과 확인까지",
    items: ["공고문 확인", "마감일 확인", "현장설명회 여부 확인", "입찰보증서 필요 여부 확인",
      "결격심사 서류 확인", "대리인 서류 확인", "입찰 금액 확인", "제출 완료", "결과 확인"]
  },
  {
    id: "tpl-award", category: "contract", name: "낙찰 업무 템플릿",
    description: "낙찰 확인부터 계약서 초안 작성까지",
    items: ["낙찰 확인", "관리사무소 전화 및 계산서 수령 (1억 이상 공사시 회장님 성함 및 생년월일 체크)",
      "계약서 초안 작성"]
  },
  {
    id: "tpl-start", category: "contract", name: "착공 업무 템플릿",
    description: "착공 시 일자·서류·담당자 확인",
    items: ["착공일자 체크", "계약서 원본 체크", "계산서 및 계약보증서 발행일 확인",
      "현장대리인 체크", "원본 전달 / 메일 송부 체크"]
  },
  {
    id: "tpl-completion", category: "contract", name: "준공 업무 템플릿",
    description: "준공 시 일자·기성금·서류 확인",
    items: ["준공일자 체크", "잔여 기성금 체크", "계산서 및 하자보증서 발행일 확인",
      "원본 전달 / 메일 송부 체크"]
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

function deepCopyDefaults() {
  return JSON.parse(JSON.stringify(WM.DEFAULT_TEMPLATES));
}

/* ---- 저장/로드 (손상 데이터 방어) ---- */
WM.loadTemplates = function () {
  try {
    var raw = localStorage.getItem(WM.TEMPLATE_STORAGE_KEY);
    if (raw === null) return deepCopyDefaults();
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return deepCopyDefaults();
    var valid = parsed.filter(function (t) {
      return t && typeof t.id === "string" && typeof t.category === "string" &&
        typeof t.name === "string" && Array.isArray(t.items);
    }).map(function (t) {
      t.description = typeof t.description === "string" ? t.description : "";
      t.items = t.items.filter(function (i) { return typeof i === "string"; });
      return t;
    });
    if (!valid.length) return deepCopyDefaults();

    // 마이그레이션: 구버전 '계약 업무 템플릿'(tpl-contract)을 낙찰/착공/준공 3종으로 분리
    var oldIdx = valid.findIndex(function (t) { return t.id === "tpl-contract"; });
    if (oldIdx !== -1) {
      var three = WM.DEFAULT_TEMPLATES.filter(function (t) {
        return t.id === "tpl-award" || t.id === "tpl-start" || t.id === "tpl-completion";
      }).map(function (t) { return JSON.parse(JSON.stringify(t)); });
      valid.splice.apply(valid, [oldIdx, 1].concat(three));
      try { localStorage.setItem(WM.TEMPLATE_STORAGE_KEY, JSON.stringify(valid)); } catch (e2) { /* 무시 */ }
    }

    return valid;
  } catch (e) {
    console.error("템플릿 데이터를 읽지 못했습니다.", e);
    return deepCopyDefaults();
  }
};

WM.saveTemplates = function () {
  try {
    localStorage.setItem(WM.TEMPLATE_STORAGE_KEY, JSON.stringify(WM.CHECKLIST_TEMPLATES));
  } catch (e) {
    console.error("템플릿 저장에 실패했습니다.", e);
    if (WM.toast) WM.toast("템플릿 저장에 실패했습니다.", "error");
  }
};

WM.CHECKLIST_TEMPLATES = WM.loadTemplates();

WM.getTemplateByCategory = function (category) {
  return WM.CHECKLIST_TEMPLATES.find(function (t) { return t.category === category; });
};

/** 카테고리에 속한 템플릿 전체 (한 카테고리에 여러 템플릿 허용) */
WM.getTemplatesByCategory = function (category) {
  return WM.CHECKLIST_TEMPLATES.filter(function (t) { return t.category === category; });
};

WM.getTemplateById = function (id) {
  return WM.CHECKLIST_TEMPLATES.find(function (t) { return t.id === id; });
};

/** 사용자 정의 템플릿 추가 */
WM.addTemplate = function (category, name, description) {
  var tpl = {
    id: "tpl-" + WM.uid(),
    category: category,
    name: name,
    description: description || "",
    items: []
  };
  WM.CHECKLIST_TEMPLATES.push(tpl);
  WM.saveTemplates();
  return tpl;
};

/** 템플릿 삭제 */
WM.deleteTemplate = function (id) {
  WM.CHECKLIST_TEMPLATES = WM.CHECKLIST_TEMPLATES.filter(function (t) { return t.id !== id; });
  WM.saveTemplates();
};

/** 템플릿 → 체크리스트 항목 배열 */
WM.templateToChecklist = function (template) {
  return template.items.map(function (label) {
    return { id: WM.uid(), label: label, checked: false };
  });
};
