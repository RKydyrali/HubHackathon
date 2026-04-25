import { Link } from "react-router-dom";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function splitBrandWordmark(brand: string): { jumys: string; ai: string } {
  if (brand.length >= 2 && /ai$/i.test(brand)) {
    return { jumys: brand.slice(0, -2), ai: brand.slice(-2) };
  }
  return { jumys: brand, ai: "" };
}

export function BrandMark({
  compact = false,
  variant = "default",
  className,
  to = "/",
  "aria-label": ariaLabel,
}: {
  compact?: boolean;
  variant?: "default" | "inverted";
  className?: string;
  to?: string;
  "aria-label"?: string;
}) {
  const { copy } = useI18n();
  const { jumys, ai } = splitBrandWordmark(copy.brand);
  const titleSize = compact ? "text-lg" : "text-xl";
  const label = ariaLabel ?? copy.brand;
  const jumysClass = variant === "inverted" ? "text-white" : "text-foreground";
  const aiClass = variant === "inverted" ? "text-primary" : "text-primary";

  return (
    <Link
      to={to}
      aria-label={label}
      className={cn("group inline-flex min-w-0 items-center", className)}
    >
      <span className="inline-flex min-w-0 flex-col">
        <span
          className={cn(
            "inline-flex min-w-0 items-baseline gap-0.5 font-heading font-extrabold leading-none tracking-tight",
            titleSize,
          )}
        >
          {jumys ? (
            <>
              <span className={jumysClass}>{jumys}</span>
              {ai ? <span className={aiClass}>{ai}</span> : null}
            </>
          ) : (
            <span className={cn(variant === "inverted" ? "text-white" : "text-primary")}>{copy.brand}</span>
          )}
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1 block text-xs font-medium",
              variant === "inverted" ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {copy.city}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
