import type { Task } from "./types";
import { STORAGE_KEY } from "./constants";
import { createSampleTasks } from "./sample-data";

// localStorage 기반 저장소.
// 추후 Supabase 전환 시 이 파일의 load/save 만 교체하면 되도록
// 나머지 코드는 이 모듈을 통해서만 데이터에 접근한다.

export function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // 첫 실행: 샘플 데이터 시드
      const sample = createSampleTasks();
      saveTasks(sample);
      return sample;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch (e) {
    console.error("업무 데이터를 불러오지 못했습니다.", e);
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("업무 데이터를 저장하지 못했습니다.", e);
  }
}
