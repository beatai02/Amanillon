import Link from "next/link";
import { Card } from "@/components/ui";
import type { Trade } from "@/lib/types";
import { classifyOutcome } from "@/lib/insights";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TradeCalendar({ trades, month = "2026-10" }: { trades: Trade[]; month?: string }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const startWeekday = (first.getUTCDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const byDay = new Map<number, Trade[]>();
  trades.forEach((trade) => {
    const stamp = trade.closedAt ?? trade.openedAt;
    if (!stamp.startsWith(month)) return;
    const day = Number(stamp.slice(8, 10));
    byDay.set(day, [...(byDay.get(day) ?? []), trade]);
  });

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendar</h2>
        <p className="text-xs text-slate-500">UTC · closed-trade days</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;
          const dayTrades = byDay.get(day) ?? [];
          const wins = dayTrades.filter((trade) => classifyOutcome(trade.actualRr) === "win").length;
          const losses = dayTrades.filter((trade) => classifyOutcome(trade.actualRr) === "loss").length;
          return (
            <Link
              key={day}
              href={`/app/journal?from=${month}-${String(day).padStart(2, "0")}&to=${month}-${String(day).padStart(2, "0")}`}
              className="min-h-16 rounded-xl border border-slate-100 bg-slate-50 p-1.5 text-left hover:border-cyan-300"
            >
              <p className="text-xs font-semibold text-slate-700">{day}</p>
              {dayTrades.length ? (
                <p className="mt-1 text-[10px] text-slate-500">
                  {dayTrades.length} · <span className="text-emerald-600">{wins}W</span>{" "}
                  <span className="text-red-500">{losses}L</span>
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
