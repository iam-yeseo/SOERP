/* ===== B2G (나라장터) 입찰 현황 =====
   업무 스케줄(tasks)과 분리된 별도 데이터입니다.
   Supabase b2g_bids 테이블에 사용자별로 저장됩니다. (WM.b2gApi 사용) */
window.WM = window.WM || {};

/** 빈 폼 기본값 */
WM.emptyBid = function () {
  return {
    title: "", bidDate: "", agency: "",
    baseAmount: undefined, bidAmount: undefined,
    result: "", awardAmount: undefined, followup: "", note: ""
  };
};

WM.B2G_RESULTS = ["", "낙찰", "패찰", "유찰", "취소"];
WM.B2G_RESULT_LABELS = { "": "진행중", "낙찰": "낙찰", "패찰": "패찰", "유찰": "유찰", "취소": "취소" };

/** 진행일 표시: YYYY-MM-DD → "2026년 6월 4일", 그 외 입력은 원본 그대로 */
WM.formatBidDate = function (s) {
  if (!s) return "-";
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return Number(m[1]) + "년 " + Number(m[2]) + "월 " + Number(m[3]) + "일";
  return s;
};

/** 결과 배지 */
function b2gResultBadge(result) {
  if (result === "낙찰") return '<span class="badge b-plain-green">낙찰</span>';
  if (result === "패찰" || result === "유찰" || result === "취소") return '<span class="badge b-plain-red">' + WM.esc(result) + "</span>";
  if (result) return '<span class="badge b-plain-amber">' + WM.esc(result) + "</span>";
  return '<span class="badge b-plain-gray">진행중</span>';
}

/** B2G 페이지 (테이블만) */
WM.renderB2G = function (bids) {
  bids = bids || [];

  var rows = bids.map(function (b) {
    return '<tr data-action="b2g-open" data-id="' + b.id + '">' +
      '<td class="small">' + WM.esc(WM.formatBidDate(b.bidDate)) + "</td>" +
      '<td><p class="t-title">' + WM.esc(b.title) + "</p>" +
        (b.note ? '<p class="t-sub">' + WM.esc(b.note) + "</p>" : "") + "</td>" +
      '<td class="small">' + (b.agency ? WM.esc(b.agency) : "-") + "</td>" +
      '<td class="right small">' + (b.baseAmount != null ? WM.formatAmount(b.baseAmount) : "-") + "</td>" +
      '<td class="right small">' + (b.bidAmount != null ? WM.formatAmount(b.bidAmount) : "-") + "</td>" +
      "<td>" + b2gResultBadge(b.result) + "</td>" +
      '<td class="right small">' + (b.awardAmount != null ? WM.formatAmount(b.awardAmount) : "-") + "</td>" +
      '<td class="small">' + (b.followup ? WM.esc(b.followup) : "-") + "</td>" +
      '<td data-stop="1"><button type="button" class="row-del" data-action="b2g-delete" data-id="' + b.id + '" aria-label="공고 삭제">' + WM.icon("trash", 15) + "</button></td>" +
    "</tr>";
  }).join("");

  var table = '<div class="card table-wrap"><table class="task-table nara-table"><thead><tr>' +
    "<th>진행일</th><th>공고명</th><th>발주처</th>" +
    '<th class="right">기초금액</th><th class="right">투찰금액</th><th>결과</th>' +
    '<th class="right">낙찰금액</th><th>후속업무</th><th></th></tr></thead><tbody>' +
    rows + "</tbody></table></div>";

  var body = bids.length
    ? table
    : WM.emptyState("등록된 공고가 없습니다.", "‘새 공고 추가’ 버튼으로 입찰 공고를 등록해보세요.");

  return '<div class="page-head page-head-row"><div><h1>B2G</h1>' +
      "<p>나라장터 입찰 공고 진행 현황입니다. (업무 스케줄과 별도로 관리됩니다)</p></div>" +
      '<button type="button" class="btn btn-primary" data-action="b2g-open-new">' +
        '<span>' + WM.icon("plus", 16) + "</span><span>새 공고 추가</span></button>" +
    "</div>" + body;
};

/** B2G 추가/수정 폼 모달 */
WM.renderB2GForm = function (v, isEdit) {
  function opt(val, label, cur) {
    return '<option value="' + WM.esc(val) + '"' + (val === cur ? " selected" : "") + ">" + WM.esc(label) + "</option>";
  }
  var resultOpts = WM.B2G_RESULTS.map(function (r) { return opt(r, WM.B2G_RESULT_LABELS[r], v.result || ""); }).join("");

  return '<div class="modal-dim" data-b2g-form-dim>' +
    '<div class="modal">' +
      '<div class="modal-head"><h2>' + (isEdit ? "공고 수정" : "새 공고 추가") + "</h2>" +
        '<button type="button" class="icon-btn" data-action="b2g-form-close" aria-label="닫기">' + WM.icon("x", 18) + "</button></div>" +
      '<div class="modal-body">' +
        '<div><label class="field-label">공고명 <span style="color:var(--red-500)">*</span></label>' +
          '<input class="input" id="b-title" value="' + WM.esc(v.title || "") + '" placeholder="예: ○○초등학교 옥상방수공사" />' +
          '<p class="field-error" id="b-title-error" style="display:none">공고명을 입력해주세요.</p></div>' +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">진행일</label><input class="input" type="date" id="b-bidDate" value="' + WM.esc(v.bidDate || "") + '" /></div>' +
          '<div><label class="field-label">결과</label><select class="select" id="b-result">' + resultOpts + "</select></div>" +
          '<div><label class="field-label">발주처</label><input class="input" id="b-agency" value="' + WM.esc(v.agency || "") + '" placeholder="예: ○○교육지원청" /></div>' +
        "</div>" +
        '<div class="form-grid-3">' +
          '<div><label class="field-label">기초금액 (원)</label><input class="input b-amt" id="b-baseAmount" inputmode="numeric" value="' + (v.baseAmount != null ? Number(v.baseAmount).toLocaleString("ko-KR") : "") + '" placeholder="숫자만 입력" /></div>' +
          '<div><label class="field-label">투찰금액 (원)</label><input class="input b-amt" id="b-bidAmount" inputmode="numeric" value="' + (v.bidAmount != null ? Number(v.bidAmount).toLocaleString("ko-KR") : "") + '" placeholder="숫자만 입력" /></div>' +
          '<div><label class="field-label">낙찰금액 (원)</label><input class="input b-amt" id="b-awardAmount" inputmode="numeric" value="' + (v.awardAmount != null ? Number(v.awardAmount).toLocaleString("ko-KR") : "") + '" placeholder="숫자만 입력" /></div>' +
        "</div>" +
        '<div><label class="field-label">후속업무</label><input class="input" id="b-followup" value="' + WM.esc(v.followup || "") + '" placeholder="예: 결격심사 서류 제출" /></div>' +
        '<div><label class="field-label">비고</label><input class="input" id="b-note" value="' + WM.esc(v.note || "") + '" placeholder="메모" /></div>' +
      "</div>" +
      '<div class="modal-foot">' +
        '<button type="button" class="btn btn-outline" data-action="b2g-form-close">취소</button>' +
        '<button type="button" class="btn btn-primary" data-action="b2g-form-submit">' + (isEdit ? "수정 저장" : "공고 등록") + "</button>" +
      "</div>" +
    "</div>" +
  "</div>";
};
