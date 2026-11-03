import { computeTradeMetrics } from "@/lib/calc";
import { CLOSED_STATUSES } from "@/lib/constants";
import { isDemoSession } from "@/lib/mode";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { JournalFilters, JournalTab, Playbook, PlaybookSnapshot, SessionUser, SymbolRow, Trade, TradingAccount } from "@/lib/types";
import { playbookActiveSchema, tradeSchema, type AccountInput, type PlaybookDraftInput } from "@/lib/validations";
import { mapAccount, mapPlaybook, mapPlaybookImage, mapSymbol, mapTrade, toSnapshot } from "./mappers";
import { demoUserId, readDemoState, writeDemoState } from "./demo-store";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

export async function currentUser(): Promise<SessionUser | null> {
  if (await isDemoSession()) {
    return { id: demoUserId(), email: "trader@example.com", displayName: "Alex" };
  }
  if (!supabaseConfigured()) return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    displayName:
      (data.user.user_metadata?.display_name as string | undefined) ??
      data.user.email?.split("@")[0] ??
      "Trader",
  };
}

function matchesJournal(trade: Trade, tab: JournalTab, filters: JournalFilters) {
  if (tab === "open" && !["entry_planned", "entry_placed", "entry_triggered"].includes(trade.status)) {
    return false;
  }
  if (tab === "closed" && !CLOSED_STATUSES.includes(trade.status as (typeof CLOSED_STATUSES)[number])) {
    return false;
  }
  if (tab === "missed" && trade.status !== "entry_missed") return false;
  if (tab === "cancelled" && trade.status !== "entry_cancelled") return false;
  if (filters.accountId && trade.accountId !== filters.accountId) return false;
  if (filters.playbookId && trade.playbookId !== filters.playbookId) return false;
  if (filters.assetClass && trade.symbol?.assetClass !== filters.assetClass) return false;
  if (filters.from && trade.openedAt < filters.from) return false;
  if (filters.to && trade.openedAt > `${filters.to}T23:59:59.999Z`) return false;
  return true;
}

export async function listAccounts(): Promise<TradingAccount[]> {
  if (await isDemoSession()) {
    return readDemoState().accounts;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapAccount(row));
}

