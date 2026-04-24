import { Outlet } from "react-router-dom";

import { MobileNav } from "@/components/shell/MobileNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import type { UserRole } from "@/types/domain";

export function AppShell({ role }: { role: UserRole }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar role={role} />
      <div className="min-h-dvh pb-16 md:ml-[17.5rem] md:pb-0">
        <TopBar role={role} />
        <main className="app-page">
          <Outlet />
        </main>
      </div>
      <MobileNav role={role} />
    </div>
  );
}
