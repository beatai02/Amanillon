"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChipSelect } from "@/components/chip-select";
import { EvidenceUploader } from "@/components/evidence-uploader";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { saveTradeAction } from "@/lib/actions/journal";
import { computeTradeMetrics, riskAmount, stopDistance, suggestedQty, toNumber } from "@/lib/calc";
import { APPLY_FX_CONVERSION } from "@/lib/config";
import { CLOSED_STATUSES, DIRECTIONS, RISK_MODES, TIMEFRAMES, TRADE_STATUS_LABELS, TRADE_STATUSES } from "@/lib/constants";
import type { Playbook, SymbolRow, Trade, TradingAccount } from "@/lib/types";
import { formatMoney, formatR, titleCase } from "@/lib/utils";

export function TradeForm({
  playbooks,
  accounts,
  symbols,
  trade,
}: {
  playbooks: Playbook[];
  accounts: TradingAccount[];
  symbols: SymbolRow[];
  trade?: Trade | null;
}) {
  const router = useRouter();
  const selectablePlaybooks = useMemo(() => {
    const live = playbooks.filter((playbook) => playbook.usageStatus === "live");
    if (trade?.playbookId) {
      const current = playbooks.find((playbook) => playbook.id === trade.playbookId);
      if (current && !live.some((playbook) => playbook.id === current.id)) {
        return [current, ...live];
      }
    }
    return live;
  }, [playbooks, trade]);
  const [playbookId, setPlaybookId] = useState(trade?.playbookId ?? "");
  const [accountId, setAccountId] = useState(trade?.accountId ?? accounts[0]?.id ?? "");
  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbolId, setSymbolId] = useState(trade?.symbolId ?? "");
  const [status, setStatus] = useState(trade?.status ?? "entry_planned");
  const [openedAt, setOpenedAt] = useState(toLocalInput(trade?.openedAt));
  const [closedAt, setClosedAt] = useState(toLocalInput(trade?.closedAt, false));
  const [htf, setHtf] = useState<string[]>(trade?.htf ?? []);
  const [entryTf, setEntryTf] = useState<string[]>(trade?.entryTf ?? []);
  const [direction, setDirection] = useState(trade?.direction ?? "long");
  const [quantity, setQuantity] = useState(trade?.quantity?.toString() ?? "");
  const [entry, setEntry] = useState(trade?.entry?.toString() ?? "");
  const [stopLoss, setStopLoss] = useState(trade?.stopLoss?.toString() ?? "");
  const [takeProfit, setTakeProfit] = useState(trade?.takeProfit?.toString() ?? "");
  const [exitPrice, setExitPrice] = useState(trade?.exitPrice?.toString() ?? "");
  const [riskMode, setRiskMode] = useState(trade?.riskMode ?? "percent");
  const [riskValue, setRiskValue] = useState(trade?.riskValue?.toString() ?? accounts[0]?.allowedRiskPct?.toString() ?? "2");
  const [reasoning, setReasoning] = useState(trade?.reasoning ?? "");
  const [notes, setNotes] = useState(trade?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const playbook = selectablePlaybooks.find((row) => row.id === playbookId) ?? playbooks.find((row) => row.id === playbookId);
  const account = accounts.find((row) => row.id === accountId);
  const symbol = symbols.find((row) => row.id === symbolId);
  const filteredSymbols = symbols.filter((row) => {
    const q = symbolQuery.toLowerCase();
    return !q || row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
  });

  const preview = useMemo(() => {
    if (!account || !symbol || !entry || !stopLoss || !riskValue) return null;
    try {
      const stop = stopDistance(entry, stopLoss);
      const risk = riskAmount({
        mode: riskMode,
        accountSize: account.size,
        riskValue,
      });
      const fx = APPLY_FX_CONVERSION ? 1 : 1;
      const qty = suggestedQty({
        riskAmount: risk,
        stopDistance: stop,
        contractSize: symbol.contractSize,
        fx,
        lotStep: symbol.lotStep,
      });
      const metrics = computeTradeMetrics({
        entry,
        stopLoss,
        takeProfit: takeProfit || null,
        exitPrice: exitPrice || null,
        direction,
        quantity: quantity || qty,
        contractSize: symbol.contractSize,
        fx,
      });
      return {
        suggested: toNumber(qty, 2),
        risk: toNumber(risk, 2),
        ...metrics,
      };
    } catch {
      return null;
    }
  }, [account, direction, entry, exitPrice, quantity, riskMode, riskValue, stopLoss, symbol, takeProfit]);

  function suggestedFrom(next: { entry?: string; stopLoss?: string; accountId?: string; symbolId?: string; riskMode?: typeof riskMode; riskValue?: string }) {
    const nextAccount = accounts.find((row) => row.id === (next.accountId ?? accountId));
    const nextSymbol = symbols.find((row) => row.id === (next.symbolId ?? symbolId));
    const nextEntry = next.entry ?? entry;
    const nextStop = next.stopLoss ?? stopLoss;
    const nextRisk = next.riskValue ?? riskValue;
    const nextMode = next.riskMode ?? riskMode;
    if (!nextAccount || !nextSymbol || !nextEntry || !nextStop || !nextRisk) return null;
    try {
      return toNumber(
        suggestedQty({
          riskAmount: riskAmount({ mode: nextMode, accountSize: nextAccount.size, riskValue: nextRisk }),
          stopDistance: stopDistance(nextEntry, nextStop),
          contractSize: nextSymbol.contractSize,
          fx: APPLY_FX_CONVERSION ? 1 : 1,
          lotStep: nextSymbol.lotStep,
        }),
        2,
      );
    } catch {
      return null;
    }
  }

  function applySuggestedLots(next: Parameters<typeof suggestedFrom>[0]) {
    const qty = suggestedFrom(next);
    if (qty != null) setQuantity(String(qty));
  }

  if (!selectablePlaybooks.length && !trade) {
    return (
      <Card className="p-8 text-sm text-slate-600">
        Create an Active playbook and toggle it Live before adding a trade.
      </Card>
    );
  }

  if (!accounts.length) {
    return (
      <Card className="p-8 text-sm text-slate-600">
        Add a trading account in Profile before journaling a trade.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {trade ? "Playbook snapshot stays frozen" : "Live playbook"}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {selectablePlaybooks.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={Boolean(trade)}
              onClick={() => {
                setPlaybookId(item.id);
                setHtf(item.htf);
                setEntryTf(item.entryTf);
                if (item.riskPerTradePct) {
                  const nextRisk = String(item.riskPerTradePct);
                  setRiskValue(nextRisk);
                  applySuggestedLots({ riskValue: nextRisk });
                }
              }}
              className={`rounded-2xl border p-4 text-left ${
                playbookId === item.id ? "border-cyan-500 bg-cyan-50/50" : "border-slate-200"
              }`}
            >
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.tradingStyle ? titleCase(item.tradingStyle) : "Style unset"} · Risk {item.riskPerTradePct ?? "—"}%
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {trade ? "Editing does not replace the snapshotted plan." : "This playbook is snapshotted onto the trade."}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {playbook || trade ? (
        <Card className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Account *</Label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={accountId}
                onChange={(event) => {
                  const next = event.target.value;
                  setAccountId(next);
                  applySuggestedLots({ accountId: next });
                }}
              >
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {titleCase(item.accountType)} — {item.size} {item.currency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Symbol *</Label>
              <Input
                placeholder="Search symbol"
                value={symbolQuery}
                onChange={(event) => setSymbolQuery(event.target.value)}
              />
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={symbolId}
                onChange={(event) => {
                  const next = event.target.value;
                  setSymbolId(next);
                  applySuggestedLots({ symbolId: next });
                }}
              >
                <option value="">Select symbol</option>
                {filteredSymbols.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.assetClass.toUpperCase()}
                  </option>
                ))}
              </select>
              {symbol ? (
                <p className="mt-1 text-xs text-slate-500">
                  Contract size {symbol.contractSize.toLocaleString()} · Lot step {symbol.lotStep} · Account currency {account?.currency}
                </p>
              ) : null}
            </div>
            <div>
              <Label>Status *</Label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={status}
                onChange={(event) => {
                  const next = event.target.value as typeof status;
                  setStatus(next);
                  if (next === "trade_sl_hit" && !exitPrice) setExitPrice(stopLoss);
                  if (CLOSED_STATUSES.includes(next as (typeof CLOSED_STATUSES)[number]) && !closedAt) {
                    setClosedAt(toLocalInput(new Date().toISOString()));
                  }
                }}
              >
                {TRADE_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {TRADE_STATUS_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Open date & time *</Label>
              <Input type="datetime-local" value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} />
            </div>
          </div>

          <div>
            <Label>Higher timeframe *</Label>
            <ChipSelect options={TIMEFRAMES} value={htf} onChange={setHtf} />
          </div>
          <div>
            <Label>Entry timeframe *</Label>
            <ChipSelect options={TIMEFRAMES} value={entryTf} onChange={setEntryTf} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Direction</Label>
              <ChipSelect
                options={DIRECTIONS.map((item) => titleCase(item))}
                value={[titleCase(direction)]}
                multiple={false}
                onChange={(next) => setDirection((next[0]?.toLowerCase() as typeof direction) ?? "long")}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              {preview ? (
                <p className="mt-1 text-xs text-slate-500">
                  Suggested {preview.suggested} lots (recalculated when entry or stop changes)
                </p>
              ) : null}
            </div>
            <div>
              <Label>Risk mode</Label>
              <ChipSelect
                options={RISK_MODES.map(titleCase)}
                value={[titleCase(riskMode)]}
                multiple={false}
                onChange={(next) => {
                  const mode = (next[0]?.toLowerCase() as typeof riskMode) ?? "percent";
                  setRiskMode(mode);
                  applySuggestedLots({ riskMode: mode });
                }}
              />
            </div>
            <div>
              <Label>{riskMode === "percent" ? "Risk %" : "Risk amount"}</Label>
              <Input
                value={riskValue}
                onChange={(event) => {
                  const next = event.target.value;
                  setRiskValue(next);
                  applySuggestedLots({ riskValue: next });
                }}
              />
            </div>
            <div>
              <Label>Entry *</Label>
              <Input
                value={entry}
                onChange={(event) => {
                  const next = event.target.value;
                  setEntry(next);
                  applySuggestedLots({ entry: next });
                }}
              />
            </div>
            <div>
              <Label>Stop loss *</Label>
              <Input
                value={stopLoss}
                onChange={(event) => {
                  const next = event.target.value;
                  setStopLoss(next);
                  applySuggestedLots({ stopLoss: next });
                }}
              />
            </div>
            <div>
              <Label>Take profit</Label>
              <Input value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} />
            </div>
            <div>
              <Label>Exit price</Label>
              <Input value={exitPrice} onChange={(event) => setExitPrice(event.target.value)} />
            </div>
            <div>
              <Label>Close time</Label>
              <Input type="datetime-local" value={closedAt} onChange={(event) => setClosedAt(event.target.value)} />
            </div>
          </div>

          {preview ? (
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-3 lg:grid-cols-6">
              <Metric label="Planned RR" value={preview.plannedRr != null ? `${preview.plannedRr}` : "—"} />
              <Metric label="Actual R" value={formatR(preview.actualRr)} />
              <Metric label="P&L" value={formatMoney(preview.pnlGross, account?.currency)} />
              <Metric label="Max planned loss" value={formatMoney(preview.maxPlannedLoss, account?.currency)} />
              <Metric label="Profit target" value={formatMoney(preview.profitTarget, account?.currency)} />
              <Metric label="Suggested lots" value={String(preview.suggested)} />
            </div>
          ) : null}

          <div>
            <Label>Reasoning</Label>
            <Textarea rows={4} value={reasoning} onChange={(event) => setReasoning(event.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {playbook ? <Badge tone="cyan">Snapshot: {trade?.playbookSnapshot.name ?? playbook.name}</Badge> : null}

          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const result = await saveTradeAction(trade?.id ?? null, {
                playbookId,
                accountId,
                symbolId,
                status,
                openedAt,
                closedAt: closedAt || null,
                htf,
                entryTf,
                direction,
                quantity: Number(quantity),
                entry: Number(entry),
                stopLoss: Number(stopLoss),
                takeProfit: takeProfit ? Number(takeProfit) : null,
                exitPrice: exitPrice ? Number(exitPrice) : null,
                riskMode,
                riskValue: Number(riskValue),
                reasoning,
                notes,
              });
              setSaving(false);
              if (result.error) toast.error(result.error);
              else {
                toast.success(trade ? "Trade updated." : "Journal created.");
                router.push(result.id ? `/app/journal/${result.id}` : "/app/journal");
                router.refresh();
              }
            }}
          >
            Save trade
          </Button>
        </Card>
      ) : (
        <Card className="p-6 text-sm text-slate-500">Pick a Live playbook to continue.</Card>
      )}

      {trade ? (
        <Card className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Evidence</h2>
            <p className="text-sm text-slate-500">Setup, reference and closing images stay on this trade.</p>
          </div>
          <EvidenceUploader tradeId={trade.id} images={trade.images ?? []} />
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-[family-name:var(--font-geist-mono)]">{value}</p>
    </div>
  );
}

function toLocalInput(value?: string | null, fallbackNow = true) {
  if (!value) {
    if (!fallbackNow) return "";
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