export async function createAccount(input: AccountInput) {
  if (await isDemoSession()) {
    const state = readDemoState();
    const account: TradingAccount = {
      id: newId(),
      userId: demoUserId(),
      name: input.name,
      accountType: input.accountType,
      size: input.size,
      currency: input.currency ?? "USD",
      allowedRiskPct: input.allowedRiskPct,
      isActive: input.isActive ?? true,
      createdAt: nowIso(),
    };
    state.accounts.push(account);
    writeDemoState(state);
    return account;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("trading_accounts")
    .insert({
      name: input.name,
      account_type: input.accountType,
      size: input.size,
      currency: input.currency ?? "USD",
      allowed_risk_pct: input.allowedRiskPct,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapAccount(data);
}

export async function updateAccount(id: string, input: AccountInput) {
  if (await isDemoSession()) {
    const state = readDemoState();
    const account = state.accounts.find((row) => row.id === id);
    if (!account) throw new Error("Account not found");
    Object.assign(account, {
      name: input.name,
      accountType: input.accountType,
      size: input.size,
      currency: input.currency ?? account.currency,
      allowedRiskPct: input.allowedRiskPct,
      isActive: input.isActive ?? account.isActive,
    });
    writeDemoState(state);
    return account;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("trading_accounts")
    .update({
      name: input.name,
      account_type: input.accountType,
      size: input.size,
      currency: input.currency,
      allowed_risk_pct: input.allowedRiskPct,
      is_active: input.isActive,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapAccount(data);
}

export async function deleteAccount(id: string) {
  if (await isDemoSession()) {
    const state = readDemoState();
    state.accounts = state.accounts.filter((row) => row.id !== id);
    writeDemoState(state);
    return;
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("trading_accounts").delete().eq("id", id);
  if (error) throw error;
}

export async function listSymbols(): Promise<SymbolRow[]> {
  if (await isDemoSession()) {
    return readDemoState().symbols;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("symbols").select("*").order("code");
  if (error) throw error;
  return (data ?? []).map((row) => mapSymbol(row));
}

export async function listPlaybooks(): Promise<Playbook[]> {
  if (await isDemoSession()) {
    const state = readDemoState();
    return state.playbooks.map((playbook) => ({
      ...playbook,
      tradeCount: state.trades.filter((trade) => trade.playbookId === playbook.id).length,
    }));
  }
  const supabase = await createServerSupabase();
  const [{ data, error }, counts] = await Promise.all([
    supabase.from("playbooks").select("*, playbook_images(*)").order("updated_at", { ascending: false }),
    supabase.from("trades").select("playbook_id"),
  ]);
  if (error) throw error;
  const countMap = new Map<string, number>();
  (counts.data ?? []).forEach((row) => {
    if (!row.playbook_id) return;
    countMap.set(row.playbook_id, (countMap.get(row.playbook_id) ?? 0) + 1);
  });
  const playbooks = (data ?? []).map((row) => {
    const images = ((row.playbook_images as Record<string, unknown>[]) ?? []).map(mapPlaybookImage);
    return mapPlaybook(row, images, countMap.get(row.id) ?? 0);
  });
  const storagePaths = playbooks.flatMap((playbook) =>
    playbook.images.map((image) => image.storagePath).filter((path) => !path.startsWith("data:")),
  );
  if (storagePaths.length) {
    const signed = await supabase.storage.from("playbook-evidence").createSignedUrls(storagePaths, 3600);
    const urlMap = new Map(
      (signed.data ?? []).map((item) => [item.path, item.signedUrl] as const),
    );
    playbooks.forEach((playbook) => {
      playbook.images = playbook.images.map((image) => ({
        ...image,
        signedUrl: urlMap.get(image.storagePath) ?? image.signedUrl,
      }));
    });
  }
  return playbooks;
}

export async function getPlaybook(id: string) {
  const playbooks = await listPlaybooks();
  return playbooks.find((playbook) => playbook.id === id) ?? null;
}

function playbookWritePayload(input: PlaybookDraftInput) {
  return {
    name: input.name || "Untitled playbook",
    approach: input.approach ?? null,
    trading_style: input.tradingStyle ?? null,
    setup_types: input.setupTypes ?? [],
    confluences: input.confluences ?? [],
    htf: input.htf ?? [],
    intermediate_tf: input.intermediateTf ?? [],
    entry_tf: input.entryTf ?? [],
    checklist: input.checklist ?? null,
    entry_criteria: input.entryCriteria ?? null,
    exit_criteria: input.exitCriteria ?? null,
    sl_management: input.slManagement ?? null,
    risk_per_trade_pct: input.riskPerTradePct ?? null,
    avg_planned_rr: input.avgPlannedRr ?? null,
    planned_r_per_year: input.plannedRPerYear ?? null,
    prep_status: input.prepStatus ?? "draft",
    usage_status: input.usageStatus ?? "not_using",
  };
}

export async function savePlaybook(id: string | null, input: PlaybookDraftInput) {
  if ((input.prepStatus ?? "draft") === "active" || input.usageStatus === "live") {
    const parsed = playbookActiveSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Playbook is incomplete");
    }
  }

  if (await isDemoSession()) {
    const state = readDemoState();
    const timestamp = nowIso();
    if (id) {
      const existing = state.playbooks.find((row) => row.id === id);
      if (!existing) throw new Error("Playbook not found");
      Object.assign(existing, {
        name: input.name || existing.name,
        approach: input.approach ?? existing.approach,
        tradingStyle: input.tradingStyle ?? existing.tradingStyle,
        setupTypes: input.setupTypes ?? existing.setupTypes,
        confluences: input.confluences ?? existing.confluences,
        htf: input.htf ?? existing.htf,
        intermediateTf: input.intermediateTf ?? existing.intermediateTf,
        entryTf: input.entryTf ?? existing.entryTf,
        checklist: input.checklist ?? existing.checklist,
        entryCriteria: input.entryCriteria ?? existing.entryCriteria,
        exitCriteria: input.exitCriteria ?? existing.exitCriteria,
        slManagement: input.slManagement ?? existing.slManagement,
        riskPerTradePct: input.riskPerTradePct ?? existing.riskPerTradePct,
        avgPlannedRr: input.avgPlannedRr ?? existing.avgPlannedRr,
        plannedRPerYear: input.plannedRPerYear ?? existing.plannedRPerYear,
        prepStatus: input.prepStatus ?? existing.prepStatus,
        usageStatus: input.usageStatus ?? existing.usageStatus,
        updatedAt: timestamp,
      });
      writeDemoState(state);
      return existing;
    }
    const created: Playbook = {
      id: newId(),
      userId: demoUserId(),
      name: input.name || "Untitled playbook",
      approach: input.approach ?? null,
      tradingStyle: input.tradingStyle ?? null,
      setupTypes: input.setupTypes ?? [],
      confluences: input.confluences ?? [],
      htf: input.htf ?? [],
      intermediateTf: input.intermediateTf ?? [],
      entryTf: input.entryTf ?? [],
      checklist: input.checklist ?? null,
      entryCriteria: input.entryCriteria ?? null,
      exitCriteria: input.exitCriteria ?? null,
      slManagement: input.slManagement ?? null,
      riskPerTradePct: input.riskPerTradePct ?? null,
      avgPlannedRr: input.avgPlannedRr ?? null,
      plannedRPerYear: input.plannedRPerYear ?? null,
      prepStatus: input.prepStatus ?? "draft",
      usageStatus: input.usageStatus ?? "not_using",
      createdAt: timestamp,
      updatedAt: timestamp,
      images: [],
    };
    state.playbooks.unshift(created);
    writeDemoState(state);
    return created;
  }

  const supabase = await createServerSupabase();
  const payload = playbookWritePayload(input);
  if (id) {
    const { data, error } = await supabase.from("playbooks").update(payload).eq("id", id).select("*").single();
    if (error) throw error;
    return mapPlaybook(data);
  }
  const { data, error } = await supabase.from("playbooks").insert(payload).select("*").single();
  if (error) throw error;
  return mapPlaybook(data);
}

export async function deletePlaybook(id: string) {
  if (await isDemoSession()) {
    const state = readDemoState();
    if (state.trades.some((trade) => trade.playbookId === id)) {
      throw new Error("This playbook has journaled trades. Mark it Not using instead of deleting it.");
    }
    state.playbooks = state.playbooks.filter((row) => row.id !== id);
    writeDemoState(state);
    return;
  }
  const supabase = await createServerSupabase();
  const { count } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("playbook_id", id);
  if ((count ?? 0) > 0) {
    throw new Error("This playbook has journaled trades. Mark it Not using instead of deleting it.");
  }
  const { error } = await supabase.from("playbooks").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicatePlaybook(id: string) {
  const source = await getPlaybook(id);
  if (!source) throw new Error("Playbook not found");
  return savePlaybook(null, {
    name: `${source.name} copy`,
    approach: source.approach ?? undefined,
    tradingStyle: source.tradingStyle ?? undefined,
    setupTypes: source.setupTypes as PlaybookDraftInput["setupTypes"],
    confluences: source.confluences,
    htf: source.htf as PlaybookDraftInput["htf"],
    intermediateTf: source.intermediateTf as PlaybookDraftInput["intermediateTf"],
    entryTf: source.entryTf as PlaybookDraftInput["entryTf"],
    checklist: source.checklist ?? "",
    entryCriteria: source.entryCriteria ?? "",
    exitCriteria: source.exitCriteria ?? "",
    slManagement: source.slManagement ?? "",
    riskPerTradePct: source.riskPerTradePct,
    avgPlannedRr: source.avgPlannedRr,
    plannedRPerYear: source.plannedRPerYear,
    prepStatus: "draft",
    usageStatus: "not_using",
  });
}

export async function addPlaybookImage(playbookId: string, storagePath: string) {
  if (await isDemoSession()) {
    const state = readDemoState();
    const playbook = state.playbooks.find((row) => row.id === playbookId);
    if (!playbook) throw new Error("Playbook not found");
    if (playbook.images.length >= 5) throw new Error("A playbook can have at most 5 evidence images");
    const image = {
      id: newId(),
      playbookId,
      storagePath,
      sort: playbook.images.length,
    };
    playbook.images.push(image);
    playbook.updatedAt = nowIso();
    writeDemoState(state);
    return image;
  }
  const user = await currentUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("playbook_images")
    .insert({ playbook_id: playbookId, storage_path: storagePath, user_id: user?.id, sort: 0 })
    .select("*")
    .single();
  if (error) throw error;
  return mapPlaybookImage(data);
}

export async function removePlaybookImage(imageId: string, playbookId: string) {
  if (await isDemoSession()) {
    const state = readDemoState();
    const playbook = state.playbooks.find((row) => row.id === playbookId);
    if (!playbook) return;
    playbook.images = playbook.images.filter((image) => image.id !== imageId);
    writeDemoState(state);
    return;
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("playbook_images").delete().eq("id", imageId);
  if (error) throw error;
}

export async function listTrades(tab: JournalTab, filters: JournalFilters = {}): Promise<Trade[]> {
  if (await isDemoSession()) {
    const state = readDemoState();
    return state.trades
      .map((trade) => ({
        ...trade,
        account: state.accounts.find((account) => account.id === trade.accountId) ?? null,
        symbol: state.symbols.find((symbol) => symbol.id === trade.symbolId) ?? null,
      }))
      .filter((trade) => matchesJournal(trade, tab, filters))
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  }

  const supabase = await createServerSupabase();
  let query = supabase
    .from("trades")
    .select("*, trading_accounts(*), symbols(*)")
    .order("opened_at", { ascending: false });

  if (tab === "open") query = query.in("status", ["entry_planned", "entry_placed", "entry_triggered"]);
  if (tab === "closed") query = query.in("status", [...CLOSED_STATUSES]);
  if (tab === "missed") query = query.eq("status", "entry_missed");
  if (tab === "cancelled") query = query.eq("status", "entry_cancelled");
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.playbookId) query = query.eq("playbook_id", filters.playbookId);
  if (filters.from) query = query.gte("opened_at", filters.from);
  if (filters.to) query = query.lte("opened_at", `${filters.to}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? [])
    .map((row) =>
      mapTrade(row, {
        account: row.trading_accounts ? mapAccount(row.trading_accounts as Record<string, unknown>) : null,
        symbol: row.symbols ? mapSymbol(row.symbols as Record<string, unknown>) : null,
      }),
    )
    .filter((trade) => !filters.assetClass || trade.symbol?.assetClass === filters.assetClass);
}

export async function countTradesByTab() {
  const tabs: JournalTab[] = ["open", "closed", "missed", "cancelled"];
  const counts = await Promise.all(tabs.map(async (tab) => [tab, (await listTrades(tab)).length] as const));
  return Object.fromEntries(counts) as Record<JournalTab, number>;
}

export async function getTrade(id: string) {
  if (await isDemoSession()) {
    const state = readDemoState();
    const trade = state.trades.find((row) => row.id === id);
    if (!trade) return null;
    return {
      ...trade,
      account: state.accounts.find((account) => account.id === trade.accountId) ?? null,
      symbol: state.symbols.find((symbol) => symbol.id === trade.symbolId) ?? null,
    };
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("trades")
    .select("*, trading_accounts(*), symbols(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapTrade(data, {
    account: data.trading_accounts ? mapAccount(data.trading_accounts as Record<string, unknown>) : null,
    symbol: data.symbols ? mapSymbol(data.symbols as Record<string, unknown>) : null,
  });
}

export async function saveTrade(id: string | null, raw: unknown) {
  const parsed = tradeSchema.parse(raw);
  const [playbook, account, symbols] = await Promise.all([
    getPlaybook(parsed.playbookId),
    listAccounts().then((rows) => rows.find((row) => row.id === parsed.accountId) ?? null),
    listSymbols(),
  ]);
  if (!playbook) throw new Error("Playbook not found");
  if (playbook.usageStatus !== "live") throw new Error("Only a Live playbook can be used for a new trade");
  if (!account) throw new Error("Account not found");
  const symbol = symbols.find((row) => row.id === parsed.symbolId);
  if (!symbol) throw new Error("Symbol not found");

  const riskAmt =
    parsed.riskMode === "percent" ? (account.size * parsed.riskValue) / 100 : parsed.riskValue;
  const exitPrice =
    parsed.status === "trade_sl_hit" ? (parsed.exitPrice ?? parsed.stopLoss) : (parsed.exitPrice ?? null);
  const closed = CLOSED_STATUSES.includes(parsed.status as (typeof CLOSED_STATUSES)[number]);
  const metrics = computeTradeMetrics({
    entry: parsed.entry,
    stopLoss: parsed.stopLoss,
    takeProfit: parsed.takeProfit,
    exitPrice,
    direction: parsed.direction,
    quantity: parsed.quantity,
    contractSize: symbol.contractSize,
    fx: symbol.calcCurrency === account.currency ? 1 : symbol.code === "GBPAUD" ? 0.7 : 1,
  });
  const snapshot: PlaybookSnapshot = toSnapshot(playbook);
  const fx = symbol.calcCurrency === account.currency ? 1 : symbol.code === "GBPAUD" ? 0.7 : 1;

  if (await isDemoSession()) {
    const state = readDemoState();
    const payload: Trade = {
      id: id ?? newId(),
      userId: demoUserId(),
      accountId: account.id,
      playbookId: playbook.id,
      playbookSnapshot: snapshot,
      symbolId: symbol.id,
      direction: parsed.direction,
      status: parsed.status,
      htf: parsed.htf,
      entryTf: parsed.entryTf,
      entry: parsed.entry,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit ?? null,
      exitPrice,
      quantity: parsed.quantity,
      riskMode: parsed.riskMode,
      riskValue: parsed.riskValue,
      riskAmount: riskAmt,
      contractSizeUsed: symbol.contractSize,
      fxRateUsed: fx,
      plannedRr: metrics.plannedRr,
      actualRr: metrics.actualRr,
      pnlGross: metrics.pnlGross,
      reasoning: parsed.reasoning ?? null,
      openedAt: new Date(parsed.openedAt).toISOString(),
      closedAt: closed ? new Date(parsed.closedAt || Date.now()).toISOString() : null,
      closingEvidencePath: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      account,
      symbol,
    };
    const index = state.trades.findIndex((row) => row.id === payload.id);
    if (index >= 0) state.trades[index] = payload;
    else state.trades.unshift(payload);
    writeDemoState(state);
    return payload;
  }

  const supabase = await createServerSupabase();
  const row = {
    account_id: account.id,
    playbook_id: playbook.id,
    playbook_snapshot: snapshot,
    symbol_id: symbol.id,
    direction: parsed.direction,
    status: parsed.status,
    htf: parsed.htf,
    entry_tf: parsed.entryTf,
    entry: parsed.entry,
    stop_loss: parsed.stopLoss,
    take_profit: parsed.takeProfit ?? null,
    exit_price: exitPrice,
    quantity: parsed.quantity,
    risk_mode: parsed.riskMode,
    risk_value: parsed.riskValue,
    risk_amount: riskAmt,
    contract_size_used: symbol.contractSize,
    fx_rate_used: fx,
    reasoning: parsed.reasoning ?? null,
    opened_at: new Date(parsed.openedAt).toISOString(),
    closed_at: closed ? new Date(parsed.closedAt || Date.now()).toISOString() : null,
  };
  const query = id
    ? supabase.from("trades").update(row).eq("id", id)
    : supabase.from("trades").insert(row);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return mapTrade(data, { account, symbol });
}

export async function deleteTrade(id: string) {
  if (await isDemoSession()) {
    const state = readDemoState();
    state.trades = state.trades.filter((row) => row.id !== id);
    writeDemoState(state);
    return;
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) throw error;
}

export async function dashboardStats() {
  const [playbooks, open, closed] = await Promise.all([
    listPlaybooks(),
    listTrades("open"),
    listTrades("closed"),
  ]);
  return {
    playbooks: playbooks.length,
    live: playbooks.filter((row) => row.usageStatus === "live").length,
    open: open.length,
    closed: closed.length,
  };
}
