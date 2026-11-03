"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ClipboardCheck, LayoutDashboard, LineChart, Menu, NotebookPen, UserRound, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/app/journal", label: "Journal", icon: NotebookPen },
  { href: "/app/reviews", label: "Reviews", icon: ClipboardCheck },
  { href: "/app/insights", label: "Insights", icon: LineChart },
];

export function AppShell({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/app" && pathname.startsWith(link.href));
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
              active
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <BrandLogo />
        </div>
        {nav}
        <ProfileBlock displayName={displayName} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="relative z-50 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <BrandLogo />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <ProfileBlock displayName={displayName} />
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600">
            <Menu className="size-5" />
          </button>
          <BrandLogo />
          <Link href="/app/profile" className="rounded-lg p-2 text-slate-600">
            <UserRound className="size-5" />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 lg:px-6 lg:py-8 lg:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white px-1 py-2 lg:hidden">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/app" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-medium",
                  active ? "text-blue-600" : "text-slate-500",
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function ProfileBlock({ displayName }: { displayName: string }) {
  return (
    <div className="border-t border-slate-200 p-3">
      <Link
        href="/app/profile"
        className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-slate-100">
          <UserRound className="size-4" />
        </span>
        <span>
          <span className="block font-medium">{displayName}</span>
          <span className="text-xs text-slate-500">Profile & accounts</span>
        </span>
      </Link>
      <form action={signOutAction}>
        <button type="submit" className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">
          Sign out
        </button>
      </form>
    </div>
  );
}
