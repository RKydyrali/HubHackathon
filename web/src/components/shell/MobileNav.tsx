import { NavLink } from "react-router-dom";
import { useState } from "react";

import { Icon } from "@/components/shared/Icon";
import { navByRole } from "@/components/shell/Sidebar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

export function MobileNav({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const { copy } = useI18n();
  const primary = navByRole[role].slice(0, 4);
  const overflow = navByRole[role].slice(4);

  return (
    <>
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 overflow-hidden rounded-2xl border bg-card/92 shadow-lift backdrop-blur-xl md:hidden">
        {primary.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold transition-colors",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70",
            )
          }
        >
          <Icon icon={item.icon} weight="bold" />
          <span className="max-w-full truncate px-1">{copy.nav[item.labelKey]}</span>
        </NavLink>
      ))}
        <button
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold transition-colors",
            open ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70",
          )}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <Icon icon="DotsThree" />
          <span>{copy.common.filters}</span>
        </button>
      </nav>
      {open && overflow.length ? (
        <div className="fixed inset-0 z-20 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/28"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute inset-x-3 bottom-20 overflow-hidden rounded-2xl border bg-card shadow-lift">
            {overflow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-14 items-center gap-3 border-b px-4 text-sm font-semibold last:border-b-0",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )
                }
              >
                <Icon icon={item.icon} weight="bold" />
                {copy.nav[item.labelKey]}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
