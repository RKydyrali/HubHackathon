import { CaretDown, Check, MapPin } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { aktauDistricts, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LocationComboboxProps = {
  id: string;
  value: string;
  onChange: (district: string) => void;
  label: string;
  anyLabel: string;
  /** When false, only the trigger control is shown (inline filter bar). */
  showLabel?: boolean;
  className?: string;
};

export function LocationCombobox({
  id,
  value,
  onChange,
  label,
  anyLabel,
  showLabel = true,
  className,
}: LocationComboboxProps) {
  const { copy } = useI18n();
  const [open, setOpen] = useState(false);

  const districts = useMemo(() => {
    const base: string[] = [...aktauDistricts];
    if (value && !base.includes(value as (typeof aktauDistricts)[number])) {
      base.unshift(value);
    }
    return base;
  }, [value]);

  const display =
    value.trim() === ""
      ? anyLabel
      : value;

  return (
    <div className={cn("flex min-w-0 flex-col", showLabel ? "gap-1.5" : undefined, className)}>
      {showLabel ? (
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className={cn(
                "justify-between rounded-lg border-border/80 px-2.5 text-left text-xs font-medium shadow-none",
                showLabel
                  ? "h-9 w-full min-w-[9.5rem] md:min-w-[10.5rem]"
                  : "h-8 w-36 max-w-36 min-w-0 shrink-0",
              )}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label={showLabel ? undefined : label}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin weight="bold" className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{display}</span>
          </span>
          <CaretDown weight="bold" className="size-3.5 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
          <Command>
            <CommandInput placeholder={copy.vacancies.search} className="h-9" />
            <CommandList>
              <CommandEmpty className="py-3 text-xs">{copy.vacancies.noResults}</CommandEmpty>
              <CommandGroup heading={label}>
                <CommandItem
                  value="location-all"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === "" ? "opacity-100" : "opacity-0")} weight="bold" />
                  {anyLabel}
                </CommandItem>
                {districts.map((d) => (
                  <CommandItem
                    key={d}
                    value={d}
                    onSelect={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", value === d ? "opacity-100" : "opacity-0")}
                      weight="bold"
                    />
                    {d}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
