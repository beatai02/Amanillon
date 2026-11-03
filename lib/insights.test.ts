import { describe, expect, it } from "vitest";
import {
  BREAKEVEN_R_ABS,
  DAILY_TRADE_LIMIT,
  DRAWDOWN_LINE,
  REVENGE_WINDOW_MINUTES,
  WIN_R_THRESHOLD,
} from "./config";
import {
  averageR,
  belowDrawdownLine,
  breakevenRate,
  buildInsights,
  checklistFromSnapshot,
  classifyOutcome,
  currentDrawdown,
  disciplineScore,
  equityCurve,
  expectancy,
  lossRate,
  maxDrawdown,
  overtradingDays,
  performanceByInstrument,
  performanceByPlaybook,
  performanceBySession,
  performanceByWeekday,
  revengeTrades,
  ruleBreakTradeIds,
  sessionFromIso,
  totalPnl,
  winRate,
} from "./insights";
import type { Trade, TradeReview } from "./types";

const snapshot = {
  id: "pb-a",
  name: "HTF Supply Sweep",
  approach: "conservative" as const,
  tradingStyle: "swing" as const,
  setupTypes: [],
  confluences: [],
  htf: ["D"],
  intermediateTf: [],
  entryTf: ["H1"],
  checklist: "Mark supply\nWait for the sweep",
  entryCriteria: "Rejection close",
  exitCriteria: "Target or invalidation",
  slManagement: "Breakeven at 1R",
  riskPerTradePct: 2,
  avgPlannedRr: 2,
  plannedRPerYear: 40,
  prepStatus: "active" as const,
  usageStatus: "live" as const,
};

function trade(partial: Partial<Trade> & Pick<Trade, "id" | "actualRr" | "pnlGross" | "openedAt" | "closedAt">): Trade {
  return {
    userId: "u1",
    accountId: "acc-1",
    playbookId: "pb-a",
    playbookSnapshot: snapshot,
    symbolId: "sym-eurusd",
    direction: "long",
    status: "trade_close_with_profit",
    htf: ["D"],
    entryTf: ["H1"],
    entry: 1,
    stopLoss: 0.9,
    takeProfit: 1.2,
    exitPrice: 1.1,
    quantity: 1,
    riskMode: "percent",
    riskValue: 1,
    riskAmount: 1000,
    contractSizeUsed: 100000,
    fxRateUsed: 1,
    plannedRr: 2,
    reasoning: null,
    notes: null,
    closingEvidencePath: null,
    createdAt: partial.openedAt,
    updatedAt: partial.closedAt ?? partial.openedAt,
    symbol: { id: "sym-eurusd", code: "EURUSD", name: "Euro", assetClass: "forex", isFutures: false, contractSize: 100000, lotStep: 0.01, calcCurrency: "USD" },
    ...partial,
  };
}

const fixture: Trade[] = [
  trade({ id: "t1", actualRr: 2, pnlGross: 200, openedAt: "2026-01-05T08:30:00.000Z", closedAt: "2026-01-05T10:00:00.000Z" }),
  trade({ id: "t2", actualRr: -1, pnlGross: -100, status: "trade_sl_hit", openedAt: "2026-01-05T10:05:00.000Z", closedAt: "2026-01-05T14:00:00.000Z" }),
  trade({ id: "t3", actualRr: 0.05, pnlGross: 5, status: "trade_exit_in_mid", openedAt: "2026-01-05T12:00:00.000Z", closedAt: "2026-01-05T12:30:00.000Z" }),
  trade({ id: "t4", actualRr: -0.5, pnlGross: -50, status: "trade_sl_hit", openedAt: "2026-01-05T13:00:00.000Z", closedAt: "2026-01-05T16:00:00.000Z" }),
  trade({ id: "t5", actualRr: 1, pnlGross: 100, openedAt: "2026-01-05T16:10:00.000Z", closedAt: "2026-01-05T17:00:00.000Z" }),
  trade({ id: "t6", actualRr: 0.4, pnlGross: 40, openedAt: "2026-01-05T18:00:00.000Z", closedAt: "2026-01-05T19:00:00.000Z" }),
];

const reviews: TradeReview[] = [
  {
    tradeId: "t1",
    userId: "u1",
    checklist: [
      { id: "a", label: "Mark supply", followed: true },
      { id: "b", label: "Wait for the sweep", followed: true },
      { id: "c", label: "Entry", followed: true },
      { id: "d", label: "Stop", followed: true },
    ],
    emotions: ["Confidence"],
    mistakes: [],
    lessons: "Let the sweep finish.",
    rating: 5,
    updatedAt: "2026-01-05T18:00:00.000Z",
  },
  {
    tradeId: "t2",
    userId: "u1",
    checklist: [
      { id: "a", label: "Mark supply", followed: true },
      { id: "b", label: "Wait for the sweep", followed: false },
      { id: "c", label: "Entry", followed: true },
      { id: "d", label: "Stop", followed: false },
    ],
    emotions: ["FOMO"],
    mistakes: ["Early entry"],
    lessons: "Do not chase.",
    rating: 2,
    updatedAt: "2026-01-05T18:10:00.000Z",
  },
];

