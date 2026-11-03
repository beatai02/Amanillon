import {
  BREAKEVEN_R_ABS,
  DAILY_TRADE_LIMIT,
  DRAWDOWN_LINE,
  REVENGE_WINDOW_MINUTES,
  SESSION_HOURS,
  WIN_R_THRESHOLD,
} from "./config";
import { CLOSED_STATUSES } from "./constants";
import type { Trade, TradeReview } from "./types";

export type Outcome = "win" | "loss" | "breakeven";

export type InsightTrade = Pick<
  Trade,
  | "id"
  | "status"
  | "actualRr"
  | "pnlGross"
  | "openedAt"
  | "closedAt"
  | "playbookId"
  | "playbookSnapshot"
  | "symbolId"
  | "symbol"
  | "accountId"
>;

export function isClosedTrade(trade: Pick<Trade, "status">) {
  return CLOSED_STATUSES.includes(trade.status as (typeof CLOSED_STATUSES)[number]);
}

/** Breakeven band wins over the raw win threshold when they overlap. */
export function classifyOutcome(actualR: number | null | undefined): Outcome | null {
  if (actualR === null || actualR === undefined || Number.isNaN(actualR)) return null;
  if (Math.abs(actualR) < BREAKEVEN_R_ABS) return "breakeven";
  if (actualR > WIN_R_THRESHOLD) return "win";
  return "loss";
}

export function sessionFromIso(iso: string) {
  const hour = new Date(iso).getUTCHours();
  if (hour >= SESSION_HOURS.asia.start && hour < SESSION_HOURS.asia.end) return SESSION_HOURS.asia.label;
  if (hour >= SESSION_HOURS.london.start && hour < SESSION_HOURS.london.end) return SESSION_HOURS.london.label;
  if (hour >= SESSION_HOURS.newYork.start && hour < SESSION_HOURS.newYork.end) {
    return SESSION_HOURS.newYork.label;
  }
  return "Off-session";
}

