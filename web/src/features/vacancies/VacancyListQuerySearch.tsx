import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 320;

/**
 * Text search for the public vacancy list, bound to the `q` URL param.
 * Shown in the app header on /vacancies (signed-in) or the public list chrome (anonymous).
 */
export function VacancyListQuerySearch({ className }: { className?: string }) {
  const { copy } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [local, setLocal] = useState(q);

  useEffect(() => {
    setLocal(q);
  }, [q]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = local.trim();
      if (trimmed === q) return;
      const next = new URLSearchParams(params);
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      setParams(next, { replace: true });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [local, params, q, setParams]);

  return (
    <InputGroup className={cn("h-9 rounded-xl border-border/80 bg-background shadow-none md:h-10", className)}>
      <InputGroupAddon className="text-muted-foreground">
        <MagnifyingGlass data-icon="inline-start" weight="bold" className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        id="vacancy-list-q"
        value={local}
        onChange={(event) => setLocal(event.target.value)}
        placeholder={copy.vacancies.searchPlaceholder}
        autoComplete="off"
        className="text-sm"
        aria-label={copy.vacancies.search}
      />
    </InputGroup>
  );
}
