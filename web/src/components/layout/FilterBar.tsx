import { useState, type ReactNode } from "react";

import { Button } from "@/components/shared/Button";
import { Icon } from "@/components/shared/Icon";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";

export function FilterBar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { copy } = useI18n();

  return (
    <>
      <div className="border-b bg-card/68 px-4 py-3 backdrop-blur md:hidden">
        <Button variant="outline" className="w-full justify-center" onClick={() => setOpen(true)}>
          <Icon icon="Funnel" data-icon="inline-start" weight="bold" />
          {copy.common.filters}
        </Button>
      </div>
      <div className="hidden gap-3 border-b bg-card/68 px-6 py-4 backdrop-blur md:flex md:items-end">
        {children}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[86dvh] overflow-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{copy.common.filters}</SheetTitle>
            <SheetDescription>{copy.vacancies.subtitle}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-4">{children}</div>
          <div className="sticky bottom-0 border-t bg-popover/92 p-4 backdrop-blur">
            <Button className="w-full" onClick={() => setOpen(false)}>
              {copy.common.done}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