export function weekdayFromIso(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export function checklistFromSnapshot(snapshot: Trade["playbookSnapshot"]) {
  const lines = (snapshot.checklist ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter(Boolean);
  const items = lines.map((label, index) => ({ id: `line-${index}`, label }));
  if (snapshot.entryCriteria) items.push({ id: "entry", label: `Entry: ${snapshot.entryCriteria}` });
  if (snapshot.exitCriteria) items.push({ id: "exit", label: `Exit: ${snapshot.exitCriteria}` });
  if (snapshot.slManagement) items.push({ id: "sl", label: `Stop: ${snapshot.slManagement}` });
  if (!items.length) items.push({ id: "plan", label: "Followed the playbook plan" });
  return items;
}

export function winRate(trades: InsightTrade[]) {
  const closed = trades.filter(isClosedTrade);
  if (!closed.length) return 0;
  return closed.filter((trade) => classifyOutcome(trade.actualRr) === "win").length / closed.length;
}

export function lossRate(trades: InsightTrade[]) {
  const closed = trades.filter(isClosedTrade);
  if (!closed.length) return 0;
  return closed.filter((trade) => classifyOutcome(trade.actualRr) === "loss").length / closed.length;
}

export function breakevenRate(trades: InsightTrade[]) {
  const closed = trades.filter(isClosedTrade);
  if (!closed.length) return 0;
  return closed.filter((trade) => classifyOutcome(trade.actualRr) === "breakeven").length / closed.length;
}

export function averageR(trades: InsightTrade[]) {
  const values = trades.filter(isClosedTrade).map((trade) => trade.actualRr).filter((value): value is number => value != null);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Expectancy is the mean actual R of closed trades. */
export function expectancy(trades: InsightTrade[]) {
  return averageR(trades);
}

export function totalPnl(trades: InsightTrade[]) {
  return trades
    .filter(isClosedTrade)
    .reduce((sum, trade) => sum + (trade.pnlGross ?? 0), 0);
}

export function equityCurve(trades: InsightTrade[]) {
  const closed = trades
    .filter(isClosedTrade)
    .slice()
    .sort((a, b) => (a.closedAt ?? a.openedAt).localeCompare(b.closedAt ?? b.openedAt));
  let equity = 0;
  return closed.map((trade) => {
    equity += trade.pnlGross ?? 0;
    return {
      tradeId: trade.id,
      at: trade.closedAt ?? trade.openedAt,
      pnl: trade.pnlGross ?? 0,
      equity,
    };
  });
}

/** Largest peak-to-trough drop of closed-trade equity, in account currency. */
export function maxDrawdown(trades: InsightTrade[]) {
  const curve = equityCurve(trades);
  let peak = 0;
  let worst = 0;
  for (const point of curve) {
    peak = Math.max(peak, point.equity);
    worst = Math.min(worst, point.equity - peak);
  }
  return worst;
}

export function currentDrawdown(trades: InsightTrade[]) {
  const curve = equityCurve(trades);
  if (!curve.length) return 0;
  const peak = Math.max(...curve.map((point) => point.equity));
  return curve[curve.length - 1].equity - peak;
}

export function belowDrawdownLine(trades: InsightTrade[]) {
  return currentDrawdown(trades) <= DRAWDOWN_LINE;
}

type GroupRow = {
  key: string;
  count: number;
  wins: number;
  totalR: number;
  totalPnl: number;
  winRate: number;
  avgR: number;
};

function groupBy(trades: InsightTrade[], keyFn: (trade: InsightTrade) => string): GroupRow[] {
  const map = new Map<string, InsightTrade[]>();
  trades.filter(isClosedTrade).forEach((trade) => {
    const key = keyFn(trade);
    map.set(key, [...(map.get(key) ?? []), trade]);
  });
  return [...map.entries()]
    .map(([key, rows]) => {
      const wins = rows.filter((trade) => classifyOutcome(trade.actualRr) === "win").length;
      const totalR = rows.reduce((sum, trade) => sum + (trade.actualRr ?? 0), 0);
      const pnl = rows.reduce((sum, trade) => sum + (trade.pnlGross ?? 0), 0);
      return {
        key,
        count: rows.length,
        wins,
        totalR,
        totalPnl: pnl,
        winRate: rows.length ? wins / rows.length : 0,
        avgR: rows.length ? totalR / rows.length : 0,
      };
    })
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

export function performanceByPlaybook(trades: InsightTrade[]) {
  return groupBy(trades, (trade) => trade.playbookSnapshot?.name || "Unnamed");
}

export function performanceByInstrument(trades: InsightTrade[]) {
  return groupBy(trades, (trade) => trade.symbol?.code || "Unknown");
}

export function performanceBySession(trades: InsightTrade[]) {
  return groupBy(trades, (trade) => sessionFromIso(trade.openedAt));
}

export function performanceByWeekday(trades: InsightTrade[]) {
  return groupBy(trades, (trade) => weekdayFromIso(trade.openedAt));
}

export function disciplineScore(reviews: TradeReview[]) {
  const items = reviews.flatMap((review) => review.checklist);
  if (!items.length) return 0;
  const followed = items.filter((item) => item.followed).length;
  return (followed / items.length) * 100;
}

export function revengeTrades(trades: InsightTrade[]) {
  const closed = trades
    .filter(isClosedTrade)
    .slice()
    .sort((a, b) => (a.closedAt ?? "").localeCompare(b.closedAt ?? ""));
  const flagged = new Set<string>();
  const windowMs = REVENGE_WINDOW_MINUTES * 60 * 1000;
  for (const trade of trades) {
    const opened = new Date(trade.openedAt).getTime();
    const priorLoss = closed.find((other) => {
      if (other.id === trade.id || !other.closedAt) return false;
      if (classifyOutcome(other.actualRr) !== "loss") return false;
      const closedAt = new Date(other.closedAt).getTime();
      const delta = opened - closedAt;
      return delta >= 0 && delta <= windowMs;
    });
    if (priorLoss) flagged.add(trade.id);
  }
  return [...flagged];
}

export function overtradingDays(trades: InsightTrade[]) {
  const byDay = new Map<string, InsightTrade[]>();
  trades.forEach((trade) => {
    const day = trade.openedAt.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), trade]);
  });
  return [...byDay.entries()]
    .filter(([, rows]) => rows.length > DAILY_TRADE_LIMIT)
    .map(([day, rows]) => ({ day, count: rows.length, tradeIds: rows.map((row) => row.id) }));
}

export function ruleBreakTradeIds(reviews: TradeReview[]) {
  return reviews.filter((review) => review.checklist.some((item) => !item.followed)).map((review) => review.tradeId);
}

export function buildInsights(
  trades: InsightTrade[],
  reviews: TradeReview[],
  filters?: { accountId?: string; from?: string; to?: string },
) {
  const filtered = trades.filter((trade) => {
    if (filters?.accountId && trade.accountId !== filters.accountId) return false;
    const stamp = trade.closedAt ?? trade.openedAt;
    if (filters?.from && stamp < filters.from) return false;
    if (filters?.to && stamp > `${filters.to}T23:59:59.999Z`) return false;
    return true;
  });
  const closed = filtered.filter(isClosedTrade);
  const revenge = revengeTrades(filtered);
  const over = overtradingDays(filtered);
  const breaks = ruleBreakTradeIds(reviews.filter((review) => closed.some((trade) => trade.id === review.tradeId)));

  return {
    closedCount: closed.length,
    winRate: winRate(filtered),
    lossRate: lossRate(filtered),
    breakevenRate: breakevenRate(filtered),
    averageR: averageR(filtered),
    expectancy: expectancy(filtered),
    totalPnl: totalPnl(filtered),
    equityCurve: equityCurve(filtered),
    maxDrawdown: maxDrawdown(filtered),
    currentDrawdown: currentDrawdown(filtered),
    belowDrawdownLine: belowDrawdownLine(filtered),
    byPlaybook: performanceByPlaybook(filtered),
    byInstrument: performanceByInstrument(filtered),
    bySession: performanceBySession(filtered),
    byWeekday: performanceByWeekday(filtered),
    disciplineScore: disciplineScore(reviews.filter((review) => closed.some((trade) => trade.id === review.tradeId))),
    flags: {
      revengeTradeIds: revenge,
      overtrading: over,
      ruleBreakTradeIds: breaks,
    },
  };
}