describe("defaults", () => {
  it("keeps the documented open-question defaults", () => {
    expect(WIN_R_THRESHOLD).toBe(0);
    expect(BREAKEVEN_R_ABS).toBe(0.1);
    expect(REVENGE_WINDOW_MINUTES).toBe(15);
    expect(DAILY_TRADE_LIMIT).toBe(5);
    expect(DRAWDOWN_LINE).toBe(-2000);
  });
});

describe("classifyOutcome", () => {
  it("treats |R| < 0.1 as breakeven even when R is slightly positive", () => {
    expect(classifyOutcome(0.05)).toBe("breakeven");
    expect(classifyOutcome(-0.09)).toBe("breakeven");
    expect(classifyOutcome(0)).toBe("breakeven");
  });

  it("treats actual R > 0 outside the band as a win", () => {
    expect(classifyOutcome(0.2)).toBe("win");
    expect(classifyOutcome(2)).toBe("win");
  });

  it("treats actual R < 0 outside the band as a loss", () => {
    expect(classifyOutcome(-0.2)).toBe("loss");
  });
});

describe("closed-trade rates and R", () => {
  it("computes win / loss / breakeven rates from the fixture", () => {
    expect(winRate(fixture)).toBeCloseTo(3 / 6);
    expect(lossRate(fixture)).toBeCloseTo(2 / 6);
    expect(breakevenRate(fixture)).toBeCloseTo(1 / 6);
  });

  it("computes average R and expectancy as the mean of actual R", () => {
    const mean = (2 - 1 + 0.05 - 0.5 + 1 + 0.4) / 6;
    expect(averageR(fixture)).toBeCloseTo(mean);
    expect(expectancy(fixture)).toBeCloseTo(mean);
  });

  it("sums P&L in account currency", () => {
    expect(totalPnl(fixture)).toBe(195);
  });
});

describe("equity curve and drawdown", () => {
  it("builds a running equity curve in account currency", () => {
    const curve = equityCurve(fixture);
    expect(curve.map((point) => point.tradeId)).toEqual(["t1", "t3", "t2", "t4", "t5", "t6"]);
    expect(curve.map((point) => point.equity)).toEqual([200, 205, 105, 55, 155, 195]);
  });

  it("measures max and current drawdown from the equity peak", () => {
    expect(maxDrawdown(fixture)).toBe(-150);
    expect(currentDrawdown(fixture)).toBe(-10);
    expect(belowDrawdownLine(fixture)).toBe(false);
  });
});

describe("performance groupings", () => {
  it("groups by playbook and instrument", () => {
    expect(performanceByPlaybook(fixture)[0]?.key).toBe("HTF Supply Sweep");
    expect(performanceByInstrument(fixture)[0]?.key).toBe("EURUSD");
    expect(performanceByInstrument(fixture)[0]?.count).toBe(6);
  });

  it("groups by session and weekday from the open time", () => {
    expect(sessionFromIso("2026-01-05T08:30:00.000Z")).toBe("London");
    expect(sessionFromIso("2026-01-05T16:10:00.000Z")).toBe("New York");
    expect(performanceBySession(fixture).some((row) => row.key === "London")).toBe(true);
    expect(performanceByWeekday(fixture)[0]?.key).toBe("Monday");
  });
});

describe("discipline and behaviour flags", () => {
  it("scores discipline as % of checklist items followed", () => {
    expect(disciplineScore(reviews)).toBe(75);
  });

  it("flags a trade opened within 15 minutes of a losing close", () => {
    expect(revengeTrades(fixture)).toEqual(["t5"]);
  });

  it("flags a UTC day that exceeds the daily trade limit", () => {
    const days = overtradingDays(fixture);
    expect(days).toHaveLength(1);
    expect(days[0]?.count).toBe(6);
    expect(days[0]?.day).toBe("2026-01-05");
  });

  it("flags reviews that skipped a checklist item", () => {
    expect(ruleBreakTradeIds(reviews)).toEqual(["t2"]);
  });
});

describe("checklistFromSnapshot", () => {
  it("turns snapshot text into review checklist rows", () => {
    const items = checklistFromSnapshot(snapshot);
    expect(items.map((item) => item.id)).toEqual(["line-0", "line-1", "entry", "exit", "sl"]);
  });
});

describe("buildInsights", () => {
  it("returns the same KPI set used on the dashboard", () => {
    const insights = buildInsights(fixture, reviews);
    expect(insights.closedCount).toBe(6);
    expect(insights.totalPnl).toBe(195);
    expect(insights.flags.revengeTradeIds).toEqual(["t5"]);
    expect(insights.disciplineScore).toBe(75);
  });
});
