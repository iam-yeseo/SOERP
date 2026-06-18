"use client";

import { Search, Plus, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { formatFullToday } from "@/lib/date";

export default function Header() {
  // 날짜는 클라이언트에서만 렌더 (SSR 불일치 방지)
  const [today, setToday] = useState("");
  useEffect(() => setToday(formatFullToday()), []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      {/* 검색 */}
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="업무 검색 (2단계에서 연결 예정)"
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
          disabled
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* 오늘 날짜 */}
        <div className="hidden items-center gap-1.5 text-sm text-gray-500 md:flex">
          <CalendarDays size={15} className="text-brand-600" />
          <span suppressHydrationWarning>{today}</span>
        </div>

        {/* 새 업무 추가 (폼은 2단계) */}
        <button
          type="button"
          disabled
          title="업무 등록 폼은 다음 단계에서 구현됩니다"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">새 업무 추가</span>
        </button>
      </div>
    </header>
  );
}
