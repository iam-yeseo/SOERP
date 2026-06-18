import type { Task, TaskStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const BAR_ORDER: TaskStatus[] = ["todo", "inProgress", "hold", "done", "cancelled"];

const BAR_CLASS: Record<TaskStatus, string> = {
  todo: "bg-gray-300",
  inProgress: "bg-brand-500",
  hold: "bg-amber-400",
  done: "bg-brand-700",
  cancelled: "bg-gray-200",
};

/** 상태별 진행률 막대 카드 */
export default function StatusOverview({ tasks }: { tasks: Task[] }) {
  const total = tasks.length || 1;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-gray-900">상태별 진행 현황</h2>

      {/* 누적 막대 */}
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        {BAR_ORDER.map((s) => {
          const count = tasks.filter((t) => t.status === s).length;
          if (!count) return null;
          return (
            <div
              key={s}
              className={cn("h-full", BAR_CLASS[s])}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${STATUS_LABELS[s]} ${count}건`}
            />
          );
        })}
      </div>

      {/* 범례 */}
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {BAR_ORDER.map((s) => {
          const count = tasks.filter((t) => t.status === s).length;
          return (
            <li key={s} className="flex items-center gap-2 text-xs text-gray-500">
              <span className={cn("h-2.5 w-2.5 rounded-sm", BAR_CLASS[s])} />
              <span>{STATUS_LABELS[s]}</span>
              <span className="ml-auto font-semibold text-gray-700">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
