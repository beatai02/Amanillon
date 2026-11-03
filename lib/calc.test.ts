import { describe, expect, it } from "vitest";
import {
  actualRR,
  maxPlannedLoss,
  plannedRR,
  pnlGross,
  profitTarget,
  riskAmount,
  riskPerLot,
  stopDistance,
  suggestedQty,
  toNumber,
} from "./calc";

describe("F1 stop distance", () => {
  it("uses the absolute gap between entry and stop", () => {
    expect(stopDistance("1.91019", "1.898").toNumber()).toBeCloseTo(0.01219, 8);
    expect(stopDistance("1.898", "1.91019").toNumber()).toBeCloseTo(0.01219, 8);
  });
});

describe("F2 risk amount", () => {
  it("reproduces 2% of a 100K account as 2,000", () => {
    expect(
      riskAmount({ mode: "percent", accountSize: 100_000, riskValue: 2 }).toNumber(),
    ).toBe(2000);
  });

  it("returns the entered amount in amount mode", () => {
    expect(
      riskAmount({ mode: "amount", accountSize: 100_000, riskValue: 3000 }).toNumber(),
    ).toBe(3000);
  });
});

describe("F3–F4 position sizing (GBPAUD)", () => {
  const stop = stopDistance("1.91019", "1.898");
  const contractSize = 100_000;
  const fx = 0.7;

  it("computes risk per lot in the calculation currency", () => {
    expect(riskPerLot(stop, contractSize).toNumber()).toBeCloseTo(1219, 6);
  });

  it("suggests about 2.34–2.35 lots and rounds down to the lot step", () => {
    const qty = suggestedQty({
      riskAmount: 2000,
      stopDistance: stop,
      contractSize,
      fx,
      lotStep: 0.01,
    });
    expect(qty.toNumber()).toBeGreaterThanOrEqual(2.34);
    expect(qty.toNumber()).toBeLessThanOrEqual(2.35);
    expect(qty.toNumber()).toBe(2.34);
  });
});

describe("F5 planned RR — GBPAUD", () => {
  it("reproduces RR 2.59", () => {
    const rr = plannedRR({
      entry: "1.91019",
      stopLoss: "1.898",
      takeProfit: "1.9418",
      direction: "long",
    });
    expect(toNumber(rr, 2)).toBe(2.59);
  });
});

describe("F5–F6 Silver trade", () => {
  const levels = {
    entry: "72.481",
    stopLoss: "69.078",
    direction: "long" as const,
  };

  it("reproduces planned 0.74R", () => {
    const rr = plannedRR({ ...levels, takeProfit: "75.000" });
    expect(toNumber(rr, 2)).toBe(0.74);
  });

  it("reproduces actual 0.71R", () => {
    const rr = actualRR({ ...levels, exitPrice: "74.892" });
    expect(toNumber(rr, 2)).toBe(0.71);
  });
});

describe("F7–F9 P&L helpers", () => {
  it("scales WTI P&L from 1,164 to 11,640 when contract size goes 1,000 → 10,000", () => {
    const shared = {
      entry: 70,
      exitPrice: 75.82,
      direction: "long" as const,
      quantity: 0.2,
      fx: 1,
    };
    expect(toNumber(pnlGross({ ...shared, contractSize: 1000 }))).toBe(1164);
    expect(toNumber(pnlGross({ ...shared, contractSize: 10_000 }))).toBe(11640);
  });

  it("computes profit target and max planned loss", () => {
    expect(
      toNumber(
        profitTarget({
          entry: 100,
          takeProfit: 110,
          quantity: 1,
          contractSize: 10,
          fx: 1,
        }),
      ),
    ).toBe(100);
    expect(
      toNumber(
        maxPlannedLoss({
          entry: 100,
          stopLoss: 95,
          quantity: 1,
          contractSize: 10,
          fx: 1,
        }),
      ),
    ).toBe(50);
  });
});
