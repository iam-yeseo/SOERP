import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatAmount(n?: number): string {
  if (n === undefined || n === null) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

/** 체크리스트 완료율 (0~100) */
export function checklistProgress(checklist: { checked: boolean }[]): number {
  if (!checklist.length) return 0;
  return Math.round(
    (checklist.filter((c) => c.checked).length / checklist.length) * 100
  );
}
