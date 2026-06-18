"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  FileStack,
  Settings,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/tasks", label: "Tasks", icon: ListTodo, ready: true },
  { href: "/templates", label: "Templates", icon: FileStack, ready: false },
  { href: "/settings", label: "Settings", icon: Settings, ready: false },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex">
      {/* 로고 영역 */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
          <Building2 size={18} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-gray-900">업무 매니지먼트</p>
          <p className="text-[11px] text-gray-400">건설/공사 행정</p>
        </div>
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, ready }) => {
          const active = pathname.startsWith(href);
          if (!ready) {
            return (
              <div
                key={href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300"
                title="다음 단계에서 구현 예정"
              >
                <Icon size={18} />
                <span>{label}</span>
                <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                  2단계
                </span>
              </div>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-gray-400">
          1차 MVP · localStorage 기반
          <br />
          데이터는 이 브라우저에만 저장됩니다.
        </p>
      </div>
    </aside>
  );
}
