import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  count: number;
  unit?: string;
  description: string;
  icon: LucideIcon;
  accent?: boolean;
};

export default function SummaryCard({
  label,
  count,
  unit = "건",
  description,
  icon: Icon,
  accent,
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-shadow hover:shadow-cardHover">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"
          )}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        {count}
        <span className="ml-0.5 text-base font-medium text-gray-400">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}
