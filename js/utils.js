/* ===== 공통 유틸 + 상수 (전역 네임스페이스 WM) ===== */
window.WM = window.WM || {};

WM.uid = function () {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

/** HTML 이스케이프 (XSS 방지) */
WM.esc = function (s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
};

/* ---- 날짜 ---- */
WM.todayStr = function () {
  var d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
};

WM.addDays = function (n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
};

/** YYYY-MM-DD까지 남은 일수 (없으면 null, 지났으면 음수) */
WM.daysUntil = function (dateStr) {
  if (!dateStr) return null;
  var today = new Date(WM.todayStr() + "T00:00:00");
  var target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  return Math.round((target - today) / 86400000);
};

WM.isToday = function (dateStr) {
  return !!dateStr && dateStr === WM.todayStr();
};

var DOW = ["일", "월", "화", "수", "목", "금", "토"];

/** "6월 12일 (금)" 형식 */
WM.formatKorean = function (dateStr) {
  if (!dateStr) return "-";
  var d = new Date(dateStr.slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return "-";
  return (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[d.getDay()] + ")";
};

/** 헤더용 "2026년 6월 12일 금요일" */
WM.formatFullToday = function () {
  var d = new Date();
  return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + DOW[d.getDay()] + "요일";
};

/** 메모용 "6월 12일 (금) 14:32" — 올해가 아니면 연도 포함 */
WM.formatDateTime = function (iso) {
  if (!iso) return "-";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  var prefix = d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + "년 " : "";
  return prefix + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[d.getDay()] + ") " +
    String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

/* ---- 표시 ---- */
WM.formatAmount = function (n) {
  if (n == null || isNaN(n)) return "-";
  return Number(n).toLocaleString("ko-KR") + "원";
};

WM.checklistProgress = function (list) {
  if (!list || !list.length) return 0;
  var done = list.filter(function (c) { return c.checked; }).length;
  return Math.round((done / list.length) * 100);
};

/* ---- 라벨/순서 상수 ---- */
WM.STORAGE_KEY = "work-management-tasks";

WM.CATEGORY_LABELS = {
  bid: "입찰", contract: "계약", accounting: "회계/청구", guarantee: "보증서",
  certificate: "증명서", document: "문서정리", communication: "연락/확인", etc: "기타"
};
WM.CATEGORY_ORDER = ["bid", "contract", "accounting", "guarantee", "certificate", "document", "communication", "etc"];
WM.STATUS_LABELS = { todo: "할 일", inProgress: "진행 중", hold: "확인 대기", done: "완료", cancelled: "취소" };
WM.STATUS_ORDER = ["todo", "inProgress", "hold", "done", "cancelled"];
WM.STATUS_COLORS = { todo: "#9ca3af", inProgress: "#3b82f6", hold: "#f59e0b", done: "#1a5343", cancelled: "#d1d5db" };
WM.PRIORITY_LABELS = { urgent: "긴급", high: "높음", normal: "보통", low: "낮음" };
WM.PRIORITY_ORDER = ["urgent", "high", "normal", "low"];
WM.PRIORITY_WEIGHT = { urgent: 0, high: 1, normal: 2, low: 3 };
