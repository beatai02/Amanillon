import { TradeForm } from "@/components/trade-form";
import { listAccounts, listPlaybooks, listSymbols } from "@/lib/data/repository";

export default async function NewTradePage() {
  const [playbooks, accounts, symbols] = await Promise.all([
    listPlaybooks(),
    listAccounts(),
    listSymbols(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold">New trade</h1>
      <p className="mb-6 text-sm text-slate-500">
        Pick a Live playbook. Levels and risk stay editable; the suggested lot size is a helper.
      </p>
      <TradeForm playbooks={playbooks} accounts={accounts} symbols={symbols} />
    </div>
  );
}
