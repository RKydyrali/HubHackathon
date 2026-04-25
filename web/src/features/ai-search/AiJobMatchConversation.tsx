import {
  ChatCenteredText,
  ListBullets,
  PencilLine,
  Play,
  SkipForward,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";
import { AiThinkingState } from "./AiThinkingState";
import { AiMessageBubble } from "./AiMessageBubble";
import type { AiChatMessage } from "./aiSearchTypes";

function AiClarificationOptions({
  options,
  disabled,
  onPick,
  onRequestCustom,
  customLabel,
  groupLabel,
}: {
  options: string[];
  disabled: boolean;
  onPick: (value: string) => void;
  onRequestCustom: () => void;
  customLabel: string;
  groupLabel: string;
}) {
  if (!options.length) {
    return null;
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-2" role="group" aria-label={groupLabel}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <Button
            key={opt}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left text-sm font-normal leading-snug"
            onClick={() => onPick(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onRequestCustom}
      >
        <PencilLine className="size-4 shrink-0" weight="bold" aria-hidden />
        {customLabel}
      </Button>
    </div>
  );
}

export function AiJobMatchConversation({
  messages,
  pending,
  latestQuestion,
  quickReplyOptions,
  followUpTurns,
  hasSearched,
  onSend,
  onSkipQuestion,
  onShowResultsNow,
  historyAction,
  inputFooter,
}: {
  messages: AiChatMessage[];
  pending: boolean;
  latestQuestion: string | null;
  quickReplyOptions: string[];
  followUpTurns: number;
  hasSearched: boolean;
  onSend: (message: string) => void;
  onSkipQuestion: () => void;
  onShowResultsNow: () => void;
  historyAction?: ReactNode;
  inputFooter?: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [draft, setDraft] = useState("");
  const { copy, locale } = useI18n();
  const text = copy.ai;

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

  const showChips = Boolean(
    latestQuestion && quickReplyOptions.length > 0 && !pending,
  );
  const canShowResultsEarly = followUpTurns >= 2;

  return (
    <div className="flex w-full flex-col">
      <div
        ref={scrollRef}
        className="flex min-h-[min(52dvh,28rem)] max-h-[56dvh] flex-col gap-3 overflow-y-auto px-1 pb-2"
        aria-label={locale === "kk" ? "Сұхбат" : "Диалог подбора"}
      >
        {!messages.length && !hasSearched ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ChatCenteredText className="size-6" weight="bold" aria-hidden />
            </span>
            <p className="text-sm font-medium text-foreground">{text.emptyPrompt}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{text.subtitle}</p>
            {Array.isArray(text.starters) && text.starters.length ? (
              <div className="mt-3 w-full max-w-sm space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {text.startersTitle}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {text.starters.slice(0, 6).map((starter) => (
                    <Button
                      key={starter}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left text-sm font-normal leading-snug"
                      onClick={() => submit(starter)}
                    >
                      {starter}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((message, index) => (
            <AiMessageBubble key={`${message.role}-${index}`} message={message} />
          ))
        )}

        {pending ? <AiThinkingState /> : null}

        {showChips ? (
          <div className="flex flex-col gap-3 border-t border-border/50 pt-3">
            <AiClarificationOptions
              options={quickReplyOptions}
              disabled={pending}
              onPick={submit}
              onRequestCustom={() => {
                textareaRef.current?.focus();
              }}
              customLabel={text.customAnswer}
              groupLabel={text.quickRepliesGroup}
            />
            <div className="flex flex-wrap gap-2">
              {canShowResultsEarly ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  disabled={pending}
                  onClick={onShowResultsNow}
                >
                  <Play className="size-4" weight="bold" aria-hidden />
                  {text.showVacanciesNow}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                disabled={pending}
                onClick={onSkipQuestion}
              >
                <SkipForward className="size-4" weight="bold" aria-hidden />
                {text.skipStep}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border/60 pt-3">
        {inputFooter}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {historyAction}
          <Link
            to="/vacancies"
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {copy.publicHome.browseCta}
          </Link>
        </div>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder={text.inputPlaceholder}
          aria-label={text.inputLabel}
          disabled={pending}
          className="mt-2 min-h-[5.5rem] resize-y text-base leading-relaxed"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{text.privacy}</p>
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            onClick={() => submit()}
            disabled={pending || !draft.trim()}
            className="min-w-[8rem] gap-2"
          >
            {pending ? <Spinner data-icon="inline-start" className="size-4" /> : null}
            {text.primaryCta}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Collapsible block for advanced criteria editing — keeps the main flow light. */
export function AiCriteriaToggle({
  open,
  onOpenChange,
  children,
  label,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="border-b border-border/50 pb-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-start gap-2 px-0 text-muted-foreground hover:text-foreground"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
      >
        <ListBullets className="size-4 shrink-0" weight="bold" aria-hidden />
        {label}
      </Button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
