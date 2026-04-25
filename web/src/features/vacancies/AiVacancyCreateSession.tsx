import { ArrowLeft } from "@phosphor-icons/react";
import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/shared/Button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { pickVariant } from "./assistantMessagePicker";
import {
  type DraftKey,
  buildCreateRawText,
  buildSubmitCandidate,
  canCreateNativeDraft,
  emptyDraft,
  getFilledDraftKeys,
  getMissingDraftKeys,
  mergeUserMessageIntoDraft,
  reconcileDraftWithGenerated,
} from "./createModeModel";
import { buildCreateNativePayload, type GeneratedVacancyFields } from "./vacancyFormModel";
import {
  type GuidedQuickPickPoolsMap,
  primaryMissingKey,
  suggestGuidedQuickPicks,
} from "./suggestVacancyCreateChips";
import { VacancyPreview } from "./VacancyPreview";

const DEBOUNCE_MS = 520;

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fieldLabel(key: DraftKey, ev: Record<string, unknown>): string {
  const k = `draftField${key.charAt(0).toUpperCase()}${key.slice(1)}` as const;
  const value = ev[k];
  return typeof value === "string" ? value : key;
}

function buildFollowUp(
  missing: DraftKey[],
  ev: Record<string, unknown>,
  seed: string,
  turn: number,
): string {
  const first = missing[0];
  if (!first) {
  const v = ev.followUpAlmost as readonly string[];
    return pickVariant(v, seed, turn);
  }
  const key = `followUp${first.charAt(0).toUpperCase()}${first.slice(1)}` as const;
  const arr = ev[key] as readonly string[] | undefined;
  if (arr?.length) return pickVariant(arr, seed, turn);
  return "";
}

function buildClarify(
  key: DraftKey,
  ev: Record<string, unknown>,
  seed: string,
  turn: number,
): string {
  const k = `clarify${key.charAt(0).toUpperCase()}${key.slice(1)}` as const;
  const arr = ev[k] as readonly string[] | undefined;
  if (arr?.length) return pickVariant(arr, seed, turn);
  return "";
}

function formatAck(
  keys: DraftKey[],
  templates: readonly string[],
  ev: Record<string, unknown>,
  seed: string,
  turn: number,
): string {
  const labels = keys.map((k) => fieldLabel(k, ev)).join(", ");
  const t = pickVariant(templates, seed, turn);
  return t.replace("{{fields}}", labels);
}

