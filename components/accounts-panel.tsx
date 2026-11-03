"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Input, Label } from "@/components/ui";
import { deleteAccountAction, saveAccountAction } from "@/lib/actions/journal";
import { ACCOUNT_TYPES } from "@/lib/constants";
import type { TradingAccount } from "@/lib/types";
import { formatMoney, titleCase } from "@/lib/utils";

export function AccountsPanel({ accounts }: { accounts: TradingAccount[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 font-[family-name:var(--font-geist-sans)] text-lg font-semibold">
          {editing ? "Edit account" : "Add trading account"}
        </h2>
        <AccountForm
          key={editing ?? "new"}
          account={accounts.find((row) => row.id === editing) ?? null}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </Card>

      <div className="grid gap-3">
        {accounts.map((account) => (
          <Card key={account.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-900">{account.name}</p>
              <p className="text-sm text-slate-500">
                {titleCase(account.accountType)} · {formatMoney(account.size, account.currency)} ·{" "}
                {account.allowedRiskPct}% risk
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(account.id)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  const result = await deleteAccountAction(account.id);
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Account removed");
                    router.refresh();
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account: TradingAccount | null;
  onDone: () => void;
}) {
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      action={async (formData) => {
        const result = await saveAccountAction(account?.id ?? null, formData);
        if (result.error) toast.error(result.error);
        else {
          toast.success("Account saved");
          onDone();
        }
      }}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={account?.name} required />
      </div>
      <div>
        <Label htmlFor="accountType">Type</Label>
        <select
          id="accountType"
          name="accountType"
          defaultValue={account?.accountType ?? "demo"}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {ACCOUNT_TYPES.map((item) => (
            <option key={item} value={item}>
              {titleCase(item)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="size">Size</Label>
        <Input id="size" name="size" type="number" step="0.01" defaultValue={account?.size} required />
      </div>
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" name="currency" defaultValue={account?.currency ?? "USD"} />
      </div>
      <div>
        <Label htmlFor="allowedRiskPct">Allowed risk %</Label>
        <Input
          id="allowedRiskPct"
          name="allowedRiskPct"
          type="number"
          step="0.1"
          defaultValue={account?.allowedRiskPct ?? 2}
          required
        />
      </div>
      <div className="flex items-end">
        <Button type="submit">Save account</Button>
      </div>
    </form>
  );
}
