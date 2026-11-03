import Link from "next/link";
import { Card } from "@/components/ui";
import { currentUser, dashboardStats } from "@/lib/data/repository";
import { APP_NAME } from "@/lib/config";

export default async function DashboardPage() {
  const [user, stats] = await Promise.all([currentUser(), dashboardStats()]);

  return (
    <div>
      <p className="text-sm text-slate-500">Welcome back, {user?.displayName}</p>
      <h1 className="mt-1 text-3xl font-semibold text-slate-900">{APP_NAME} workspace</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Build a playbook, mark it Active then Live, and journal trades from that snapshot.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat href="/app/playbooks" label="Playbooks" value={stats.playbooks} />
        <Stat href="/app/playbooks" label="Live playbooks" value={stats.live} />
        <Stat href="/app/journal?tab=open" label="Open trades" value={stats.open} />
        <Stat href="/app/journal?tab=closed" label="Closed trades" value={stats.closed} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/app/playbooks/new"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
        >
          New playbook
        </Link>
        <Link href="/app/journal/new" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
          New trade
        </Link>
        <Link href="/app/profile" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
          Accounts
        </Link>
      </div>
    </div>
  );
}

function Stat({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href}>
      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold">{value}</p>
      </Card>
    </Link>
  );
}
