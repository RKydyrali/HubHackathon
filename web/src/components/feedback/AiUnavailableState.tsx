import { WarningCircle } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/shared/Button";
import { useI18n } from "@/lib/i18n";

export function AiUnavailableState({ onRetry }: { onRetry?: () => void }) {
  const { copy } = useI18n();

  return (
    <div className="rounded-lg border border-primary/15 bg-elevated/70 p-4 text-sm text-foreground">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WarningCircle weight="bold" />
        </span>
        <div>
          <p className="font-semibold">{copy.ai.unavailableTitle}</p>
          <p className="mt-1 leading-6 text-muted-foreground">{copy.ai.unavailableBody}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:pl-[52px]">
        <Link to="/vacancies">
          <Button size="sm" variant="outline">
            {copy.common.filters}
          </Button>
        </Link>
        {onRetry ? (
          <Button size="sm" type="button" onClick={onRetry}>
            {copy.common.retry}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
