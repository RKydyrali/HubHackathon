import { Info, Sparkle } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AiAdvisoryNotice({
  title,
  body,
  className,
}: {
  title?: string;
  body?: string;
  className?: string;
}) {
  const { copy } = useI18n();
  const noticeTitle = title ?? copy.applications.advisoryTitle;
  const noticeBody = body ?? copy.applications.advisory;

  return (
    <Alert className={cn("border-primary/20 bg-primary/5", className)}>
      <Info data-icon="inline-start" weight="bold" />
      <AlertTitle>{noticeTitle}</AlertTitle>
      <AlertDescription>{noticeBody}</AlertDescription>
    </Alert>
  );
}

export function AiExplainabilityList({
  factors,
  className,
  title = "Why this match",
}: {
  factors: string[];
  className?: string;
  title?: string;
}) {
  const visibleFactors = factors.filter(Boolean).slice(0, 3);
  if (!visibleFactors.length) return null;

  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkle weight="bold" />
        {title}
      </p>
      <ul className="grid gap-2 text-sm text-muted-foreground">
        {visibleFactors.map((factor) => (
          <li key={factor} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />
            <span>{factor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
