import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEMO_ACCOUNTS, DEMO_PLAYBOOKS, DEMO_REVIEWS, DEMO_SYMBOLS, DEMO_TRADES, DEMO_USER_ID } from "./demo-seed";
import type { Playbook, PlaybookImage, SymbolRow, Trade, TradeImage, TradeReview, TradingAccount } from "@/lib/types";

export type DemoState = {
  accounts: TradingAccount[];
  playbooks: Playbook[];
  trades: Trade[];
  symbols: SymbolRow[];
  reviews: TradeReview[];
  tradeImages: TradeImage[];
};

const STORE_PATH = process.env.AMANILLON_DEMO_STORE ?? join(process.cwd(), ".demo-data", "store.json");

function seed(): DemoState {
  return {
    accounts: structuredClone(DEMO_ACCOUNTS),
    playbooks: structuredClone(DEMO_PLAYBOOKS),
    trades: structuredClone(DEMO_TRADES),
    symbols: structuredClone(DEMO_SYMBOLS),
    reviews: structuredClone(DEMO_REVIEWS),
    tradeImages: [],
  };
}

export function readDemoState(): DemoState {
  try {
    const raw = readFileSync(/*turbopackIgnore: true*/ STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    const initial = seed();
    const storedTrades = parsed.trades ?? [];
    const storedIds = new Set(storedTrades.map((trade) => trade.id));
    const storedReviews = parsed.reviews ?? [];
    const storedReviewIds = new Set(storedReviews.map((review) => review.tradeId));
    return {
      accounts: parsed.accounts ?? initial.accounts,
      playbooks: parsed.playbooks ?? initial.playbooks,
      symbols: parsed.symbols ?? initial.symbols,
      trades: [...storedTrades, ...initial.trades.filter((trade) => !storedIds.has(trade.id))],
      reviews: [...storedReviews, ...initial.reviews.filter((review) => !storedReviewIds.has(review.tradeId))],
      tradeImages: parsed.tradeImages ?? [],
    };
  } catch {
    const initial = seed();
    writeDemoState(initial);
    return initial;
  }
}

export function writeDemoState(state: DemoState) {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
}

export function resetDemoState() {
  const initial = seed();
  writeDemoState(initial);
  return initial;
}

export function demoUserId() {
  return DEMO_USER_ID;
}

export function attachPlaybookImages(playbook: Playbook, images: PlaybookImage[]) {
  playbook.images = images.sort((a, b) => a.sort - b.sort);
}
