"use client";

import { useTasks } from "@/hooks/useTasks";
import TaskCard from "@/components/tasks/TaskCard";

/**
 * /tasks 기본 레이아웃 (1단계)
 * - 전체 업무 목록을 마감일 기준으로 정렬해 표시
 * - 검색 / 필터 / 새 업무 등록 폼은 2단계에서 이 자리에 연결
 */
export default function TasksPage() {
  const { tasks, loaded } = useTasks();

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        불러오는 중...
      </div>
    );
  }

  // 마감일 빠른 순 (마감일 없는 업무는 뒤로)
  const sorted = [...tasks].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">업무 현황</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            전체 {tasks.length}건 · 마감일 순 정렬
          </p>
        </div>
      </div>

      {/* 필터 바 자리 (2단계: 검색 / 상태 / 카테고리 / 우선순위 필터) */}
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-xs text-gray-400">
        검색·상태·카테고리·우선순위 필터는 2단계에서 이 영역에 추가됩니다.
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
          등록된 업무가 없습니다. 상단의 &lsquo;새 업무 추가&rsquo;로
          시작하세요.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
