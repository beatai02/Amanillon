import { AccountsPanel } from "@/components/accounts-panel";
import { currentUser, listAccounts } from "@/lib/data/repository";

export default async function ProfilePage() {
  const [user, accounts] = await Promise.all([currentUser(), listAccounts()]);

  return (
    <div>
      <h1 className="text-3xl font-semibold">Profile</h1>
      <p className="mt-1 mb-8 text-sm text-slate-500">
        {user?.email} · trading accounts used by New Trade and the journal filters.
      </p>
      <AccountsPanel accounts={accounts} />
    </div>
  );
}
