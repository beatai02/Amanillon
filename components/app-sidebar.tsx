"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, LineChart, NotebookPen, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/app/journal", label: "Journal", icon: NotebookPen },
  { href: "/app/insights", label: "Insights", icon: LineChart },
];

export function AppSidebar({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <BrandLogo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/app" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
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
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
