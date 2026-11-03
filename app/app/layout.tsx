import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { currentUser } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar displayName={user.displayName} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
