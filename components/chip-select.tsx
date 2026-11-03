"use client";

import { cn } from "@/lib/utils";

export function ChipSelect({
  options,
  value,
  onChange,
  multiple = true,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => {
              if (!multiple) {
                onChange(selected ? [] : [option]);
                return;
              }
              onChange(selected ? value.filter((item) => item !== option) : [...value, option]);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              selected
                ? "border-transparent bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
