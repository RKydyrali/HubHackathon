import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { AiMessageBubble } from "./AiMessageBubble";
import { AiQuestionCard } from "./AiQuestionCard";
import { AiSuggestionChips } from "./AiSuggestionChips";
import { AiThinkingState } from "./AiThinkingState";
import type { AiChatMessage } from "./aiSearchTypes";

export function AiChatPanel({
  messages,
  pending,
  latestQuestion,
  followUpTurns,
  onSend,
  onSkipQuestion,
  onShowResultsNow,
}: {
  messages: AiChatMessage[];
  pending: boolean;
  latestQuestion: string | null;
  followUpTurns: number;
  onSend: (message: string) => void;
  onSkipQuestion: () => void;
  onShowResultsNow: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { copy, locale } = useI18n();

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, latestQuestion]);

  function submit(value = draft) {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setDraft("");
    onSend(trimmed);
  }

  return (
    <section
      className="surface-panel rounded-2xl p-5"
      aria-label={locale === "kk" ? "Жұмыс таңдау чаты" : "Чат подбора работы"}
    >
      <div className="flex flex-col gap-3">
        <div ref={scrollRef} className="woven-grid flex min-h-[420px] max-h-[62dvh] flex-col gap-3 overflow-y-auto rounded-2xl border bg-muted/35 p-4">
          {messages.length ? (
            messages.map((message, index) => (
              <AiMessageBubble key={`${message.role}-${index}-${message.content}`} message={message} />
            ))
          ) : (
            <div className="max-w-xl rounded-2xl border bg-card p-4 text-sm leading-6 text-muted-foreground shadow-card">
              <p className="font-semibold text-foreground">{copy.ai.emptyPrompt}</p>
              <p className="mt-1">
                {locale === "kk"
                  ? "Аудан, кесте, тәжірибе және қандай жұмыстан бастау ыңғайлы екенін жазыңыз."
                  : "Укажите район, график, опыт и с чего вам комфортно начать."}
              </p>
            </div>
          )}
          {latestQuestion ? (
            <AiQuestionCard
              question={latestQuestion}
              showResultsNow={followUpTurns >= 2}
              onShowResults={onShowResultsNow}
              onSkip={onSkipQuestion}
            />
          ) : null}
          {pending ? <AiThinkingState /> : null}
        </div>

        <AiSuggestionChips onPick={submit} />

        <div className="sticky bottom-3 rounded-2xl border bg-background/92 p-2 shadow-card backdrop-blur-xl">
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
            className="min-h-32 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <p className="max-w-lg text-xs leading-5 text-muted-foreground">{copy.ai.privacy}</p>
            <Button type="button" onClick={() => submit()} disabled={pending || !draft.trim()}>
              <PaperPlaneTilt data-icon="start" weight="bold" />
              {copy.ai.send}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
