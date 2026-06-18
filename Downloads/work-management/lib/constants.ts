import type { TaskCategory, TaskStatus, TaskPriority } from "./types";

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  accounting: "회계/청구",
  bid: "입찰",
  contract: "계약",
  guarantee: "보증서",
  certificate: "증명서",
  document: "문서정리",
  communication: "연락/확인",
  etc: "기타",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "시작 전",
  inProgress: "진행 중",
  hold: "확인 대기",
  done: "완료",
  cancelled: "취소",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "긴급",
  high: "높음",
  normal: "보통",
  low: "낮음",
};

/** 뱃지용 색상 클래스 (Tailwind) */
export const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  inProgress: "bg-brand-50 text-brand-700",
  hold: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-400 line-through",
};

export const PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  urgent: "bg-red-50 text-red-600",
  high: "bg-orange-50 text-orange-600",
  normal: "bg-gray-100 text-gray-600",
  low: "bg-gray-50 text-gray-400",
};

export const CATEGORY_BADGE_CLASS: Record<TaskCategory, string> = {
  accounting: "bg-sky-50 text-sky-700",
  bid: "bg-violet-50 text-violet-700",
  contract: "bg-indigo-50 text-indigo-700",
  guarantee: "bg-teal-50 text-teal-700",
  certificate: "bg-cyan-50 text-cyan-700",
  document: "bg-stone-100 text-stone-600",
  communication: "bg-pink-50 text-pink-600",
  etc: "bg-gray-100 text-gray-500",
};

export const CATEGORY_ORDER: TaskCategory[] = [
  "accounting",
  "bid",
  "contract",
  "guarantee",
  "certificate",
  "document",
  "communication",
  "etc",
];

export const STORAGE_KEY = "work-management-tasks";
