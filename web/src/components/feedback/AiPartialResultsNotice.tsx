import { Info } from "@phosphor-icons/react";

import { useI18n } from "@/lib/i18n";

export function AiPartialResultsNotice() {
  const { copy } = useI18n();

  return (
    <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">
      <div className="flex gap-2">
        <Info className="mt-1 size-4 shrink-0 text-primary" weight="bold" />
        <p>{copy.ai.partial}</p>
      </div>
    </div>
  );
}
