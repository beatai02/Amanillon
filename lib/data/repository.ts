import { computeTradeMetrics } from "@/lib/calc";
import { CLOSED_STATUSES } from "@/lib/constants";
import { isDemoSession } from "@/lib/mode";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { APPLY_FX_CONVERSION } from "@/lib/config";
import type { JournalFilters, JournalTab, Playbook, PlaybookSnapshot, SessionUser, SymbolRow, Trade, TradeImage, TradeImageKind, TradeReview, TradingAccount } from "@/lib/types";
import { playbookActiveSchema, reviewSchema, tradeSchema, type AccountInput, type PlaybookDraftInput, type ReviewInput } from "@/lib/validations";
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
        notes: trade.notes ?? null,
        account: state.accounts.find((account) => account.id === trade.accountId) ?? null,
        symbol: state.symbols.find((symbol) => symbol.id === trade.symbolId) ?? null,
        images: state.tradeImages.filter((image) => image.tradeId === trade.id),
        review: state.reviews.find((review) => review.tradeId === trade.id) ?? null,
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
  const trades = (data ?? [])
    .map((row) =>
      mapTrade(row, {
        account: row.trading_accounts ? mapAccount(row.trading_accounts as Record<string, unknown>) : null,
        symbol: row.symbols ? mapSymbol(row.symbols as Record<string, unknown>) : null,
      }),
    )
    .filter((trade) => !filters.assetClass || trade.symbol?.assetClass === filters.assetClass);
  return hydrateTradeExtras(trades);
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
      notes: trade.notes ?? null,
      account: state.accounts.find((account) => account.id === trade.accountId) ?? null,
      symbol: state.symbols.find((symbol) => symbol.id === trade.symbolId) ?? null,
      images: state.tradeImages.filter((image) => image.tradeId === trade.id),
      review: state.reviews.find((review) => review.tradeId === trade.id) ?? null,
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
  const trade = mapTrade(data, {
    account: data.trading_accounts ? mapAccount(data.trading_accounts as Record<string, unknown>) : null,
    symbol: data.symbols ? mapSymbol(data.symbols as Record<string, unknown>) : null,
  });
  const [images, review] = await Promise.all([listTradeImages(id), getReview(id)]);
  return { ...trade, images: await signTradeImages(images), review };
}

