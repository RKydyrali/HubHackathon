import { useUser } from "@clerk/clerk-react";
import { List, MapPin, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/shared/Button";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { copy } = useI18n();
  const links = [
    { to: "/vacancies", label: copy.nav.vacancies },
    { to: "/ai-search", label: copy.nav.aiSearch },
  ];
  const accountHref = user ? "/dashboard" : "/login";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/88 backdrop-blur-xl">
      <div className="container-app flex min-h-[4.5rem] items-center justify-between gap-3">
        <Link to="/" aria-label={copy.brand}>
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" className="rounded-full">
            <MapPin data-icon="inline-start" weight="bold" />
            {copy.city}
          </Button>
          <LocaleToggle />
          <Link to={accountHref}>
            <Button size="sm" variant={user ? "outline" : "default"}>
              {user ? copy.nav.dashboard : copy.nav.signIn}
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <LocaleToggle />
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Open navigation" onClick={() => setOpen((value) => !value)}>
            {open ? <X weight="bold" /> : <List weight="bold" />}
          </Button>
        </div>
      </div>
      <div className={cn("border-t bg-card/95 md:hidden", open ? "block" : "hidden")}>
        <div className="container-app flex flex-col gap-2 py-3">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link to={accountHref} className="pt-1" onClick={() => setOpen(false)}>
            <Button className="w-full">{user ? copy.nav.dashboard : copy.nav.signIn}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