export function AiVacancyCreateSession({
  onCancel,
  backLabel,
}: {
  onCancel: () => void;
  backLabel: string;
}) {
  const { copy, locale } = useI18n();
  const ev = copy.employerVacancies as Record<string, unknown>;
  const evStr = copy.employerVacancies;
  const pools = evStr.guidedQuickPickPools as GuidedQuickPickPoolsMap;
  const navigate = useNavigate();
  const generateVacancy = useAction(api.ai.generateVacancy);
  const createVacancy = useMutation(api.vacancies.createNativeVacancy);

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    { id: id(), role: "assistant", content: evStr.createInviteFreeForm },
  ]);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [input, setInput] = useState("");
  const [userTurn, setUserTurn] = useState(0);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [lastValid, setLastValid] = useState<GeneratedVacancyFields | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genSeq = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const rawText = useMemo(() => buildCreateRawText(draft, locale), [draft, locale]);
  const canRequestPreview = rawText.trim().length >= 12;

  const runGenerate = useCallback(
    async (raw: string) => {
      const mySeq = ++genSeq.current;
      setGenLoading(true);
      setGenError(false);
      try {
        const out = (await generateVacancy({ rawText: raw })) as GeneratedVacancyFields;
        if (genSeq.current !== mySeq) return;
        setLastValid(out);
        setDraft((d) => reconcileDraftWithGenerated(d, out));
        setGenError(false);
      } catch {
        if (genSeq.current !== mySeq) return;
        setGenError(true);
      } finally {
        if (genSeq.current === mySeq) {
          setGenLoading(false);
        }
      }
    },
    [generateVacancy],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!canRequestPreview) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runGenerate(rawText.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [canRequestPreview, rawText, runGenerate]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const missing = useMemo(() => getMissingDraftKeys(draft), [draft]);
  const canSubmit = canCreateNativeDraft(draft, lastValid, locale);
  const primaryMiss = primaryMissingKey(draft);
  const almostMode = conversationStarted && missing.length === 0 && !canSubmit;
  const quickPicks = useMemo(
    () =>
      suggestGuidedQuickPicks(primaryMiss, draft, locale, pools, {
        almostMode,
      }),
    [primaryMiss, draft, locale, pools, almostMode],
  );
  const showQuickPicks = conversationStarted && !canSubmit && quickPicks.length === 4;

  const helperLine = useMemo(() => {
    if (canSubmit) return evStr.createDraftHelperReady;
    if (missing.length === 0) {
      return evStr.createDraftHelperAdd.replace("{{list}}", evStr.createDraftHelperDetailHint);
    }
    const parts = missing.map((m) => fieldLabel(m, ev));
    return evStr.createDraftHelperAdd.replace("{{list}}", parts.join(", "));
  }, [canSubmit, missing, ev, evStr]);

  const onRetry = () => {
    if (canRequestPreview) void runGenerate(rawText.trim());
  };

  const onSend = (textOverride?: string) => {
    const t = (textOverride ?? input).trim();
    if (!t) return;
    if (!textOverride) setInput("");

    const primaryBefore = primaryMissingKey(draft);
    const { next, filledThisTurn } = mergeUserMessageIntoDraft(t, draft, locale);
    setDraft(next);
    setUserTurn((c) => c + 1);

    const isFirstUserMessage = !conversationStarted;
    if (!conversationStarted) {
      setConversationStarted(true);
    }

    setMessages((m) => [...m, { id: id(), role: "user", content: t }]);

    const missAfter = getMissingDraftKeys(next);
    const primaryAfter = missAfter[0];
    const seed = `${missAfter.join()}-${userTurn + 1}`;
    const parts: string[] = [];

    if (isFirstUserMessage) {
      const filled = getFilledDraftKeys(next);
      if (filled.length > 0) {
        parts.push(
          formatAck(
            filled,
            ev.ackInitialFilled as readonly string[],
            ev,
            seed,
            userTurn,
          ),
        );
      } else {
        parts.push(
          pickVariant(ev.ackInitialMinimal as readonly string[], seed, userTurn),
        );
      }
      const follow = buildFollowUp(missAfter, ev, seed, userTurn + 1);
      if (follow) parts.push(follow);
    } else {
      const unclear =
        primaryBefore !== undefined &&
        primaryBefore === primaryAfter &&
        t.length > 0;
      if (unclear) {
        const line = buildClarify(primaryBefore, ev, seed, userTurn + 1);
        if (line) {
          parts.push(line);
        } else {
          const followOnly = buildFollowUp(missAfter, ev, seed, userTurn + 1);
          if (followOnly) parts.push(followOnly);
        }
      } else {
        if (filledThisTurn.length > 1) {
          parts.push(
            formatAck(
              filledThisTurn,
              ev.ackUnderstood as readonly string[],
              ev,
              seed,
              userTurn,
            ),
          );
        }
        const follow = buildFollowUp(missAfter, ev, seed, userTurn + 1);
        if (follow) parts.push(follow);
      }
    }

    if (parts.length) {
      setMessages((m) => [
        ...m,
        { id: id(), role: "assistant", content: parts.join("\n\n") },
      ]);
    }
  };

  const onCreateDraft = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const c = buildSubmitCandidate(draft, lastValid, locale);
      if (!c.ok) {
        toast.error(c.error);
        return;
      }
      const payload = buildCreateNativePayload({
        title: c.values.title,
        description: c.values.description,
        district: c.values.district,
        salaryMin: c.values.salaryMin,
        salaryMax: c.values.salaryMax,
      });
      const created = await createVacancy(payload);
      toast.success(evStr.createSuccessNavigating);
      if (created?._id) {
        navigate(`/employer/vacancies/${created._id as Id<"vacancies">}`);
      }
    } catch {
      toast.error(copy.common.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 pl-0">
          <ArrowLeft className="size-4" weight="bold" />
          {backLabel}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm",
            "max-h-[min(70vh,640px)] lg:max-h-[min(78vh,720px)]",
          )}
        >
          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed transition-opacity duration-200",
                  msg.role === "user"
                    ? "ml-auto bg-primary/10 text-foreground"
                    : "mr-auto border border-border/60 bg-background/80 text-foreground",
                )}
              >
                {msg.content}
              </div>
            ))}
            {conversationStarted && genLoading && !genError ? (
              <p className="mr-auto text-xs text-muted-foreground">{evStr.extractDraftCaption}</p>
            ) : null}
          </div>

          {showQuickPicks ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {quickPicks.map((c) => (
                  <Button
                    key={c.value}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-auto min-h-9 whitespace-normal px-2.5 py-2 text-left text-xs leading-snug"
                    onClick={() => onSend(c.value)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
              <Separator className="my-1" />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {evStr.guidedCustomAnswerLabel}
                </Label>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={conversationStarted ? 2 : 4}
              placeholder={
                conversationStarted
                  ? evStr.guidedCustomAnswerPlaceholder
                  : evStr.chatPlaceholderInitial
              }
              className={cn("resize-y", conversationStarted ? "min-h-[64px]" : "min-h-[100px]")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button type="button" onClick={() => onSend()} className="w-full sm:w-auto">
              {evStr.chatSend}
            </Button>
          </div>

          {canSubmit ? (
            <div
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5"
              role="status"
            >
              <p className="text-sm font-medium text-foreground">{evStr.readyToCreateTitle}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{evStr.readyToCreateSubtitle}</p>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">{helperLine}</p>

          <Button
            type="button"
            onClick={() => void onCreateDraft()}
            disabled={!canSubmit || submitting}
          >
            {submitting ? evStr.createDraftSubmitting : evStr.createDraft}
          </Button>
        </div>

        <VacancyPreview
          draft={draft}
          lastValid={lastValid}
          genLoading={genLoading}
          genError={genError}
          onRetry={onRetry}
          rawTextSummary={rawText}
          hasUserStarted={conversationStarted}
        />
      </div>
    </div>
  );
}