export async function saveTrade(id: string | null, raw: unknown) {
  const parsed = tradeSchema.parse(raw);
  const [playbook, account, symbols] = await Promise.all([
    getPlaybook(parsed.playbookId),
    listAccounts().then((rows) => rows.find((row) => row.id === parsed.accountId) ?? null),
    listSymbols(),
  ]);
  const existing = id ? await getTrade(id) : null;
  if (!playbook && !existing?.playbookSnapshot) throw new Error("Playbook not found");
  if (!existing && playbook?.usageStatus !== "live") {
    throw new Error("Only a Live playbook can be used for a new trade");
  }
  if (!account) throw new Error("Account not found");
  const symbol = symbols.find((row) => row.id === parsed.symbolId);
  if (!symbol) throw new Error("Symbol not found");

  const riskAmt =
    parsed.riskMode === "percent" ? (account.size * parsed.riskValue) / 100 : parsed.riskValue;
  const exitPrice =
    parsed.status === "trade_sl_hit" ? (parsed.exitPrice ?? parsed.stopLoss) : (parsed.exitPrice ?? null);
  const closed = CLOSED_STATUSES.includes(parsed.status as (typeof CLOSED_STATUSES)[number]);
  const fx = APPLY_FX_CONVERSION ? 1 : 1;
  const metrics = computeTradeMetrics({
    entry: parsed.entry,
    stopLoss: parsed.stopLoss,
    takeProfit: parsed.takeProfit,
    exitPrice,
    direction: parsed.direction,
    quantity: parsed.quantity,
    contractSize: symbol.contractSize,
    fx,
  });
  const snapshot: PlaybookSnapshot = existing?.playbookSnapshot ?? toSnapshot(playbook!);

  if (await isDemoSession()) {
    const state = readDemoState();
    const payload: Trade = {
      id: id ?? newId(),
      userId: demoUserId(),
      accountId: account.id,
      playbookId: playbook?.id ?? existing?.playbookId ?? parsed.playbookId,
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
      reasoning: parsed.reasoning ?? existing?.reasoning ?? null,
      notes: parsed.notes ?? existing?.notes ?? null,
      openedAt: new Date(parsed.openedAt).toISOString(),
      closedAt: closed ? new Date(parsed.closedAt || Date.now()).toISOString() : null,
      closingEvidencePath: existing?.closingEvidencePath ?? null,
      images: existing?.images ?? [],
      review: existing?.review ?? null,
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
    playbook_id: playbook?.id ?? existing?.playbookId ?? parsed.playbookId,
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
    notes: parsed.notes ?? null,
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

async function hydrateTradeExtras(trades: Trade[]): Promise<Trade[]> {
  if (!trades.length || (await isDemoSession())) return trades;
  const supabase = await createServerSupabase();
  const ids = trades.map((trade) => trade.id);
  const [{ data: images }, { data: reviews }] = await Promise.all([
    supabase.from("trade_images").select("*").in("trade_id", ids),
    supabase.from("trade_reviews").select("*").in("trade_id", ids),
  ]);
  const mappedImages = await signTradeImages((images ?? []).map((row) => mapTradeImage(row)));
  const mappedReviews = (reviews ?? []).map((row) => mapReview(row));
  return trades.map((trade) => ({
    ...trade,
    images: mappedImages.filter((image) => image.tradeId === trade.id),
    review: mappedReviews.find((review) => review.tradeId === trade.id) ?? null,
  }));
}

async function signTradeImages(images: TradeImage[]): Promise<TradeImage[]> {
  const paths = images.filter((image) => !image.storagePath.startsWith("data:"));
  if (!paths.length || (await isDemoSession())) {
    return images.map((image) => ({ ...image, signedUrl: image.signedUrl ?? image.storagePath }));
  }
  const supabase = await createServerSupabase();
  const tradePaths = paths.filter((image) => image.kind !== "closing").map((image) => image.storagePath);
  const closingPaths = paths.filter((image) => image.kind === "closing").map((image) => image.storagePath);
  const [tradeSigned, closingSigned] = await Promise.all([
    tradePaths.length ? supabase.storage.from("trade-images").createSignedUrls(tradePaths, 3600) : { data: [] },
    closingPaths.length ? supabase.storage.from("closing-evidence").createSignedUrls(closingPaths, 3600) : { data: [] },
  ]);
  const urlMap = new Map(
    [...(tradeSigned.data ?? []), ...(closingSigned.data ?? [])].map((item) => [item.path, item.signedUrl] as const),
  );
  return images.map((image) => ({
    ...image,
    signedUrl: urlMap.get(image.storagePath) ?? image.storagePath,
  }));
}

function mapReview(row: Record<string, unknown>): TradeReview {
  return {
    tradeId: String(row.trade_id),
    userId: String(row.user_id),
    checklist: (row.checklist as TradeReview["checklist"]) ?? [],
    emotions: (row.emotions as string[]) ?? [],
    mistakes: (row.mistakes as string[]) ?? [],
    lessons: (row.lessons as string) ?? "",
    rating: row.rating == null ? null : Number(row.rating),
    updatedAt: String(row.updated_at),
  };
}

function mapTradeImage(row: Record<string, unknown>): TradeImage {
  return {
    id: String(row.id),
    tradeId: String(row.trade_id),
    kind: row.kind as TradeImageKind,
    storagePath: String(row.storage_path),
  };
}

export async function listAllTrades(): Promise<Trade[]> {
  const [open, closed, missed, cancelled] = await Promise.all([
    listTrades("open"),
    listTrades("closed"),
    listTrades("missed"),
    listTrades("cancelled"),
  ]);
  return [...open, ...closed, ...missed, ...cancelled];
}

export async function listReviews(): Promise<TradeReview[]> {
  if (await isDemoSession()) {
    return readDemoState().reviews;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("trade_reviews").select("*");
  if (error) throw error;
  return (data ?? []).map((row) => mapReview(row));
}

export async function getReview(tradeId: string) {
  const reviews = await listReviews();
  return reviews.find((review) => review.tradeId === tradeId) ?? null;
}

export async function saveReview(input: ReviewInput) {
  const parsed = reviewSchema.parse(input);
  const user = await currentUser();
  if (!user) throw new Error("Sign in first");
  const review: TradeReview = {
    tradeId: parsed.tradeId,
    userId: user.id,
    checklist: parsed.checklist,
    emotions: parsed.emotions,
    mistakes: parsed.mistakes,
    lessons: parsed.lessons ?? "",
    rating: parsed.rating ?? null,
    updatedAt: nowIso(),
  };
  if (await isDemoSession()) {
    const state = readDemoState();
    const index = state.reviews.findIndex((row) => row.tradeId === review.tradeId);
    if (index >= 0) state.reviews[index] = review;
    else state.reviews.push(review);
    writeDemoState(state);
    return review;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("trade_reviews")
    .upsert({
      trade_id: review.tradeId,
      user_id: user.id,
      checklist: review.checklist,
      emotions: review.emotions,
      mistakes: review.mistakes,
      lessons: review.lessons,
      rating: review.rating,
      updated_at: review.updatedAt,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapReview(data);
}

export async function listUnreviewedClosedTrades() {
  const [closed, reviews] = await Promise.all([listTrades("closed"), listReviews()]);
  const reviewed = new Set(reviews.map((review) => review.tradeId));
  return closed.filter((trade) => !reviewed.has(trade.id));
}

export async function listTradeImages(tradeId: string) {
  if (await isDemoSession()) {
    return readDemoState().tradeImages.filter((image) => image.tradeId === tradeId);
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("trade_images").select("*").eq("trade_id", tradeId);
  if (error) throw error;
  return (data ?? []).map((row) => mapTradeImage(row));
}

export async function addTradeImage(tradeId: string, kind: TradeImageKind, storagePath: string) {
  const limits = { setup: 2, reference: 5, closing: 1 };
  if (await isDemoSession()) {
    const state = readDemoState();
    const current = state.tradeImages.filter((image) => image.tradeId === tradeId && image.kind === kind);
    if (current.length >= limits[kind]) throw new Error(`A trade can have at most ${limits[kind]} ${kind} image(s)`);
    const image: TradeImage = { id: newId(), tradeId, kind, storagePath };
    state.tradeImages.push(image);
    if (kind === "closing") {
      const trade = state.trades.find((row) => row.id === tradeId);
      if (trade) trade.closingEvidencePath = storagePath;
    }
    writeDemoState(state);
    return image;
  }
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("trade_images")
    .insert({ trade_id: tradeId, kind, storage_path: storagePath })
    .select("*")
    .single();
  if (error) throw error;
  if (kind === "closing") {
    await supabase.from("trades").update({ closing_evidence_path: storagePath }).eq("id", tradeId);
  }
  return mapTradeImage(data);
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
