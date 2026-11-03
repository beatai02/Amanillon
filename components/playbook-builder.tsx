"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChipSelect } from "@/components/chip-select";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { savePlaybookAction, uploadPlaybookImageAction } from "@/lib/actions/journal";
import {
  APPROACHES,
  CONFLUENCES,
  MAX_IMAGE_BYTES,
  MAX_PLAYBOOK_IMAGES,
  PREP_STATUSES,
  SETUP_TYPES,
  TIMEFRAME_RANK,
  TIMEFRAMES,
  TRADING_STYLES,
} from "@/lib/constants";
import type { Playbook, PrepStatus, UsageStatus } from "@/lib/types";
import { canGoLive } from "@/lib/validations";
import { titleCase } from "@/lib/utils";

const steps = [
  { id: 1, title: "Identity" },
  { id: 2, title: "Execution Criteria" },
  { id: 3, title: "Risk & Status" },
  { id: 4, title: "Market Evidence" },
];

type FormState = {
  name: string;
  approach: string;
  tradingStyle: string;
  setupTypes: string[];
  confluences: string[];
  htf: string[];
  intermediateTf: string[];
  entryTf: string[];
  checklist: string;
  entryCriteria: string;
  exitCriteria: string;
  slManagement: string;
  riskPerTradePct: string;
  avgPlannedRr: string;
  plannedRPerYear: string;
  prepStatus: PrepStatus;
  usageStatus: UsageStatus;
};

function fromPlaybook(playbook?: Playbook | null): FormState {
  return {
    name: playbook?.name ?? "",
    approach: playbook?.approach ?? "",
    tradingStyle: playbook?.tradingStyle ?? "",
    setupTypes: playbook?.setupTypes ?? [],
    confluences: playbook?.confluences ?? [],
    htf: playbook?.htf ?? [],
    intermediateTf: playbook?.intermediateTf ?? [],
    entryTf: playbook?.entryTf ?? [],
    checklist: playbook?.checklist ?? "",
    entryCriteria: playbook?.entryCriteria ?? "",
    exitCriteria: playbook?.exitCriteria ?? "",
    slManagement: playbook?.slManagement ?? "",
    riskPerTradePct: playbook?.riskPerTradePct?.toString() ?? "",
    avgPlannedRr: playbook?.avgPlannedRr?.toString() ?? "",
    plannedRPerYear: playbook?.plannedRPerYear?.toString() ?? "",
    prepStatus: playbook?.prepStatus ?? "draft",
    usageStatus: playbook?.usageStatus ?? "not_using",
  };
}

