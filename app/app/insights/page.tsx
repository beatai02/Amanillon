import Link from "next/link";
import { EquityChart } from "@/components/insights-charts";
import { PerformanceTable } from "@/components/performance-table";
import { Badge, Card } from "@/components/ui";
import { DAILY_TRADE_LIMIT, DRAWDOWN_LINE, REVENGE_WINDOW_MINUTES } from "@/lib/config";
import { listAccounts, listAllTrades, listReviews } from "@/lib/data/repository";
import { buildInsights } from "@/lib/insights";
import { formatMoney, formatNumber, formatPct, formatR } from "@/lib/utils";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const accountId = typeof params.account === "string" && params.account ? params.account : undefined;
  const from = typeof params.from === "string" && params.from ? params.from : undefined;
  const to = typeof params.to === "string" && params.to ? params.to : undefined;

  const [trades, reviews, accounts] = await Promise.all([listAllTrades(), listReviews(), listAccounts()]);
  const insights = buildInsights(trades, reviews, { accountId, from, to });
  const account = accounts.find((row) => row.id === accountId) ?? accounts[0];
  const currency = account?.currency ?? "USD";
  const tradeById = new Map(trades.map((trade) => [trade.id, trade]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Insights</h1>
          <p className="mt-1 text-sm text-slate-500">
            Closed-trade equity in the account currency. No FX conversion.
          </p>
        </div>
        <form method="get" className="grid gap-2 sm:grid-cols-4">
          <select name="account" defaultValue={accountId ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">All accounts</option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={from} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input type="date" name="to" defaultValue={to} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Win rate" value={formatPct(insights.winRate)} hint={`${insights.closedCount} closed`} />
        <Kpi label="Average R" value={formatR(insights.averageR)} hint={`Expectancy ${formatNumber(insights.expectancy)}`} />
        <Kpi label="Total P&L" value={formatMoney(insights.totalPnl, currency)} hint={currency} />
        <Kpi
          label="Discipline"
          value={`${formatNumber(insights.disciplineScore, 0)}%`}
          hint="Checklist items followed"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Equity curve</h2>
          <EquityChart points={insights.equityCurve} currency={currency} />
        </Card>
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Drawdown</h2>
          <p className="font-[family-name:var(--font-geist-mono)] text-3xl font-semibold">
            {formatMoney(insights.maxDrawdown, currency)}
          </p>
          <p className="text-sm text-slate-500">
            Current {formatMoney(insights.currentDrawdown, currency)}. Warning line {formatMoney(DRAWDOWN_LINE, currency)}.
          </p>
          {insights.belowDrawdownLine ? <Badge tone="red">Below drawdown line</Badge> : <Badge tone="green">Above line</Badge>}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceTable title="By playbook" rows={insights.byPlaybook} currency={currency} />
        <PerformanceTable title="By instrument" rows={insights.byInstrument} currency={currency} />
        <PerformanceTable title="By session" rows={insights.bySession} currency={currency} />
        <PerformanceTable title="By weekday" rows={insights.byWeekday} currency={currency} />
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Behaviour flags</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FlagBlock
            title={`Revenge (${REVENGE_WINDOW_MINUTES} min)`}
            empty="No revenge trades in this range."
            items={insights.flags.revengeTradeIds.map((id) => {
              const trade = tradeById.get(id);
              return {
                id,
                href: `/app/journal/${id}`,
                label: trade ? `${trade.symbol?.code ?? id} after a loss` : id,
              };
            })}
          />
          <FlagBlock
            title={`Overtrading (> ${DAILY_TRADE_LIMIT} / day)`}
            empty="No overtrading days."
            items={insights.flags.overtrading.map((row) => ({
              id: row.day,
              href: `/app/journal?from=${row.day}&to=${row.day}`,
              label: `${row.day} · ${row.count} trades`,
            }))}
          />
          <FlagBlock
            title="Rule breaks"
            empty="No skipped checklist items."
            items={insights.flags.ruleBreakTradeIds.map((id) => {
              const trade = tradeById.get(id);
              return {
                id,
                href: `/app/journal/${id}/review`,
                label: trade ? `${trade.symbol?.code ?? id} skipped a rule` : id,
              };
            })}
          />
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; hint: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function FlagBlock({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; href: string; label: string }[];
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="text-blue-600">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
