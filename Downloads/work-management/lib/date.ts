// 날짜 계산 유틸 (오늘 업무 / 이번 주 마감 / 마감 임박)

/** 오늘 날짜를 YYYY-MM-DD 로 반환 */
export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 오늘 기준 +n일의 YYYY-MM-DD */
export function addDays(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function isToday(dateStr?: string): boolean {
  return !!dateStr && dateStr === todayStr();
}

/** 이번 주(월~일) 내의 날짜인지 */
export function isThisWeek(dateStr?: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const day = now.getDay(); // 0(일)~6(토)
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return dateStr >= toDateStr(monday) && dateStr <= toDateStr(sunday);
}

/** 마감일까지 남은 일수. 음수면 지남 */
export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date(todayStr() + "T00:00:00");
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

/** 마감 임박: 오늘 포함 3일 이내 */
export function isDueSoon(dateStr?: string): boolean {
  const d = daysUntil(dateStr);
  return d !== null && d >= 0 && d <= 3;
}

export function isOverdue(dateStr?: string): boolean {
  const d = daysUntil(dateStr);
  return d !== null && d < 0;
}

/** 2026-06-11 -> "6월 11일 (목)" */
export function formatKorean(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  const week = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${week[d.getDay()]})`;
}

/** 헤더용: "2026년 6월 11일 목요일" */
export function formatFullToday(): string {
  const d = new Date();
  const week = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${week[d.getDay()]}요일`;
}
