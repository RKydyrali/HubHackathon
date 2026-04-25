import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";
import { AiQuestionCard } from "./AiQuestionCard";
import { AiSuggestionChips } from "./AiSuggestionChips";

export function AiPromptComposer({
  pending,
  latestQuestion,
  followUpTurns,
  onSend,
  onSkipQuestion,
  onShowResultsNow,
  historyAction,
}: {
  pending: boolean;
  latestQuestion: string | null;
  followUpTurns: number;
  onSend: (message: string) => void;
  onSkipQuestion: () => void;
  onShowResultsNow: () => void;
  historyAction?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const { copy } = useI18n();

  function submit(value = draft) {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setDraft("");
    onSend(trimmed);
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
      aria-label={copy.ai.inputLabel}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {latestQuestion ? (
          <AiQuestionCard
            question={latestQuestion}
            showResultsNow={followUpTurns >= 2}
            onShowResults={onShowResultsNow}
            onSkip={onSkipQuestion}
          />
        ) : null}

        <div className="rounded-lg border border-border/60 bg-background/90 p-1">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={4}
            placeholder={copy.ai.inputPlaceholder}
            aria-label={copy.ai.inputLabel}
            className="min-h-[7.5rem] resize-y border-0 bg-transparent text-base leading-relaxed shadow-none focus-visible:ring-0 sm:min-h-[8.5rem]"
          />
          <p className="px-1 pb-2 text-xs leading-5 text-muted-foreground sm:px-2">{copy.ai.privacy}</p>
          <div className="flex flex-col gap-3 border-t border-border/50 px-1 pb-1 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-2 sm:pb-2">
            {historyAction}
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <Button
                type="button"
                className="w-full min-h-11 sm:min-w-[14rem] sm:max-w-md"
                onClick={() => submit()}
                disabled={pending || !draft.trim()}
              >
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PaperPlaneTilt data-icon="inline-start" weight="bold" />
                )}
                {copy.ai.primaryCta}
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
                <Link
                  to="/vacancies"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {copy.publicHome.browseCta}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <AiSuggestionChips onPick={submit} />
      </div>
    </section>
  );
}
