import Link from "next/link";
import { TradeCalendar } from "@/components/trade-calendar";
import { Badge, Card } from "@/components/ui";
import { APP_NAME } from "@/lib/config";
import {
  currentUser,
  dashboardStats,
  listAccounts,
  listAllTrades,
  listReviews,
  listTrades,
  listUnreviewedClosedTrades,
} from "@/lib/data/repository";
import { buildInsights } from "@/lib/insights";
import { formatDateTime, formatMoney, formatPct, formatR } from "@/lib/utils";

export default async function DashboardPage() {
  const [user, stats, trades, reviews, queue, open, accounts] = await Promise.all([
    currentUser(),
    dashboardStats(),
    listAllTrades(),
    listReviews(),
    listUnreviewedClosedTrades(),
    listTrades("open"),
    listAccounts(),
  ]);
  const insights = buildInsights(trades, reviews);
  const currency = accounts[0]?.currency ?? "USD";
  const recent = [...trades].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">Welcome back, {user?.displayName}</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">{APP_NAME}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Journal from a Live playbook, close with evidence, then review the snapshotted plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/playbooks/new"
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
          >
            New playbook
          </Link>
          <Link href="/app/journal/new" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
            New trade
          </Link>
          <Link href="/app/reviews" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
            Reviews
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat href="/app/insights" label="Win rate" value={formatPct(insights.winRate)} />
        <Stat href="/app/insights" label="Expectancy" value={formatR(insights.expectancy)} />
        <Stat href="/app/insights" label="Total P&L" value={formatMoney(insights.totalPnl, currency)} />
        <Stat href="/app/reviews" label="Unreviewed" value={String(queue.length)} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat href="/app/playbooks" label="Playbooks" value={String(stats.playbooks)} />
        <Stat href="/app/playbooks" label="Live playbooks" value={String(stats.live)} />
        <Stat href="/app/journal?tab=open" label="Open trades" value={String(stats.open)} />
        <Stat href="/app/journal?tab=closed" label="Closed trades" value={String(stats.closed)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Review queue</h2>
              <Link href="/app/reviews" className="text-sm text-blue-600">
                Open queue
              </Link>
            </div>
            {queue.length === 0 ? (
              <p className="text-sm text-slate-500">No closed trades waiting for a review.</p>
            ) : (
              <ul className="space-y-3">
                {queue.slice(0, 4).map((trade) => (
                  <li key={trade.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {trade.symbol?.code} · {trade.playbookSnapshot.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(trade.closedAt)} · {formatR(trade.actualRr)}
                      </p>
                    </div>
                    <Link href={`/app/journal/${trade.id}/review`} className="text-sm text-blue-600">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent trades</h2>
              <Link href="/app/journal" className="text-sm text-blue-600">
                Journal
              </Link>
            </div>
            <ul className="space-y-3">
              {recent.map((trade) => (
                <li key={trade.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {trade.symbol?.code} · {trade.playbookSnapshot.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(trade.openedAt)}</p>
                  </div>
                  <Badge>{trade.status.replaceAll("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <TradeCalendar
            trades={trades}
            month={
              trades
                .map((trade) => (trade.closedAt ?? trade.openedAt).slice(0, 7))
                .sort()
                .at(-1) ?? new Date().toISOString().slice(0, 7)
            }
          />
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Open now</h2>
            {open.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No open trades.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {open.map((trade) => (
                  <li key={trade.id}>
                    <Link href={`/app/journal/${trade.id}`} className="text-blue-600">
                      {trade.symbol?.code} · {formatR(trade.plannedRr)} planned
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link href={href}>
      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl font-semibold sm:text-3xl">{value}</p>
      </Card>
    </Link>
  );
}
