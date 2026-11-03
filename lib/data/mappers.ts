import type { Playbook, PlaybookImage, PlaybookSnapshot, SymbolRow, Trade, TradingAccount } from "@/lib/types";

export function mapAccount(row: Record<string, unknown>): TradingAccount {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    accountType: row.account_type as TradingAccount["accountType"],
    size: Number(row.size),
    currency: String(row.currency ?? "USD"),
    allowedRiskPct: Number(row.allowed_risk_pct),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  };
}

export function mapSymbol(row: Record<string, unknown>): SymbolRow {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    assetClass: String(row.asset_class),
    isFutures: Boolean(row.is_futures),
    contractSize: Number(row.contract_size),
    lotStep: Number(row.lot_step),
    calcCurrency: String(row.calc_currency),
  };
}

export function mapPlaybookImage(row: Record<string, unknown>): PlaybookImage {
  return {
    id: String(row.id),
    playbookId: String(row.playbook_id),
    storagePath: String(row.storage_path),
    sort: Number(row.sort ?? 0),
  };
}

export function mapPlaybook(
  row: Record<string, unknown>,
  images: PlaybookImage[] = [],
  tradeCount = 0,
): Playbook {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    approach: (row.approach as Playbook["approach"]) ?? null,
    tradingStyle: (row.trading_style as Playbook["tradingStyle"]) ?? null,
    setupTypes: (row.setup_types as string[]) ?? [],
    confluences: (row.confluences as string[]) ?? [],
    htf: (row.htf as string[]) ?? [],
    intermediateTf: (row.intermediate_tf as string[]) ?? [],
    entryTf: (row.entry_tf as string[]) ?? [],
    checklist: (row.checklist as string) ?? null,
    entryCriteria: (row.entry_criteria as string) ?? null,
    exitCriteria: (row.exit_criteria as string) ?? null,
    slManagement: (row.sl_management as string) ?? null,
    riskPerTradePct: row.risk_per_trade_pct == null ? null : Number(row.risk_per_trade_pct),
    avgPlannedRr: row.avg_planned_rr == null ? null : Number(row.avg_planned_rr),
    plannedRPerYear: row.planned_r_per_year == null ? null : Number(row.planned_r_per_year),
    prepStatus: row.prep_status as Playbook["prepStatus"],
    usageStatus: row.usage_status as Playbook["usageStatus"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    images,
    tradeCount,
  };
}

export function toSnapshot(playbook: Playbook): PlaybookSnapshot {
  return {
    id: playbook.id,
    name: playbook.name,
    approach: playbook.approach,
    tradingStyle: playbook.tradingStyle,
    setupTypes: playbook.setupTypes,
    confluences: playbook.confluences,
    htf: playbook.htf,
    intermediateTf: playbook.intermediateTf,
    entryTf: playbook.entryTf,
    checklist: playbook.checklist,
    entryCriteria: playbook.entryCriteria,
    exitCriteria: playbook.exitCriteria,
    slManagement: playbook.slManagement,
    riskPerTradePct: playbook.riskPerTradePct,
    avgPlannedRr: playbook.avgPlannedRr,
    plannedRPerYear: playbook.plannedRPerYear,
    prepStatus: playbook.prepStatus,
    usageStatus: playbook.usageStatus,
  };
}

export function mapTrade(
  row: Record<string, unknown>,
  extras?: { account?: TradingAccount | null; symbol?: SymbolRow | null },
): Trade {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: row.account_id ? String(row.account_id) : null,
    playbookId: row.playbook_id ? String(row.playbook_id) : null,
    playbookSnapshot: row.playbook_snapshot as Trade["playbookSnapshot"],
    symbolId: row.symbol_id ? String(row.symbol_id) : null,
    direction: row.direction as Trade["direction"],
    status: row.status as Trade["status"],
    htf: (row.htf as string[]) ?? [],
    entryTf: (row.entry_tf as string[]) ?? [],
    entry: Number(row.entry),
    stopLoss: Number(row.stop_loss),
    takeProfit: row.take_profit == null ? null : Number(row.take_profit),
    exitPrice: row.exit_price == null ? null : Number(row.exit_price),
    quantity: Number(row.quantity),
    riskMode: (row.risk_mode as Trade["riskMode"]) ?? null,
    riskValue: row.risk_value == null ? null : Number(row.risk_value),
    riskAmount: row.risk_amount == null ? null : Number(row.risk_amount),
    contractSizeUsed: row.contract_size_used == null ? null : Number(row.contract_size_used),
    fxRateUsed: row.fx_rate_used == null ? null : Number(row.fx_rate_used),
    plannedRr: row.planned_rr == null ? null : Number(row.planned_rr),
    actualRr: row.actual_rr == null ? null : Number(row.actual_rr),
    pnlGross: row.pnl_gross == null ? null : Number(row.pnl_gross),
    reasoning: (row.reasoning as string) ?? null,
    notes: (row.notes as string) ?? null,
    openedAt: String(row.opened_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    closingEvidencePath: row.closing_evidence_path ? String(row.closing_evidence_path) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    account: extras?.account ?? null,
    symbol: extras?.symbol ?? null,
  };
}
