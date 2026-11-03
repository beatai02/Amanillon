import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261103100000_slice1_schema.sql", "utf8");
const slice2 = readFileSync("supabase/migrations/20261103120000_slice2_reviews_insights.sql", "utf8");

const ownedTables = [
  "trading_accounts",
  "user_symbol_settings",
  "playbooks",
  "playbook_images",
  "trades",
];

describe("RLS isolation", () => {
  it("enables RLS on every user-owned table", () => {
    for (const table of [...ownedTables, "profiles"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("limits each user to their own rows", () => {
    for (const table of ownedTables) {
      expect(sql).toContain(`create policy "own_select" on public.${table}`);
      expect(sql).toContain(`create policy "own_insert" on public.${table}`);
      expect(sql).toContain(`create policy "own_update" on public.${table}`);
      expect(sql).toContain(`create policy "own_delete" on public.${table}`);
    }
    expect(sql.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(ownedTables.length * 4);
  });

  it("keeps the evidence bucket private and scoped to per-user folders", () => {
    expect(sql).toContain("playbook-evidence");
    expect(sql).toContain("false");
    expect(sql).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });

  it("blocks Live unless the playbook is Active", () => {
    expect(sql).toContain("usage_status <> 'live' or prep_status = 'active'");
    expect(sql).toContain("Only an Active playbook can go Live");
  });
});

describe("Slice 2 RLS", () => {
  const tables = ["trade_images", "trade_status_history", "trade_reviews", "score_snapshots"];

  it("enables RLS on review and evidence tables", () => {
    for (const table of tables) {
      expect(slice2).toContain(`alter table public.${table} enable row level security`);
      expect(slice2).toContain(`create policy "own_select" on public.${table}`);
    }
  });

  it("keeps trade image buckets private and per-user", () => {
    expect(slice2).toContain("trade-images");
    expect(slice2).toContain("closing-evidence");
    expect(slice2).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });
});
