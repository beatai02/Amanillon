import Link from "next/link";
import { PlaybookList } from "@/components/playbook-list";
import { listPlaybooks } from "@/lib/data/repository";

export default async function PlaybooksPage() {
  const playbooks = await listPlaybooks();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Playbooks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Structured execution rules. Only Live playbooks appear in New Trade.
          </p>
        </div>
        <Link
          href="/app/playbooks/new"
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
        >
          New playbook
        </Link>
      </div>
      <PlaybookList playbooks={playbooks} />
    </div>
  );
}
