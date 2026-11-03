import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { TRADE_STATUS_LABELS } from "@/lib/constants";
import { getTrade } from "@/lib/data/repository";
import { formatDateTime, formatMoney, formatNumber, titleCase } from "@/lib/utils";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{trade.playbookSnapshot.name}</p>
          <h1 className="text-3xl font-semibold">
            {trade.symbol?.code ?? "Trade"} · {titleCase(trade.direction)}
          </h1>
        </div>
        <Link
          href={`/app/journal/${trade.id}/edit`}
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
        >
          Edit
        </Link>
      </div>
      <Card className="grid gap-4 p-6 md:grid-cols-3">
        <Field label="Status" value={TRADE_STATUS_LABELS[trade.status]} />
        <Field label="Account" value={trade.account?.name} />
        <Field label="Lots" value={formatNumber(trade.quantity)} />
        <Field label="Entry" value={formatNumber(trade.entry, 5)} />
        <Field label="Stop" value={formatNumber(trade.stopLoss, 5)} />
        <Field label="Take profit" value={formatNumber(trade.takeProfit, 5)} />
        <Field label="Exit" value={formatNumber(trade.exitPrice, 5)} />
        <Field label="Planned RR" value={formatNumber(trade.plannedRr)} />
        <Field label="Actual RR" value={formatNumber(trade.actualRr)} />
        <Field label="P&L" value={formatMoney(trade.pnlGross, trade.account?.currency)} />
        <Field label="Opened" value={formatDateTime(trade.openedAt)} />
        <Field label="Closed" value={formatDateTime(trade.closedAt)} />
      </Card>
      <Card className="p-6">
        <p className="mb-2 text-sm font-medium text-slate-700">Reasoning</p>
        <p className="text-sm text-slate-600">{trade.reasoning || "—"}</p>
        <Badge className="mt-4">Closed evidence arrives in a later slice</Badge>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-sm">{value || "—"}</p>
    </div>
  );
}
