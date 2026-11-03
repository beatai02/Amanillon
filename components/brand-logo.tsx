import { LineChart } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-slate-900", className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
        <LineChart className="size-4" aria-hidden />
      </span>
      {compact ? null : (
        <span className="font-[family-name:var(--font-geist-sans)] text-lg font-semibold tracking-tight">
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
