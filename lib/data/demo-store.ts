import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEMO_ACCOUNTS, DEMO_PLAYBOOKS, DEMO_SYMBOLS, DEMO_TRADES, DEMO_USER_ID } from "./demo-seed";
import type { Playbook, PlaybookImage, SymbolRow, Trade, TradingAccount } from "@/lib/types";

export type DemoState = {
  accounts: TradingAccount[];
  playbooks: Playbook[];
  trades: Trade[];
  symbols: SymbolRow[];
};

const STORE_PATH = process.env.AMANILLON_DEMO_STORE ?? join(process.cwd(), ".demo-data", "store.json");

function seed(): DemoState {
  return {
    accounts: structuredClone(DEMO_ACCOUNTS),
    playbooks: structuredClone(DEMO_PLAYBOOKS),
    trades: structuredClone(DEMO_TRADES),
    symbols: structuredClone(DEMO_SYMBOLS),
  };
}

export function readDemoState(): DemoState {
  try {
    const raw = readFileSync(/*turbopackIgnore: true*/ STORE_PATH, "utf8");
    return JSON.parse(raw) as DemoState;
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
