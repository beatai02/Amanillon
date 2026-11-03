import { notFound } from "next/navigation";
import { TradeForm } from "@/components/trade-form";
import { getTrade, listAccounts, listPlaybooks, listSymbols } from "@/lib/data/repository";

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [trade, playbooks, accounts, symbols] = await Promise.all([
    getTrade(id),
    listPlaybooks(),
    listAccounts(),
    listSymbols(),
  ]);
  if (!trade) notFound();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Edit trade</h1>
      <TradeForm playbooks={playbooks} accounts={accounts} symbols={symbols} trade={trade} />
    </div>
  );
}
