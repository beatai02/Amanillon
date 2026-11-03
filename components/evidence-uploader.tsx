"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui";
import { uploadTradeImageAction } from "@/lib/actions/journal";
import type { TradeImage, TradeImageKind } from "@/lib/types";

const labels: Record<TradeImageKind, string> = {
  setup: "Setup images (max 2)",
  reference: "Reference images (max 5)",
  closing: "Closing evidence (max 1)",
};

export function EvidenceUploader({
  tradeId,
  images,
}: {
  tradeId: string;
  images: TradeImage[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<TradeImageKind | null>(null);

  async function upload(kind: TradeImageKind, files: FileList | null) {
    if (!files?.length) return;
    setBusy(kind);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadTradeImageAction(tradeId, kind, formData);
      if (result.error) toast.error(result.error);
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {(["setup", "reference", "closing"] as TradeImageKind[]).map((kind) => {
        const kindImages = images.filter((image) => image.kind === kind);
        return (
          <div key={kind}>
            <Label>{labels[kind]}</Label>
            <label className="mt-1 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-xs text-slate-500">
              {busy === kind ? "Uploading…" : "Drop or click to upload PNG, JPG or WebP"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple={kind !== "closing"}
                className="hidden"
                onChange={(event) => {
                  void upload(kind, event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {kindImages.map((image) => (
                <a key={image.id} href={image.signedUrl ?? image.storagePath} target="_blank" rel="noreferrer">
                  <img src={image.signedUrl ?? image.storagePath} alt="" className="h-16 w-20 rounded-lg object-cover" />
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
