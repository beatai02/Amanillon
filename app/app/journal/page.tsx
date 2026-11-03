import Link from "next/link";
import { JournalTable } from "@/components/journal-table";
import { countTradesByTab, listAccounts, listPlaybooks, listTrades } from "@/lib/data/repository";
import type { JournalFilters, JournalTab } from "@/lib/types";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = (typeof params.tab === "string" ? params.tab : "open") as JournalTab;
  const filters: JournalFilters = {
    accountId: typeof params.account === "string" && params.account ? params.account : undefined,
    playbookId: typeof params.playbook === "string" && params.playbook ? params.playbook : undefined,
    assetClass: typeof params.asset === "string" && params.asset ? params.asset : undefined,
    from: typeof params.from === "string" && params.from ? params.from : undefined,
    to: typeof params.to === "string" && params.to ? params.to : undefined,
  };

  const [trades, counts, accounts, playbooks, unfiltered] = await Promise.all([
    listTrades(tab, filters),
    countTradesByTab(),
    listAccounts(),
    listPlaybooks(),
    listTrades(tab),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Open, closed, missed and cancelled trades with the 18-column ledger.
          </p>
        </div>
        <Link
          href="/app/journal/new"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
        >
          New trade
        </Link>
      </div>
      <JournalTable
        trades={trades}
        counts={counts}
        tab={["open", "closed", "missed", "cancelled"].includes(tab) ? tab : "open"}
        accounts={accounts}
        playbooks={playbooks}
        total={unfiltered.length}
      />
    </div>
  );
}
