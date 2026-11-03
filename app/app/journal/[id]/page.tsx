import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceUploader } from "@/components/evidence-uploader";
import { Badge, Card } from "@/components/ui";
import { CLOSED_STATUSES, TRADE_STATUS_LABELS } from "@/lib/constants";
import { getTrade } from "@/lib/data/repository";
import { classifyOutcome } from "@/lib/insights";
import { formatDateTime, formatMoney, formatNumber, formatR, titleCase } from "@/lib/utils";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  const closed = CLOSED_STATUSES.includes(trade.status as (typeof CLOSED_STATUSES)[number]);
  const outcome = classifyOutcome(trade.actualRr);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{trade.playbookSnapshot.name}</p>
          <h1 className="text-3xl font-semibold">
            {trade.symbol?.code ?? "Trade"} · {titleCase(trade.direction)}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{TRADE_STATUS_LABELS[trade.status]}</Badge>
            {outcome ? (
              <Badge tone={outcome === "win" ? "green" : outcome === "loss" ? "red" : "amber"}>
                {titleCase(outcome)}
              </Badge>
            ) : null}
            {trade.review ? <Badge tone="cyan">Reviewed</Badge> : closed ? <Badge tone="amber">Needs review</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/journal/${trade.id}/edit`}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
          >
            Close / edit
          </Link>
          <Link
            href={`/app/journal/${trade.id}/review`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
          >
            {trade.review ? "Edit review" : "Review trade"}
          </Link>
        </div>
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
        <Field label="Actual R" value={formatR(trade.actualRr)} />
        <Field label="P&L" value={formatMoney(trade.pnlGross, trade.account?.currency)} />
        <Field label="Opened" value={formatDateTime(trade.openedAt)} />
        <Field label="Closed" value={formatDateTime(trade.closedAt)} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="mb-2 text-sm font-medium text-slate-700">Reasoning</p>
          <p className="text-sm text-slate-600">{trade.reasoning || "—"}</p>
          <p className="mt-4 mb-2 text-sm font-medium text-slate-700">Notes</p>
          <p className="text-sm text-slate-600">{trade.notes || "—"}</p>
        </Card>
        <Card className="p-6">
          <p className="mb-2 text-sm font-medium text-slate-700">Playbook snapshot</p>
          <p className="text-sm text-slate-600">{trade.playbookSnapshot.checklist || "No checklist stored."}</p>
          <p className="mt-3 text-xs text-slate-500">
            Entry: {trade.playbookSnapshot.entryCriteria || "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Exit: {trade.playbookSnapshot.exitCriteria || "—"}
          </p>
        </Card>
      </div>

      {trade.review ? (
        <Card className="p-6">
          <p className="mb-3 text-sm font-medium text-slate-700">Review</p>
          <p className="text-sm text-slate-600">Rating {trade.review.rating ?? "—"} / 5</p>
          <p className="mt-2 text-sm text-slate-600">{trade.review.lessons || "No lessons yet."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {trade.review.emotions.map((tag) => (
              <Badge key={tag} tone="blue">
                {tag}
              </Badge>
            ))}
            {trade.review.mistakes.map((tag) => (
              <Badge key={tag} tone="red">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Evidence</h2>
          <p className="text-sm text-slate-500">Setup (2), reference (5) and closing (1) images.</p>
        </div>
        <EvidenceUploader tradeId={trade.id} images={trade.images ?? []} />
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
