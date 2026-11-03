import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeReviewForm } from "@/components/trade-review-form";
import { getTrade } from "@/lib/data/repository";
import { formatDateTime, formatMoney, formatR } from "@/lib/utils";

export default async function TradeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);
  if (!trade) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/reviews" className="text-sm text-blue-600">
          Back to review queue
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Trade review</h1>
        <p className="mt-1 text-sm text-slate-500">
          {trade.symbol?.code} closed {formatDateTime(trade.closedAt)} · {formatR(trade.actualRr)} ·{" "}
          {formatMoney(trade.pnlGross, trade.account?.currency)}
        </p>
      </div>
      <TradeReviewForm trade={trade} review={trade.review} />
    </div>
  );
}
