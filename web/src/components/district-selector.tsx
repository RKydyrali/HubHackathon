import { MapPin } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { aktauDistricts } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DistrictSelector({
  value,
  onChange,
}: {
  value?: string;
  onChange: (district?: string) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-[220px_1fr]">
      <svg viewBox="0 0 220 140" role="img" aria-label="Aktau district selector" className="h-36 w-full">
        <path d="M16 106 C52 78 76 34 130 24 C161 18 190 36 204 68 C178 100 139 122 92 124 C60 126 36 120 16 106Z" fill="#E8F4FF" stroke="#04B8C4" strokeWidth="3" />
        <path d="M42 104 C74 86 98 52 138 42" fill="none" stroke="#13436D" strokeWidth="2" strokeDasharray="6 6" opacity="0.45" />
        <path d="M70 120 C108 96 136 72 190 68" fill="none" stroke="#FF7D68" strokeWidth="2" opacity="0.55" />
        <circle cx="62" cy="92" r="8" fill={value ? "#76D8B6" : "#04B8C4"} />
        <circle cx="134" cy="42" r="7" fill="#8F7BD8" opacity="0.75" />
        <circle cx="180" cy="72" r="9" fill="#FFCF70" />
      </svg>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
          <MapPin data-icon="inline-start" />
          Aktau districts
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={!value ? "default" : "outline"} size="sm" onClick={() => onChange(undefined)}>
            All
          </Button>
          {aktauDistricts.map((district) => (
            <Button
              key={district}
              variant={value === district ? "default" : "outline"}
              size="sm"
              className={cn(value === district && "shadow-sm")}
              onClick={() => onChange(district)}
            >
              {district}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
