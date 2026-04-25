import { CheckCircle, Circle, Flag, RadioButton } from "@phosphor-icons/react";

import { Badge } from "@/components/shared/Badge";
import { useI18n } from "@/lib/i18n";
import {
  getApplicationTimeline,
  type ApplicationTimelineStep,
} from "@/lib/status-ui";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/status";

export function ApplicationStatusTimeline({
  status,
  compact = false,
  className,
}: {
  status: ApplicationStatus;
  compact?: boolean;
  className?: string;
}) {
  const { locale } = useI18n();
  const timeline = getApplicationTimeline(status, locale);

  return (
    <div className={cn("rounded-xl border border-border/70 bg-background/80 p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {locale === "kk" ? "Қазіргі кезең" : "Текущий шаг"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{timeline.current.label}</p>
        </div>
        <Badge tone={timeline.current.tone} className="h-6 px-2 text-[11px]">
          {timeline.isTerminal
            ? locale === "kk"
              ? "Аяқталды"
              : "Завершено"
            : locale === "kk"
              ? "Жұмыста"
              : "В работе"}
        </Badge>
      </div>

      <ol className={cn("mt-3 grid gap-2", compact ? "sm:grid-cols-5" : "")}>
        {timeline.steps.map((step) => (
          <TimelineStep key={`${step.status}-${step.state}`} step={step} compact={compact} />
        ))}
      </ol>

      {!compact ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {timeline.nextActions.length
            ? locale === "kk"
              ? `Келесі рұқсат етілген әрекеттер: ${timeline.nextActions.map((action) => action.label).join(", ")}.`
              : `Следующие действия работодателя: ${timeline.nextActions.map((action) => action.label).join(", ")}.`
            : locale === "kk"
              ? "Бұл мәртебеден кейін қосымша әрекет жоқ."
              : "Для этого статуса больше нет доступных действий."}
        </p>
      ) : null}
    </div>
  );
}

function TimelineStep({
  step,
  compact,
}: {
  step: ApplicationTimelineStep;
  compact: boolean;
}) {
  const Icon =
    step.state === "done" ? CheckCircle : step.state === "current" ? RadioButton : step.state === "terminal" ? Flag : Circle;

  return (
    <li
      className={cn(
        "flex items-center gap-2 text-xs",
        step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
        compact && "min-w-0",
      )}
    >
      <Icon
        weight={step.state === "done" || step.state === "terminal" ? "fill" : "bold"}
        className={cn(
          "size-4 shrink-0",
          step.state === "done" && "text-success",
          step.state === "current" && "text-primary",
          step.state === "terminal" && "text-destructive",
          step.state === "upcoming" && "text-muted-foreground/70",
        )}
      />
      <span className={cn("truncate", step.state === "current" && "font-semibold")}>{step.label}</span>
    </li>
  );
}
