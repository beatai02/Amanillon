"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChipSelect } from "@/components/chip-select";
import { Button, Card, Label, Textarea } from "@/components/ui";
import { saveReviewAction } from "@/lib/actions/journal";
import { EMOTION_TAGS, MISTAKE_TAGS } from "@/lib/config";
import { checklistFromSnapshot } from "@/lib/insights";
import type { Trade, TradeReview } from "@/lib/types";

export function TradeReviewForm({ trade, review }: { trade: Trade; review?: TradeReview | null }) {
  const router = useRouter();
  const defaults = checklistFromSnapshot(trade.playbookSnapshot).map((item) => {
    const existing = review?.checklist.find((row) => row.id === item.id);
    return { ...item, followed: existing?.followed ?? false };
  });
  const [checklist, setChecklist] = useState(review?.checklist?.length ? review.checklist : defaults);
  const [emotions, setEmotions] = useState(review?.emotions ?? []);
  const [mistakes, setMistakes] = useState(review?.mistakes ?? []);
  const [lessons, setLessons] = useState(review?.lessons ?? "");
  const [rating, setRating] = useState(review?.rating ?? 3);
  const [saving, setSaving] = useState(false);

  return (
    <Card className="space-y-6 p-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">What happened after you closed?</p>
        <h2 className="mt-1 text-xl font-semibold">
          {trade.playbookSnapshot.name} · {trade.symbol?.code}
        </h2>
      </div>
      <div>
        <Label>Playbook adherence</Label>
        <ul className="mt-2 space-y-2">
          {checklist.map((item, index) => (
            <li key={item.id}>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.followed}
                  onChange={(event) =>
                    setChecklist((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, followed: event.target.checked } : row,
                      ),
                    )
                  }
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Label>Emotions</Label>
        <ChipSelect options={[...EMOTION_TAGS]} value={emotions} onChange={setEmotions} />
      </div>
      <div>
        <Label>Mistakes</Label>
        <ChipSelect options={[...MISTAKE_TAGS]} value={mistakes} onChange={setMistakes} />
      </div>
      <div>
        <Label>Lessons</Label>
        <Textarea rows={4} value={lessons} onChange={(event) => setLessons(event.target.value)} />
      </div>
      <div>
        <Label>Rating</Label>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`size-10 rounded-full text-sm font-semibold ${
                rating === value
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <Button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const result = await saveReviewAction({
            tradeId: trade.id,
            checklist,
            emotions,
            mistakes,
            lessons,
            rating,
          });
          setSaving(false);
          if (result.error) toast.error(result.error);
          else {
            toast.success("Review saved");
            router.push("/app/reviews");
            router.refresh();
          }
        }}
      >
        Save review
      </Button>
    </Card>
  );
}
