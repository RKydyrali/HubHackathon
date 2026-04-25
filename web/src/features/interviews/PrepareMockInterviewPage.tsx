import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { AiMessageBubble } from "@/features/ai-search/AiMessageBubble";
import { AiThinkingState } from "@/features/ai-search/AiThinkingState";
import type { AiChatMessage } from "@/features/ai-search/aiSearchTypes";

export function PrepareMockInterviewPage() {
  const { vacancyId } = useParams();
  const { copy } = useI18n();
  const mc = copy.mockInterview;
  const [sessionId, setSessionId] = useState<Id<"mockInterviewSessions"> | null>(null);
  const [sessionBootError, setSessionBootError] = useState(false);
  const [sessionBootPending, setSessionBootPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [finalizePending, setFinalizePending] = useState(false);

  const getOrCreate = useMutation(api.coach.getOrCreateActiveMockInterviewSession);
  const runMockInterview = useAction(api.ai.runMockInterview);

  const vacancy = useQuery(
    api.vacancies.getVacancy,
    vacancyId ? { vacancyId: vacancyId as Id<"vacancies"> } : "skip",
  );

  const session = useQuery(
    api.coach.getMockInterviewSession,
    sessionId ? { sessionId } : "skip",
  );

  useEffect(() => {
    if (!vacancyId) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setSessionId(null);
      setSessionBootError(false);
      setDraft("");
      setSessionBootPending(true);
    });
    void (async () => {
      try {
        const s = await getOrCreate({ vacancyId: vacancyId as Id<"vacancies"> });
        if (!cancelled) {
          setSessionId(s._id);
        }
      } catch (e) {
        if (!cancelled) {
          setSessionBootError(true);
          toast.error(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setSessionBootPending(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vacancyId, getOrCreate]);

  const chatMessages: AiChatMessage[] = (session?.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo?.({ top: node.scrollHeight, behavior: "smooth" });
  }, [chatMessages.length, pending, finalizePending]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !sessionId || !vacancyId || pending || finalizePending) return;
    if (session?.status !== "in_progress") return;
    setDraft("");
    setPending(true);
    try {
      const result = await runMockInterview({
        sessionId,
        vacancyId: vacancyId as Id<"vacancies">,
        message: text,
      });
      if (!result.ok) {
        toast.error("error" in result ? result.error : mc.debriefError);
      } else if (!result.finalized && result.aiFailed) {
        toast.message(mc.aiUnavailable);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }, [
    draft,
    sessionId,
    vacancyId,
    pending,
    finalizePending,
    session?.status,
    runMockInterview,
    mc.debriefError,
    mc.aiUnavailable,
  ]);

  const handleFinalize = useCallback(async () => {
    if (!sessionId || !vacancyId || pending || finalizePending) return;
    if (session?.status !== "in_progress") return;
    setFinalizePending(true);
    try {
      const result = await runMockInterview({
        sessionId,
        vacancyId: vacancyId as Id<"vacancies">,
        finalize: true,
      });
      if (!result.ok || !("finalized" in result) || !result.finalized) {
        toast.error(!result.ok && "error" in result ? result.error : mc.debriefError);
      } else {
        toast.success(mc.completedTitle);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setFinalizePending(false);
    }
  }, [sessionId, vacancyId, pending, finalizePending, session?.status, runMockInterview, mc]);

  const sessionLoading =
    vacancy === undefined ||
    sessionBootPending ||
    (Boolean(sessionId) && session === undefined);

  if (sessionBootError) {
    return (
      <>
        <PageHeader title={mc.pageTitle} />
        <div className="container-app py-5">
          <EmptyState title={copy.common.error} />
        </div>
      </>
    );
  }

  if (sessionLoading) {
    return (
      <>
        <PageHeader title={mc.pageTitle} />
        <div className="container-app py-5">
          <LoadingSkeleton variant="page" />
        </div>
      </>
    );
  }

  if (sessionId && session === null) {
    return (
      <>
        <PageHeader title={mc.pageTitle} />
        <div className="container-app py-5">
          <EmptyState title={copy.common.error} />
        </div>
      </>
    );
  }

  if (!vacancyId || !vacancy) {
    return (
      <>
        <PageHeader title={mc.pageTitle} />
        <div className="container-app py-5">
          <EmptyState title={copy.vacancies.notFound} />
        </div>
      </>
    );
  }

  const completed = session?.status === "completed";

  return (
    <>
      <PageHeader
        title={mc.pageTitle}
        subtitle={`${vacancy.title} · ${vacancy.city}`}
        action={
          <Link to={`/vacancies/${vacancy._id}`}>
            <Button variant="outline">{mc.backToVacancy}</Button>
          </Link>
        }
      />
      <main className="container-app pb-8 pt-5">
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="surface-panel rounded-2xl p-5" aria-label={mc.pageTitle}>
            <div
              ref={scrollRef}
              className="flex min-h-[320px] max-h-[52dvh] flex-col gap-3 overflow-y-auto rounded-2xl border bg-muted/35 p-4"
            >
              {chatMessages.length ? (
                chatMessages.map((message, index) => (
                  <AiMessageBubble
                    key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                    message={message}
                  />
                ))
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">{mc.emptyPrompt}</p>
                  {Array.isArray(mc.starters) && mc.starters.length ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {mc.startersTitle}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {mc.starters.slice(0, 6).map((starter) => (
                          <Button
                            key={starter}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto min-h-10 justify-start whitespace-normal py-2 text-left text-sm font-normal leading-snug"
                            onClick={() => {
                              setDraft(starter);
                              textareaRef.current?.focus();
                            }}
                          >
                            {starter}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {(pending || finalizePending) && <AiThinkingState />}
            </div>

            {!completed ? (
              <div className="mt-4 flex flex-col gap-3">
                <Textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={mc.inputPlaceholder}
                  rows={3}
                  disabled={pending || finalizePending || !sessionId}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void handleSend()}
                    disabled={pending || finalizePending || !draft.trim() || !sessionId}
                  >
                    <PaperPlaneTilt data-icon="inline-start" weight="bold" />
                    {mc.send}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void handleFinalize()}
                    disabled={
                      pending ||
                      finalizePending ||
                      !sessionId ||
                      !session ||
                      session.messages.length === 0
                    }
                  >
                    {finalizePending ? mc.finalizing : mc.finalize}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 rounded-2xl border bg-card p-4">
                <h2 className="text-lg font-semibold text-foreground">{mc.reportTitle}</h2>
                {session?.finalScore != null ? (
                  <p className="text-sm text-muted-foreground">
                    {mc.score}: <span className="font-semibold text-foreground">{session.finalScore}</span>
                  </p>
                ) : null}
                {session?.hiringRecommendation ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {mc.recommendation}
                    </p>
                    <p className="mt-1 text-sm leading-6">{session.hiringRecommendation}</p>
                  </div>
                ) : null}
                {session?.strengths?.length ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {mc.strengths}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                      {session.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {session?.improvements?.length ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {mc.improvements}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                      {session.improvements.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
