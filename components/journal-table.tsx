"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ClipboardCheck, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import { deleteTradeAction } from "@/lib/actions/journal";
import { TRADE_STATUS_LABELS } from "@/lib/constants";
import type { JournalTab, Playbook, Trade, TradingAccount } from "@/lib/types";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/utils";

const tabs: { id: JournalTab; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "missed", label: "Missed" },
  { id: "cancelled", label: "Cancelled" },
];

function statusTone(status: Trade["status"]) {
  if (status === "trade_close_with_profit" || status === "entry_triggered") return "green" as const;
  if (status === "trade_sl_hit" || status === "entry_cancelled") return "red" as const;
  if (status === "trade_exit_in_mid") return "blue" as const;
  if (status === "entry_placed") return "amber" as const;
  return "slate" as const;
}

export function JournalTable({
  trades,
  counts,
  tab,
  accounts,
  playbooks,
  total,
}: {
  trades: Trade[];
  counts: Record<JournalTab, number>;
  tab: JournalTab;
  accounts: TradingAccount[];
  playbooks: Playbook[];
  total: number;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<Trade>[]>(
    () => [
      { header: "Strategy", accessorFn: (row) => row.playbookSnapshot.name },
      { header: "Lot size", accessorKey: "quantity", cell: ({ getValue }) => formatNumber(getValue() as number, 2) },
      { header: "Account", accessorFn: (row) => row.account?.name ?? "—" },
      {
        header: "Initial Risk",
        cell: ({ row }) =>
          row.original.riskMode === "percent"
            ? `${formatNumber(row.original.riskValue, 2)}%`
            : formatMoney(row.original.riskAmount, row.original.account?.currency),
      },
      { header: "Planned RR", accessorKey: "plannedRr", cell: ({ getValue }) => formatNumber(Number(getValue()), 2) },
      { header: "Actual RR", accessorKey: "actualRr", cell: ({ getValue }) => formatNumber(getValue() as number, 2) },
      {
        header: "P&L",
        accessorKey: "pnlGross",
        cell: ({ row }) => {
          const value = row.original.pnlGross;
          if (value == null) return "—";
          return (
            <Badge tone={value >= 0 ? "green" : "red"}>
              {formatMoney(value, row.original.account?.currency)}
            </Badge>
          );
        },
      },
      {
        header: "Timeframe",
        accessorFn: (row) => row.htf.join("/"),
        cell: ({ row }) => `${row.original.htf.join(", ")} → ${row.original.entryTf.join(", ")}`,
      },
      { header: "Market", accessorFn: (row) => row.symbol?.code ?? "—" },
      {
        header: "Action",
        accessorKey: "direction",
        cell: ({ getValue }) => (
          <Badge tone={getValue() === "long" ? "green" : "red"}>
            {getValue() === "long" ? "Buy" : "Sell"}
          </Badge>
        ),
      },
      { header: "Entry", accessorKey: "entry", cell: ({ getValue }) => formatNumber(Number(getValue()), 5) },
      { header: "Stop loss", accessorKey: "stopLoss", cell: ({ getValue }) => formatNumber(Number(getValue()), 5) },
      { header: "Take profit", accessorKey: "takeProfit", cell: ({ getValue }) => formatNumber(getValue() as number, 5) },
      { header: "Exit price", accessorKey: "exitPrice", cell: ({ getValue }) => formatNumber(getValue() as number, 5) },
      { header: "Close time", accessorKey: "closedAt", cell: ({ getValue }) => formatDateTime(getValue() as string) },
      {
        header: "Trade Status",
        accessorKey: "status",
        cell: ({ row }) => <Badge tone={statusTone(row.original.status)}>{TRADE_STATUS_LABELS[row.original.status]}</Badge>,
      },
      {
        header: "Closed Evidence",
        cell: ({ row }) => {
          const closing =
            row.original.images?.find((image) => image.kind === "closing") ??
            (row.original.closingEvidencePath
              ? { signedUrl: row.original.closingEvidencePath, storagePath: row.original.closingEvidencePath }
              : null);
          if (!closing) return "—";
          const src = closing.signedUrl ?? closing.storagePath;
          if (src.startsWith("data:") || src.startsWith("http")) {
            return <img src={src} alt="" className="h-10 w-14 rounded object-cover" />;
          }
          return "Attached";
        },
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link href={`/app/journal/${row.original.id}`} className="text-slate-500 hover:text-slate-800" title="View">
              <Eye className="size-4" />
            </Link>
            <Link href={`/app/journal/${row.original.id}/edit`} className="text-slate-500 hover:text-slate-800" title="Edit">
              <Pencil className="size-4" />
            </Link>
            <Link
              href={`/app/journal/${row.original.id}/review`}
              className="text-slate-500 hover:text-slate-800"
              title={row.original.review ? "Edit review" : "Review"}
            >
              <ClipboardCheck className={`size-4 ${row.original.review ? "text-emerald-600" : ""}`} />
            </Link>
            <button
              type="button"
              className="text-slate-400 hover:text-red-600"
              onClick={async () => {
                const result = await deleteTradeAction(row.original.id);
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Trade deleted");
                  router.refresh();
                }
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ),
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: trades,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/app/journal?tab=${item.id}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === item.id
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {item.label} ({counts[item.id] ?? 0})
          </Link>
        ))}
      </div>

      <form method="get" action="/app/journal" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <select name="account" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">Account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <select name="playbook" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">Strategy</option>
          {playbooks.map((playbook) => (
            <option key={playbook.id} value={playbook.id}>
              {playbook.name}
            </option>
          ))}
        </select>
        <select name="asset" defaultValue="" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">Asset</option>
          <option value="forex">Forex</option>
          <option value="metal">Metal</option>
          <option value="energy">Energy</option>
          <option value="index">Index</option>
          <option value="crypto">Crypto</option>
        </select>
        <input type="date" name="from" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input type="date" name="to" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white" type="submit">
            Apply
          </button>
          <Link href={`/app/journal?tab=${tab}`} className="rounded-full px-4 py-2 text-sm text-slate-500">
            Reset
          </Link>
        </div>
        <input type="hidden" name="tab" value={tab} />
      </form>
      <p className="text-xs text-slate-500">
        Showing {trades.length} of {total}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer whitespace-nowrap px-3 py-3"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="font-[family-name:var(--font-geist-mono)]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-3 text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No trades in this tab.</p>
        ) : null}
      </div>
    </div>
  );
}
