"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, Button, Card, Input } from "@/components/ui";
import { deletePlaybookAction, duplicatePlaybookAction } from "@/lib/actions/journal";
import { APPROACHES, TRADING_STYLES } from "@/lib/constants";
import type { Playbook } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const chips = ["all", "preparing", "draft", "active"] as const;

export function PlaybookList({ playbooks }: { playbooks: Playbook[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<(typeof chips)[number]>("all");
  const [style, setStyle] = useState("");
  const [approach, setApproach] = useState("");

  const filtered = useMemo(() => {
    return playbooks.filter((playbook) => {
      const haystack = `${playbook.name} ${playbook.setupTypes.join(" ")} ${playbook.confluences.join(" ")}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (chip !== "all" && playbook.prepStatus !== chip) return false;
      if (style && playbook.tradingStyle !== style) return false;
      if (approach && playbook.approach !== approach) return false;
      return true;
    });
  }, [approach, chip, playbooks, query, style]);

  const counts = {
    total: playbooks.length,
    preparing: playbooks.filter((row) => row.prepStatus === "preparing").length,
    draft: playbooks.filter((row) => row.prepStatus === "draft").length,
    active: playbooks.filter((row) => row.prepStatus === "active").length,
    live: playbooks.filter((row) => row.usageStatus === "live").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-5">
        {Object.entries(counts).map(([key, value]) => (
          <Card key={key} className="px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{titleCase(key)}</p>
            <p className="font-[family-name:var(--font-geist-sans)] text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search playbook, setup…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
        />
        {chips.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setChip(item)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              chip === item
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {item.toUpperCase()}
          </button>
        ))}
        <select
          value={style}
          onChange={(event) => setStyle(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="">Trading style</option>
          {TRADING_STYLES.map((item) => (
            <option key={item} value={item}>
              {titleCase(item)}
            </option>
          ))}
        </select>
        <select
          value={approach}
          onChange={(event) => setApproach(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="">Approach</option>
          {APPROACHES.map((item) => (
            <option key={item} value={item}>
              {titleCase(item)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((playbook) => (
          <Card key={playbook.id} className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-geist-sans)] text-lg font-semibold">
                  {playbook.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {playbook.tradingStyle ? <Badge>{titleCase(playbook.tradingStyle)}</Badge> : null}
                  {playbook.approach ? (
                    <Badge tone={playbook.approach === "aggressive" ? "amber" : "slate"}>
                      {titleCase(playbook.approach)}
                    </Badge>
                  ) : null}
                  <Badge tone="cyan">{titleCase(playbook.prepStatus)}</Badge>
                  {playbook.usageStatus === "live" ? <Badge tone="green">Live</Badge> : null}
                </div>
              </div>
              <Button variant="secondary" onClick={() => router.push(`/app/playbooks/${playbook.id}/edit`)}>
                Edit
              </Button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {playbook.setupTypes.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
            <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <p><span className="font-semibold text-slate-800">Confluence:</span> {playbook.confluences.join(", ") || "—"}</p>
              <p className="line-clamp-2"><span className="font-semibold text-slate-800">Checklist:</span> {playbook.checklist || "—"}</p>
              <p className="line-clamp-2"><span className="font-semibold text-slate-800">Entry:</span> {playbook.entryCriteria || "—"}</p>
              <p className="line-clamp-2"><span className="font-semibold text-slate-800">Exit:</span> {playbook.exitCriteria || "—"}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {playbook.images.map((image) => (
                <img key={image.id} src={image.signedUrl ?? image.storagePath} alt="" className="h-12 w-16 rounded-lg object-cover" />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Last updated {new Date(playbook.updatedAt).toLocaleDateString()}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="hover:text-slate-700"
                  onClick={async () => {
                    const result = await duplicatePlaybookAction(playbook.id);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success("Playbook duplicated");
                      router.refresh();
                    }
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="hover:text-red-600"
                  onClick={async () => {
                    const result = await deletePlaybookAction(playbook.id);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success("Playbook deleted");
                      router.refresh();
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          No playbooks match these filters.{" "}
          <Link href="/app/playbooks/new" className="text-blue-600">
            Create one
          </Link>
          .
        </Card>
      ) : null}
    </div>
  );
}
