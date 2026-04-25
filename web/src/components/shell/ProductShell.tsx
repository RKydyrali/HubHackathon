import { Outlet } from "react-router-dom";

import { MobileNav } from "@/components/shell/MobileNav";
import { TopNavigation } from "@/components/shell/TopNavigation";
import type { UserRole } from "@/types/domain";

export function ProductShell({ role }: { role: UserRole }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopNavigation role={role} />
      <main className="app-page">
        <Outlet />
      </main>
      <MobileNav role={role} />
    </div>
  );
}
