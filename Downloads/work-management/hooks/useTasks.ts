"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/lib/types";
import { loadTasks, saveTasks } from "@/lib/storage";
import { uid } from "@/lib/utils";

/**
 * 업무 데이터 훅.
 * - 마운트 시 localStorage에서 로드 (SSR 하이드레이션 충돌 방지)
 * - 모든 변경은 즉시 localStorage에 반영
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTasks(loadTasks());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Task[]) => {
    setTasks(next);
    saveTasks(next);
  }, []);

  const addTask = useCallback(
    (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const task: Task = { ...data, id: uid(), createdAt: now, updatedAt: now };
      persist([task, ...tasks]);
      return task;
    },
    [tasks, persist]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      persist(
        tasks.map((t) =>
          t.id === id
            ? { ...t, ...patch, updatedAt: new Date().toISOString() }
            : t
        )
      );
    },
    [tasks, persist]
  );

  const removeTask = useCallback(
    (id: string) => {
      persist(tasks.filter((t) => t.id !== id));
    },
    [tasks, persist]
  );

  const completeTask = useCallback(
    (id: string) => {
      const now = new Date();
      updateTask(id, {
        status: "done",
        completedAt: now.toISOString(),
      });
    },
    [updateTask]
  );

  return { tasks, loaded, addTask, updateTask, removeTask, completeTask };
}
