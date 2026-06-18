// =========================================
// 업무 관리 핵심 데이터 타입
// 추후 Supabase / Notion 연동을 고려해
// 직렬화 가능한 plain object 구조로 유지한다.
// =========================================

export type TaskCategory =
  | "accounting"
  | "bid"
  | "contract"
  | "guarantee"
  | "certificate"
  | "document"
  | "communication"
  | "etc";

export type TaskStatus =
  | "todo"
  | "inProgress"
  | "hold"
  | "done"
  | "cancelled";

export type TaskPriority = "urgent" | "high" | "normal" | "low";

export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  requester?: string;
  siteName?: string;
  clientName?: string;
  amount?: number;
  /** 업무 기준 날짜 (YYYY-MM-DD) */
  date?: string;
  /** 마감일 (YYYY-MM-DD) */
  dueDate?: string;
  /** 완료 처리 시각 (ISO) */
  completedAt?: string;
  confirmationNote?: string;
  memo?: string;
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
};