export function PlaybookBuilder({ playbook }: { playbook?: Playbook | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => fromPlaybook(playbook));
  const [playbookId, setPlaybookId] = useState(playbook?.id ?? null);
  const [images, setImages] = useState(playbook?.images ?? []);
  const [saving, setSaving] = useState(false);

  const tfWarning = useMemo(() => {
    if (!form.htf.length || !form.entryTf.length) return null;
    const lowestHtf = Math.min(...form.htf.map((tf) => TIMEFRAME_RANK[tf as keyof typeof TIMEFRAME_RANK] ?? 0));
    const highestEntry = Math.max(
      ...form.entryTf.map((tf) => TIMEFRAME_RANK[tf as keyof typeof TIMEFRAME_RANK] ?? 0),
    );
    return lowestHtf <= highestEntry
      ? "The higher timeframe should sit above the entry timeframe."
      : null;
  }, [form.htf, form.entryTf]);

  function payload() {
    return {
      name: form.name,
      approach: (form.approach || undefined) as FormState["approach"] | undefined,
      tradingStyle: (form.tradingStyle || undefined) as FormState["tradingStyle"] | undefined,
      setupTypes: form.setupTypes,
      confluences: form.confluences,
      htf: form.htf,
      intermediateTf: form.intermediateTf,
      entryTf: form.entryTf,
      checklist: form.checklist,
      entryCriteria: form.entryCriteria,
      exitCriteria: form.exitCriteria,
      slManagement: form.slManagement,
      riskPerTradePct: form.riskPerTradePct ? Number(form.riskPerTradePct) : null,
      avgPlannedRr: form.avgPlannedRr ? Number(form.avgPlannedRr) : null,
      plannedRPerYear: form.plannedRPerYear ? Number(form.plannedRPerYear) : null,
      prepStatus: form.prepStatus,
      usageStatus: form.usageStatus,
    };
  }

  async function persist(nextStatus?: { prepStatus?: PrepStatus; usageStatus?: UsageStatus }) {
    setSaving(true);
    const result = await savePlaybookAction(playbookId, {
      ...payload(),
      ...nextStatus,
    } as never);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return null;
    }
    if (result.id) setPlaybookId(result.id);
    return result.id ?? playbookId;
  }

  async function saveDraft() {
    const id = await persist({ prepStatus: form.prepStatus === "active" ? "active" : "draft" });
    if (id) toast.success("Draft saved");
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    let id = playbookId;
    if (!id) {
      id = await persist();
    }
    if (!id) return;
    const remaining = MAX_PLAYBOOK_IMAGES - images.length;
    for (const file of Array.from(files).slice(0, remaining)) {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Images must be 5 MB or smaller");
        continue;
      }
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadPlaybookImageAction(id, formData);
      if (result.error) toast.error(result.error);
      else {
        setImages((current) => [
          ...current,
          {
            id: result.id ?? crypto.randomUUID(),
            playbookId: id,
            storagePath: result.path ?? "",
            sort: current.length,
          },
        ]);
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Builder</p>
        <ol className="space-y-3">
          {steps.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setStep(item.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                    step === item.id
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.id}
                </span>
                <span className="text-sm font-medium text-slate-700">{item.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-6">
        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div>
              <Label>Approach</Label>
              <ChipSelect
                options={APPROACHES.map(titleCase)}
                value={form.approach ? [titleCase(form.approach)] : []}
                multiple={false}
                onChange={(next) =>
                  setForm((current) => ({
                    ...current,
                    approach: next[0]?.toLowerCase() ?? "",
                  }))
                }
              />
            </div>
            <div>
              <Label>Trading style</Label>
              <ChipSelect
                options={TRADING_STYLES.map(titleCase)}
                value={form.tradingStyle ? [titleCase(form.tradingStyle)] : []}
                multiple={false}
                onChange={(next) =>
                  setForm((current) => ({
                    ...current,
                    tradingStyle: next[0]?.toLowerCase() ?? "",
                  }))
                }
              />
            </div>
            <div>
              <Label>Setup types</Label>
              <ChipSelect
                options={SETUP_TYPES}
                value={form.setupTypes}
                onChange={(setupTypes) => setForm((current) => ({ ...current, setupTypes }))}
              />
            </div>
            <div>
              <Label>Bias & confluence</Label>
              <ChipSelect
                options={CONFLUENCES}
                value={form.confluences}
                onChange={(confluences) => setForm((current) => ({ ...current, confluences }))}
              />
            </div>
            <div>
              <Label>Higher timeframe</Label>
              <ChipSelect options={TIMEFRAMES} value={form.htf} onChange={(htf) => setForm((current) => ({ ...current, htf }))} />
            </div>
            <div>
              <Label>Intermediate timeframe</Label>
              <ChipSelect
                options={TIMEFRAMES}
                value={form.intermediateTf}
                onChange={(intermediateTf) => setForm((current) => ({ ...current, intermediateTf }))}
              />
            </div>
            <div>
              <Label>Entry timeframe</Label>
              <ChipSelect
                options={TIMEFRAMES}
                value={form.entryTf}
                onChange={(entryTf) => setForm((current) => ({ ...current, entryTf }))}
              />
              {tfWarning ? <p className="mt-2 text-xs text-amber-600">{tfWarning}</p> : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <Label>Checklist *</Label>
              <Textarea rows={4} value={form.checklist} onChange={(event) => setForm((current) => ({ ...current, checklist: event.target.value }))} />
            </div>
            <div>
              <Label>Entry criteria *</Label>
              <Textarea rows={4} value={form.entryCriteria} onChange={(event) => setForm((current) => ({ ...current, entryCriteria: event.target.value }))} />
            </div>
            <div>
              <Label>Exit criteria *</Label>
              <Textarea rows={4} value={form.exitCriteria} onChange={(event) => setForm((current) => ({ ...current, exitCriteria: event.target.value }))} />
            </div>
            <div>
              <Label>Stop-loss management *</Label>
              <Textarea rows={4} value={form.slManagement} onChange={(event) => setForm((current) => ({ ...current, slManagement: event.target.value }))} />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <Label>Risk per trade % *</Label>
              <Input
                type="number"
                step="0.1"
                value={form.riskPerTradePct}
                onChange={(event) => setForm((current) => ({ ...current, riskPerTradePct: event.target.value }))}
              />
            </div>
            <div>
              <Label>Average planned R:R * (enter x for 1:x)</Label>
              <Input
                type="number"
                step="0.1"
                value={form.avgPlannedRr}
                onChange={(event) => setForm((current) => ({ ...current, avgPlannedRr: event.target.value }))}
              />
            </div>
            <div>
              <Label>Planned R / year *</Label>
              <Input
                type="number"
                step="1"
                value={form.plannedRPerYear}
                onChange={(event) => setForm((current) => ({ ...current, plannedRPerYear: event.target.value }))}
              />
            </div>
            <div>
              <Label>Preparation status *</Label>
              <ChipSelect
                options={PREP_STATUSES.map(titleCase)}
                value={[titleCase(form.prepStatus)]}
                multiple={false}
                onChange={(next) =>
                  setForm((current) => ({
                    ...current,
                    prepStatus: (next[0]?.toLowerCase() as PrepStatus) ?? "draft",
                    usageStatus:
                      next[0]?.toLowerCase() !== "active" && current.usageStatus === "live"
                        ? "not_using"
                        : current.usageStatus,
                  }))
                }
              />
            </div>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-slate-800">Live</span>
                <span className="text-xs text-slate-500">Only an Active playbook can go Live.</span>
              </span>
              <input
                type="checkbox"
                checked={form.usageStatus === "live"}
                disabled={!canGoLive(form.prepStatus)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    usageStatus: event.target.checked ? "live" : "not_using",
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <p className="mb-3 text-sm text-slate-600">Upload up to 5 PNG, JPG or WebP images (5 MB each).</p>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              Drop images here or click to browse
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                  void handleFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              {images.map((image) => (
                <img
                  key={image.id}
                  src={image.signedUrl ?? image.storagePath}
                  alt=""
                  className="h-24 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void saveDraft()} disabled={saving}>
              Save draft
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((current) => current + 1)}>Continue</Button>
            ) : (
              <Button
                onClick={async () => {
                  const id = await persist();
                  if (id) {
                    toast.success("Playbook saved");
                    router.push("/app/playbooks");
                    router.refresh();
                  }
                }}
                disabled={saving}
              >
                Save playbook
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

