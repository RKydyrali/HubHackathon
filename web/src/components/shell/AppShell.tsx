import { ProductShell } from "@/components/shell/ProductShell";
import type { UserRole } from "@/types/domain";

export function AppShell({ role }: { role: UserRole }) {
  return <ProductShell role={role} />;
}
