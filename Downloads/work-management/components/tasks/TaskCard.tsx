"use client";

import type { Task } from "@/lib/types";
import {
  CATEGORY_LABELS,
  CATEGORY_BADGE_CLASS,
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
  PRIORITY_LABELS,
  PRIORITY_BADGE_CLASS,
} from "@/lib/constants";
import { formatKorean, isDueSoon, isOverdue, isToday } from "@/lib/date";
import { checklistProgress, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { CalendarClock, MapPin, User2, ListChecks } from "lucide-react";

/**
 * 업무 카드 (목록용)
 * 상세 페이지(/tasks/[id])는 2단계에서 연결 — 현재는 카드만 표시.
 */
export default function TaskCard({ task }: { task: Task }) {
  const progress = checklistProgress(task.checklist);
  const overdue = isOverdue(task.dueDate) && task.status !== "done";
  const dueSoon = isDueSoon(task.dueDate) && task.status !== "done";

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-shadow hover:shadow-cardHover">
      {/* 상단: 뱃지 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={CATEGORY_BADGE_CLASS[task.category]}>
          {CATEGORY_LABELS[task.category]}
        </Badge>
        <Badge className={STATUS_BADGE_CLASS[task.status]}>
          {STATUS_LABELS[task.status]}
        </Badge>
        <Badge className={PRIORITY_BADGE_CLASS[task.priority]}>
          {PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>

      {/* 제목 */}
      <h3 className="mt-2.5 text-[15px] font-semibold leading-snug text-gray-900">
        {task.title}
      </h3>

      {/* 메타 정보 */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
        {task.siteName && (
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-gray-400" />
            {task.siteName}
          </span>
        )}
        {task.requester && (
          <span className="flex items-center gap-1">
            <User2 size={13} className="text-gray-400" />
            {task.requester}
          </span>
        )}
        {task.dueDate && (
          <span
            className={cn(
              "flex items-center gap-1",
              overdue && "font-semibold text-red-600",
              dueSoon && !overdue && "font-semibold text-amber-600"
            )}
          >
            <CalendarClock size={13} />
            {isToday(task.dueDate) ? "오늘 마감" : formatKorean(task.dueDate)}
            {overdue && " · 지남"}
          </span>
        )}
      </div>

      {/* 체크리스트 진행률 */}
      {task.checklist.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <ListChecks size={12} />
              체크리스트 {task.checklist.filter((c) => c.checked).length}/
              {task.checklist.length}
            </span>
            <span className="font-semibold text-gray-600">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
