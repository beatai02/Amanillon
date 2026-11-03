"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChipSelect } from "@/components/chip-select";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { saveTradeAction } from "@/lib/actions/journal";
import { computeTradeMetrics, riskAmount, stopDistance, suggestedQty, toNumber } from "@/lib/calc";
import { DIRECTIONS, RISK_MODES, TIMEFRAMES, TRADE_STATUS_LABELS, TRADE_STATUSES } from "@/lib/constants";
import type { Playbook, SymbolRow, Trade, TradingAccount } from "@/lib/types";
import { titleCase } from "@/lib/utils";

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
  const livePlaybooks = playbooks.filter((playbook) => playbook.usageStatus === "live");
  const [playbookId, setPlaybookId] = useState(trade?.playbookId ?? "");
  const [accountId, setAccountId] = useState(trade?.accountId ?? accounts[0]?.id ?? "");
  const [symbolQuery, setSymbolQuery] = useState("");
  const [symbolId, setSymbolId] = useState(trade?.symbolId ?? "");
  const [status, setStatus] = useState(trade?.status ?? "entry_planned");
  const [openedAt, setOpenedAt] = useState(toLocalInput(trade?.openedAt));
  const [closedAt, setClosedAt] = useState(toLocalInput(trade?.closedAt));
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
  const [saving, setSaving] = useState(false);

  const playbook = livePlaybooks.find((row) => row.id === playbookId);
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
      const fx = symbol.calcCurrency === account.currency ? 1 : symbol.code === "GBPAUD" ? 0.7 : 1;
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

  if (!livePlaybooks.length) {
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
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Live playbook</p>
        <div className="grid gap-3 md:grid-cols-2">
          {livePlaybooks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPlaybookId(item.id);
                setHtf(item.htf);
                setEntryTf(item.entryTf);
                if (item.riskPerTradePct) setRiskValue(String(item.riskPerTradePct));
              }}
              className={`rounded-2xl border p-4 text-left ${
                playbookId === item.id ? "border-cyan-500 bg-cyan-50/50" : "border-slate-200"
              }`}
            >
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.tradingStyle ? titleCase(item.tradingStyle) : "Style unset"} · Risk {item.riskPerTradePct ?? "—"}%
              </p>
              <p className="mt-2 text-xs text-slate-500">This playbook is snapshotted onto the trade.</p>
            </button>
          ))}
        </div>
      </Card>

      {playbook ? (
        <Card className="space-y-5 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Account *</Label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {titleCase(item.accountType)} — {item.size}
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
                onChange={(event) => setSymbolId(event.target.value)}
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
                  Contract size {symbol.contractSize.toLocaleString()} · Lot step {symbol.lotStep} · Calc {symbol.calcCurrency}
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
                <button
                  type="button"
                  className="mt-1 text-xs text-blue-600"
                  onClick={() => setQuantity(String(preview.suggested))}
                >
                  Apply suggested {preview.suggested} lots
                </button>
              ) : null}
            </div>
            <div>
              <Label>Risk mode</Label>
              <ChipSelect
                options={RISK_MODES.map(titleCase)}
                value={[titleCase(riskMode)]}
                multiple={false}
                onChange={(next) => setRiskMode((next[0]?.toLowerCase() as typeof riskMode) ?? "percent")}
              />
            </div>
            <div>
              <Label>{riskMode === "percent" ? "Risk %" : "Risk amount"}</Label>
              <Input value={riskValue} onChange={(event) => setRiskValue(event.target.value)} />
            </div>
            <div>
              <Label>Entry *</Label>
              <Input value={entry} onChange={(event) => setEntry(event.target.value)} />
            </div>
            <div>
              <Label>Stop loss *</Label>
              <Input value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
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
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400">Planned RR</p>
                <p className="font-[family-name:var(--font-geist-mono)]">{preview.plannedRr ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Max planned loss</p>
                <p className="font-[family-name:var(--font-geist-mono)]">${preview.maxPlannedLoss}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Profit target</p>
                <p className="font-[family-name:var(--font-geist-mono)]">${preview.profitTarget ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Suggested lots</p>
                <p className="font-[family-name:var(--font-geist-mono)]">{preview.suggested}</p>
              </div>
            </div>
          ) : null}

          <div>
            <Label>Reasoning</Label>
            <Textarea rows={4} value={reasoning} onChange={(event) => setReasoning(event.target.value)} />
          </div>

          {playbook ? <Badge tone="cyan">Snapshot: {playbook.name}</Badge> : null}

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
              });
              setSaving(false);
              if (result.error) toast.error(result.error);
              else {
                toast.success("Journal created.");
                router.push("/app/journal");
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
    </div>
  );
}

function toLocalInput(value?: string | null) {
  if (!value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
