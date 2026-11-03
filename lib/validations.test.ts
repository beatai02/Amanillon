import { describe, expect, it } from "vitest";
import { canGoLive, playbookActiveSchema } from "./validations";

describe("playbook status rules", () => {
  const complete = {
    name: "HTF sweep",
    approach: "conservative" as const,
    tradingStyle: "swing" as const,
    setupTypes: ["Supply & Demand"] as const,
    confluences: ["Price Action"],
    htf: ["D"] as const,
    intermediateTf: [] as const,
    entryTf: ["H1"] as const,
    checklist: "Mark supply",
    entryCriteria: "Rejection wick",
    exitCriteria: "Target or invalidation",
    slManagement: "Move to breakeven at 1R",
    riskPerTradePct: 1,
    avgPlannedRr: 2,
    plannedRPerYear: 20,
    prepStatus: "active" as const,
    usageStatus: "live" as const,
  };

  it("allows Live only when the playbook is Active", () => {
    expect(canGoLive("active")).toBe(true);
    expect(canGoLive("draft")).toBe(false);
    expect(playbookActiveSchema.safeParse(complete).success).toBe(true);
    expect(
      playbookActiveSchema.safeParse({ ...complete, prepStatus: "draft" }).success,
    ).toBe(false);
  });

  it("rejects Active when required fields are missing", () => {
    expect(
      playbookActiveSchema.safeParse({ ...complete, checklist: "" }).success,
    ).toBe(false);
  });
});
