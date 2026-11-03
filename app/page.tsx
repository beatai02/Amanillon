import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <BrandLogo />
        <div className="flex gap-3">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm text-slate-600">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm text-white"
          >
            Create account
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-medium text-cyan-700">Private trading journal</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900">
          Plan from a playbook. Size from risk. Review what you actually traded.
        </h1>
        <p className="mt-4 max-w-xl text-slate-600">
          {APP_NAME} is a quiet workspace for accounts, playbooks and a journal. Each row stays
          locked to the signed-in trader.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            Get started
          </Link>
          <Link href="/login" className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm">
            I already have an account
          </Link>
        </div>
      </main>
    </div>
  );
}
