import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { listReviews, listTrades, listUnreviewedClosedTrades } from "@/lib/data/repository";
import { formatDateTime, formatMoney, formatR } from "@/lib/utils";

export default async function ReviewsPage() {
  const [queue, closed, reviews] = await Promise.all([
    listUnreviewedClosedTrades(),
    listTrades("closed"),
    listReviews(),
  ]);
  const reviewed = closed.filter((trade) => reviews.some((review) => review.tradeId === trade.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">
          Closed trades wait here until you score the snapshotted plan, tags and lessons.
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Unreviewed queue</h2>
          <Badge tone={queue.length ? "amber" : "green"}>{queue.length} waiting</Badge>
        </div>
        {queue.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">Every closed trade has a review.</Card>
        ) : (
          <div className="grid gap-3">
            {queue.map((trade) => (
              <Card key={trade.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {trade.symbol?.code ?? "Trade"} · {trade.playbookSnapshot.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(trade.closedAt)} · {formatR(trade.actualRr)} ·{" "}
                    {formatMoney(trade.pnlGross, trade.account?.currency)}
                  </p>
                </div>
                <Link
                  href={`/app/journal/${trade.id}/review`}
                  className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-center text-sm text-white"
                >
                  Review
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Completed</h2>
        {reviewed.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">No completed reviews yet.</Card>
        ) : (
          <div className="grid gap-3">
            {reviewed.map((trade) => (
              <Card key={trade.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {trade.symbol?.code ?? "Trade"} · {trade.playbookSnapshot.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Rating {trade.review?.rating ?? "—"} / 5 · {trade.review?.lessons || "No lesson written"}
                  </p>
                </div>
                <Link href={`/app/journal/${trade.id}/review`} className="text-sm text-blue-600">
                  Edit review
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
