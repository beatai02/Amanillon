import { Card } from "@/components/ui";
import { formatMoney, formatNumber, formatPct } from "@/lib/utils";

type Row = {
  key: string;
  count: number;
  winRate: number;
  avgR: number;
  totalPnl: number;
};

export function PerformanceTable({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: Row[];
  currency: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2">Trades</th>
              <th className="px-4 py-2">Win rate</th>
              <th className="px-4 py-2">Avg R</th>
              <th className="px-4 py-2">P&L</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No closed trades in this filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{row.key}</td>
                  <td className="px-4 py-2 font-[family-name:var(--font-geist-mono)]">{row.count}</td>
                  <td className="px-4 py-2 font-[family-name:var(--font-geist-mono)]">{formatPct(row.winRate)}</td>
                  <td className="px-4 py-2 font-[family-name:var(--font-geist-mono)]">{formatNumber(row.avgR)}</td>
                  <td className="px-4 py-2 font-[family-name:var(--font-geist-mono)]">
                    {formatMoney(row.totalPnl, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
