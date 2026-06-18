"use client";

import { useTasks } from "@/hooks/useTasks";
import SummaryCard from "@/components/dashboard/SummaryCard";
import StatusOverview from "@/components/dashboard/StatusOverview";
import TaskCard from "@/components/tasks/TaskCard";
import Badge from "@/components/ui/Badge";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_BADGE_CLASS,
} from "@/lib/constants";
import { isToday, isThisWeek, isDueSoon, formatKorean } from "@/lib/date";
import {
  CalendarCheck,
  Loader2,
  PauseCircle,
  CalendarRange,
  AlarmClock,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const { tasks, loaded } = useTasks();

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        불러오는 중...
      </div>
    );
  }

  const active = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );
  const todayTasks = active.filter(
    (t) => isToday(t.dueDate) || isToday(t.date)
  );
  const inProgress = tasks.filter((t) => t.status === "inProgress");
  const hold = tasks.filter((t) => t.status === "hold");
  const weekDue = active.filter((t) => isThisWeek(t.dueDate));
  const dueSoon = active
    .filter((t) => isDueSoon(t.dueDate))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const recentDone = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          오늘 처리할 업무와 전체 진행 현황을 한눈에 확인하세요.
        </p>
      </div>

      {/* 상단 요약 카드 4개 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="오늘 업무"
          count={todayTasks.length}
          description="오늘 날짜 기준 처리 대상"
          icon={CalendarCheck}
          accent
        />
        <SummaryCard
          label="진행 중"
          count={inProgress.length}
          description="현재 진행하고 있는 업무"
          icon={Loader2}
        />
        <SummaryCard
          label="확인 대기"
          count={hold.length}
          description="회신·확인을 기다리는 업무"
          icon={PauseCircle}
        />
        <SummaryCard
          label="이번 주 마감"
          count={weekDue.length}
          description="이번 주 내 마감 예정"
          icon={CalendarRange}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* 좌측 2/3: 오늘의 업무 + 마감 임박 */}
        <div className="space-y-6 xl:col-span-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              오늘의 업무
            </h2>
            {todayTasks.length === 0 ? (
              <EmptyBox text="오늘 마감되거나 예정된 업무가 없습니다." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {todayTasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <AlarmClock size={15} className="text-amber-500" />
              마감 임박 업무
              <span className="text-xs font-normal text-gray-400">
                (3일 이내)
              </span>
            </h2>
            {dueSoon.length === 0 ? (
              <EmptyBox text="3일 이내 마감 예정 업무가 없습니다." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {dueSoon.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 우측 1/3: 상태/카테고리/최근 완료 */}
        <div className="space-y-6">
          <StatusOverview tasks={tasks} />

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900">
              카테고리별 업무 현황
            </h2>
            <ul className="mt-3 space-y-2">
              {CATEGORY_ORDER.map((c) => {
                const count = active.filter((t) => t.category === c).length;
                return (
                  <li
                    key={c}
                    className="flex items-center justify-between text-sm"
                  >
                    <Badge className={CATEGORY_BADGE_CLASS[c]}>
                      {CATEGORY_LABELS[c]}
                    </Badge>
                    <span className="text-xs font-semibold text-gray-600">
                      {count}건
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <CheckCircle2 size={15} className="text-brand-600" />
              최근 완료 업무
            </h2>
            {recentDone.length === 0 ? (
              <p className="mt-3 text-xs text-gray-400">
                아직 완료된 업무가 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {recentDone.map((t) => (
                  <li key={t.id} className="text-sm">
                    <p className="font-medium text-gray-700">{t.title}</p>
                    <p className="text-xs text-gray-400">
                      {t.completedAt
                        ? formatKorean(t.completedAt.slice(0, 10))
                        : "-"}{" "}
                      완료
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}
