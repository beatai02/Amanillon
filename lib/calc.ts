import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type Direction = "long" | "short";
export type RiskMode = "amount" | "percent";

function D(value: Decimal.Value) {
  return new Decimal(value);
}

export function directionSign(direction: Direction) {
  return direction === "long" ? 1 : -1;
}

/** F1 — absolute distance between entry and stop loss. */
export function stopDistance(entry: Decimal.Value, stopLoss: Decimal.Value) {
  return D(entry).minus(stopLoss).abs();
}

/** F2 — cash risk from a percent of account size, or the entered amount. */
export function riskAmount(input: {
  mode: RiskMode;
  accountSize: Decimal.Value;
  riskValue: Decimal.Value;
}) {
  if (input.mode === "percent") {
    return D(input.accountSize).times(input.riskValue).dividedBy(100);
  }
  return D(input.riskValue);
}

/** F3 — risk of one lot in the symbol's calculation currency. */
export function riskPerLot(stop: Decimal.Value, contractSize: Decimal.Value) {
  return D(stop).times(contractSize);
}

function roundDownToStep(value: Decimal, lotStep: Decimal.Value) {
  const step = D(lotStep);
  if (step.lte(0)) {
    throw new Error("lotStep must be greater than 0");
  }
  return value.dividedToIntegerBy(step).times(step);
}

/**
 * F4 — suggested quantity.
 * Rounds down to the lot step so the sized position stays inside the risk budget.
 */
export function suggestedQty(input: {
  riskAmount: Decimal.Value;
  stopDistance: Decimal.Value;
  contractSize: Decimal.Value;
  fx?: Decimal.Value;
  lotStep?: Decimal.Value;
}) {
  const fx = D(input.fx ?? 1);
  const lotStep = D(input.lotStep ?? 0.01);
  const perLot = riskPerLot(input.stopDistance, input.contractSize);
  const denominator = perLot.times(fx);
  if (denominator.lte(0)) {
    throw new Error("risk per lot must be greater than 0");
  }
  return roundDownToStep(D(input.riskAmount).dividedBy(denominator), lotStep);
}

/** F5 — planned reward-to-risk using take profit. */
export function plannedRR(input: {
  entry: Decimal.Value;
  stopLoss: Decimal.Value;
  takeProfit: Decimal.Value;
  direction: Direction;
}) {
  const stop = stopDistance(input.entry, input.stopLoss);
  if (stop.lte(0)) {
    throw new Error("stop distance must be greater than 0");
  }
  return D(input.takeProfit)
    .minus(input.entry)
    .times(directionSign(input.direction))
    .dividedBy(stop);
}

/** F6 — realized reward-to-risk using the exit price. */
export function actualRR(input: {
  entry: Decimal.Value;
  stopLoss: Decimal.Value;
  exitPrice: Decimal.Value;
  direction: Direction;
}) {
  const stop = stopDistance(input.entry, input.stopLoss);
  if (stop.lte(0)) {
    throw new Error("stop distance must be greater than 0");
  }
  return D(input.exitPrice)
    .minus(input.entry)
    .times(directionSign(input.direction))
    .dividedBy(stop);
}

/** F7 — gross P&L. Swaps and commissions are excluded. */
export function pnlGross(input: {
  entry: Decimal.Value;
  exitPrice: Decimal.Value;
  direction: Direction;
  quantity: Decimal.Value;
  contractSize: Decimal.Value;
  fx?: Decimal.Value;
}) {
  return D(input.exitPrice)
    .minus(input.entry)
    .times(directionSign(input.direction))
    .times(input.quantity)
    .times(input.contractSize)
    .times(input.fx ?? 1);
}

/** F8 — cash profit if take profit is hit. */
export function profitTarget(input: {
  entry: Decimal.Value;
  takeProfit: Decimal.Value;
  quantity: Decimal.Value;
  contractSize: Decimal.Value;
  fx?: Decimal.Value;
}) {
  return D(input.takeProfit)
    .minus(input.entry)
    .abs()
    .times(input.quantity)
    .times(input.contractSize)
    .times(input.fx ?? 1);
}

/** F9 — cash loss if the stop is hit. */
export function maxPlannedLoss(input: {
  entry: Decimal.Value;
  stopLoss: Decimal.Value;
  quantity: Decimal.Value;
  contractSize: Decimal.Value;
  fx?: Decimal.Value;
}) {
  return stopDistance(input.entry, input.stopLoss)
    .times(input.quantity)
    .times(input.contractSize)
    .times(input.fx ?? 1);
}

export function toNumber(value: Decimal, decimals = 2) {
  return value.toDecimalPlaces(decimals).toNumber();
}

export function computeTradeMetrics(input: {
  entry: Decimal.Value;
  stopLoss: Decimal.Value;
  takeProfit?: Decimal.Value | null;
  exitPrice?: Decimal.Value | null;
  direction: Direction;
  quantity: Decimal.Value;
  contractSize: Decimal.Value;
  fx?: Decimal.Value;
}) {
  const planned =
    input.takeProfit === null || input.takeProfit === undefined
      ? null
      : toNumber(
          plannedRR({
            entry: input.entry,
            stopLoss: input.stopLoss,
            takeProfit: input.takeProfit,
            direction: input.direction,
          }),
        );
  const actual =
    input.exitPrice === null || input.exitPrice === undefined
      ? null
      : toNumber(
          actualRR({
            entry: input.entry,
            stopLoss: input.stopLoss,
            exitPrice: input.exitPrice,
            direction: input.direction,
          }),
        );
  const pnl =
    input.exitPrice === null || input.exitPrice === undefined
      ? null
      : toNumber(
          pnlGross({
            entry: input.entry,
            exitPrice: input.exitPrice,
            direction: input.direction,
            quantity: input.quantity,
            contractSize: input.contractSize,
            fx: input.fx,
          }),
          2,
        );

  return {
    stopDistance: toNumber(stopDistance(input.entry, input.stopLoss), 8),
    plannedRr: planned,
    actualRr: actual,
    pnlGross: pnl,
    profitTarget:
      input.takeProfit === null || input.takeProfit === undefined
        ? null
        : toNumber(
            profitTarget({
              entry: input.entry,
              takeProfit: input.takeProfit,
              quantity: input.quantity,
              contractSize: input.contractSize,
              fx: input.fx,
            }),
          ),
    maxPlannedLoss: toNumber(
      maxPlannedLoss({
        entry: input.entry,
        stopLoss: input.stopLoss,
        quantity: input.quantity,
        contractSize: input.contractSize,
        fx: input.fx,
      }),
    ),
  };
}
