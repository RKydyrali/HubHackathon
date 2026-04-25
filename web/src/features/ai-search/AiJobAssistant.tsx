import { ClockCounterClockwise, LinkSimple, UserCircle } from "@phosphor-icons/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/shared/Button";
import { AiChatSkeleton } from "@/components/skeletons/AiChatSkeleton";
import { AiResultsSkeleton } from "@/components/skeletons/AiResultsSkeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api, type Id } from "@/lib/convex-api";
import { useI18n, type Locale } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";
import { AiChatHistorySidebar } from "./AiChatHistorySidebar";
import { AiCriteriaChips } from "./AiCriteriaChips";
import { AiCriteriaToggle, AiJobMatchConversation } from "./AiJobMatchConversation";
import { AiResultsTable } from "./AiResultsTable";
import { VacancyComparePanel } from "./VacancyComparePanel";
import {
  clearTemporaryAssistantState,
  loadTemporaryAssistantState,
  saveTemporaryAssistantState,
} from "./aiSearchStorage";
import {
  emptyCriteria,
  emptyMatches,
  type AiChatMessage,
  type AiJobCriteria,
  type AiMatchGroups,
  type AssistantComparisonRow,
} from "./aiSearchTypes";

export function AiJobAssistant({
  initialQuery,
  chatId,
  compact = false,
  basePath = "/ai-search",
}: {
  initialQuery?: string;
  chatId?: string;
  compact?: boolean;
  basePath?: string;
}) {
  const stored = typeof window !== "undefined" ? loadTemporaryAssistantState() : null;
  const [messages, setMessages] = useState<AiChatMessage[]>(stored?.messages ?? []);
  const [messageScope, setMessageScope] = useState(chatId ?? "temporary");
  const [criteria, setCriteria] = useState<AiJobCriteria>(stored?.criteria ?? emptyCriteria);
  const [matches, setMatches] = useState<AiMatchGroups>(emptyMatches);
  const [latestQuestion, setLatestQuestion] = useState<string | null>(null);
  const [followUpTurns, setFollowUpTurns] = useState(0);
  const [pending, setPending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparisonRows, setComparisonRows] = useState<AssistantComparisonRow[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState("");
  const [useProfileContext, setUseProfileContext] = useState(true);
  const [profileContextSummary, setProfileContextSummary] = useState<string[]>([]);
  const [quickReplyOptions, setQuickReplyOptions] = useState<string[]>([]);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const initialSentRef = useRef(false);
  const navigate = useNavigate();
  const { copy, locale } = useI18n();
  const convexAuth = useConvexAuth();

  const sendMessage = useAction(api.aiJobAssistant.sendMessage);
  const compareVacancies = useAction(api.aiJobAssistant.compareVacancies);
  const discussVacancies = useAction(api.aiJobAssistant.discussVacancies);
  const startChat = useMutation(api.aiJobAssistant.startChat);
  const appendMessage = useMutation(api.aiJobAssistant.appendMessage);
  const renameChat = useMutation(api.aiJobAssistant.renameChat);
  const deleteChat = useMutation(api.aiJobAssistant.deleteChat);
  const currentUser = useQuery(api.users.getSelf, convexAuth.isAuthenticated ? {} : "skip");
  const employerOwnedVacancies = useQuery(
    api.vacancies.listByOwner,
    currentUser?.role === "employer" ? {} : "skip",
  );
  const canPersist =
    currentUser?.role === "seeker" || currentUser?.role === "admin" || currentUser?.role === "employer";
  const canUseSeekerProfileInAssistant =
    currentUser?.role === "seeker" || currentUser?.role === "admin";
  const profile = useQuery(api.profiles.getMyProfile, canUseSeekerProfileInAssistant ? {} : "skip");
  const chats = useQuery(api.aiJobAssistant.listChats, canPersist ? {} : "skip");
  const savedMessages = useQuery(
    api.aiJobAssistant.getChatMessages,
    chatId && canPersist ? { chatId: chatId as Id<"aiJobChats"> } : "skip",
  );
  const fallbackVacancies = useQuery(api.vacancies.listPublic, {
    source: criteria.sourcePreference === "any" ? undefined : criteria.sourcePreference,
    district: criteria.district ?? undefined,
    limit: 8,
  });

  const savedChatMessages = useMemo(
    () =>
      savedMessages?.map((message: { role: AiChatMessage["role"]; content: string }) => ({
        role: message.role,
        content: message.content,
      })) ?? [],
    [savedMessages],
  );
  const activeMessageScope = chatId ?? "temporary";
  const scopedMessages = messageScope === activeMessageScope ? messages : [];
  const visibleMessages = scopedMessages.length ? scopedMessages : savedChatMessages;
  const useProfileForRequest = canUseSeekerProfileInAssistant && useProfileContext;

  useEffect(() => {
    if (!initialQuery || initialSentRef.current) return;
    initialSentRef.current = true;
    void handleSend(initialQuery);
    // This bootstraps a shared-link query exactly once; handleSend intentionally uses the current draft state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const visibleMatches = useMemo(() => {
    const base =
      matches.totalCount || !hasSearched || !fallbackVacancies?.length
        ? matches
        : buildFallbackMatches(fallbackVacancies, locale);
    return mergeEmployerOwnedIntoMatches(
      base,
      currentUser?.role === "employer" ? employerOwnedVacancies : undefined,
      locale,
    );
  }, [
    currentUser?.role,
    employerOwnedVacancies,
    fallbackVacancies,
    hasSearched,
    locale,
    matches,
  ]);

  const loadingSavedChat = Boolean(chatId && canPersist && savedMessages === undefined);
  const loadingHistory = Boolean(canPersist && chats === undefined);
  const loadingProfile = Boolean(canUseSeekerProfileInAssistant && profile === undefined);
  const pageLoading = currentUser === undefined || loadingSavedChat || loadingHistory || loadingProfile;

  async function handleSend(message: string) {
    const userMessage: AiChatMessage = { role: "user", content: message };
    const startingMessages = visibleMessages;
    setMessageScope(activeMessageScope);
    setMessages([...startingMessages, userMessage]);
    setPending(true);
    setHasSearched(true);
    setAiUnavailable(false);

    try {
      if (shouldDiscussLoadedVacancies(message, visibleMatches.all.length, latestQuestion)) {
        const vacancyIds = visibleMatches.all
          .slice(0, 8)
          .map((item) => item.vacancy._id as Id<"vacancies">);
        const response = await discussVacancies({
          question: message,
          vacancyIds,
          criteria,
        });
        const assistantMessage: AiChatMessage = { role: "assistant", content: response.answer };
        const nextMessages = [...startingMessages, userMessage, assistantMessage];
        setMessages(nextMessages);
        setLatestQuestion(null);
        setQuickReplyOptions([]);
        if (chatId) {
          const activeChatId = chatId as Id<"aiJobChats">;
          void persistDiscussionMessages(activeChatId, message, response.answer, vacancyIds);
        } else if (!canPersist) {
          saveTemporaryAssistantState({
            messages: nextMessages,
            criteria,
            matchedVacancyIds: vacancyIds,
          });
        }
        return;
      }

      const response = await sendMessage({
        chatId: chatId ? (chatId as Id<"aiJobChats">) : undefined,
        message,
        previousCriteria: criteria,
        followUpTurns,
        limit: compact ? 6 : 12,
        createChat: Boolean(canPersist && !chatId),
        useProfileContext: useProfileForRequest,
      });
      const nextCriteria = response.extraction.knownCriteria as AiJobCriteria;
      const assistantMessage: AiChatMessage = { role: "assistant", content: response.assistantMessage };
      const nextMessages = [...startingMessages, userMessage, assistantMessage];
      setCriteria(nextCriteria);
      setMatches(response.matches as AiMatchGroups);
      setLatestQuestion(response.extraction.nextQuestion);
      const ex = response.extraction as typeof response.extraction & { quickReplyOptions?: string[] };
      setQuickReplyOptions(ex.quickReplyOptions ?? []);
      setFollowUpTurns((current) => current + 1);
      setAiUnavailable(Boolean(response.usedFallback || response.matches.aiUnavailable));
      setProfileContextSummary(response.profileContextSummary ?? []);
      if (response.chatId && !chatId) {
        setMessageScope(response.chatId);
        setMessages(nextMessages);
        navigate(`${basePath}/${response.chatId}`, { replace: true });
      } else if (!canPersist) {
        setMessages(nextMessages);
        saveTemporaryAssistantState({
          messages: nextMessages,
          criteria: nextCriteria,
          matchedVacancyIds: response.matches.all.map(
            (item: AiMatchGroups["all"][number]) => item.vacancy._id,
          ),
        });
      } else {
        setMessages(nextMessages);
      }
    } catch {
      setAiUnavailable(true);
      setLatestQuestion(null);
      setQuickReplyOptions([]);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            locale === "kk"
              ? "AI уақытша қолжетімсіз, бірақ қарапайым іздеу нәтижелерін көруге болады."
              : "AI-подбор временно недоступен, но можно посмотреть обычные результаты поиска.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function persistDiscussionMessages(
    activeChatId: Id<"aiJobChats">,
    userContent: string,
    assistantContent: string,
    vacancyIds: Array<Id<"vacancies">>,
  ) {
    try {
      await appendMessage({
        chatId: activeChatId,
        role: "user",
        content: userContent,
        metadata: {
          intent: "ask_question",
          criteria,
          vacancyIds,
          kind: "discussion_user_message",
        },
      });
      await appendMessage({
        chatId: activeChatId,
        role: "assistant",
        content: assistantContent,
        metadata: {
          intent: "ask_question",
          criteria,
          vacancyIds,
          kind: "discussion_ai",
        },
      });
    } catch {
      // Discussion persistence should not block the visible assistant answer.
    }
  }

  function handleCriteriaChange(nextCriteria: AiJobCriteria) {
    setCriteria(nextCriteria);
    if (!canPersist) {
      saveTemporaryAssistantState({
        messages: visibleMessages,
        criteria: nextCriteria,
        matchedVacancyIds: matches.all.map((item) => item.vacancy._id),
      });
    }
  }

  function resetCriteria() {
    setCriteria(emptyCriteria);
    setMatches(emptyMatches);
    setComparisonRows([]);
    setComparisonSummary("");
    if (!canPersist) {
      clearTemporaryAssistantState();
    }
  }

  async function saveCurrentChat() {
    const firstUserMessage = messages.find((message) => message.role === "user")?.content;
    try {
      await startChat({
        initialMessage: firstUserMessage,
        extractedCriteria: criteria,
        matchedVacancyIds: matches.all.map((item) => item.vacancy._id as Id<"vacancies">),
      });
      setSaveNotice(locale === "kk" ? "Таңдау тарихқа сақталды." : "Подбор сохранен в истории.");
    } catch {
      setSaveNotice(
        locale === "kk"
          ? "Таңдауды сақтау үшін аккаунтқа кіріңіз."
          : "Войдите в аккаунт, чтобы сохранить подбор.",
      );
    }
  }

  function showResultsNow() {
    setLatestQuestion(null);
    setQuickReplyOptions([]);
    setHasSearched(true);
    if (!matches.totalCount && fallbackVacancies?.length) {
      setMatches(buildFallbackMatches(fallbackVacancies, locale));
    }
  }

  function toggleCompare(vacancyId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(vacancyId)) {
        next.delete(vacancyId);
      } else if (next.size < 3) {
        next.add(vacancyId);
      }
      return next;
    });
  }

  async function runComparison() {
    if (selectedIds.size < 2) return;
    try {
      const response = await compareVacancies({
        vacancyIds: Array.from(selectedIds).slice(0, 3) as Array<Id<"vacancies">>,
        criteria,
      });
      setComparisonRows(response.rows as AssistantComparisonRow[]);
      setComparisonSummary(response.summary);
    } catch {
      setComparisonRows([]);
      setComparisonSummary(
        locale === "kk"
          ? "Салыстыру уақытша қолжетімсіз. Вакансия карточкаларын ашып, шарттарды тексеріңіз."
          : "Сравнение временно недоступно. Откройте карточки вакансий и проверьте условия.",
      );
    }
  }

  function startNewChat() {
    setMessageScope("temporary");
    setMessages([]);
    setCriteria(emptyCriteria);
    setMatches(emptyMatches);
    setLatestQuestion(null);
    setFollowUpTurns(0);
    setHasSearched(false);
    setQuickReplyOptions([]);
    setCriteriaOpen(false);
    setAiUnavailable(false);
    setSaveNotice(null);
    setSelectedIds(new Set());
    setComparisonRows([]);
    setComparisonSummary("");
    setProfileContextSummary([]);
    clearTemporaryAssistantState();
    navigate(basePath);
  }

  async function renameExistingChat(chat: NonNullable<typeof chats>[number]) {
    const nextTitle = window.prompt("Rename chat", chat.title)?.trim();
    if (!nextTitle || nextTitle === chat.title) return;
    await renameChat({ chatId: chat._id, title: nextTitle });
  }

  async function deleteExistingChat(chat: NonNullable<typeof chats>[number]) {
    if (!window.confirm(`Delete "${chat.title}"?`)) return;
    await deleteChat({ chatId: chat._id });
    if (chatId === chat._id) {
      startNewChat();
    }
  }

  const historyLabel = locale === "kk" ? "Тарих" : "История";
  const rerunPrompt =
    locale === "kk"
      ? "Қазіргі критерийлер бойынша қайта таңда"
      : "Подобрать снова по текущим критериям";
  const retryPrompt = locale === "kk" ? "AI таңдауды қайтала" : "Повтори AI-подбор";

  const historySheet =
    !compact && canPersist ? (
      <Sheet>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={historyLabel}
            />
          }
        >
          <ClockCounterClockwise weight="bold" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100vw,360px)] p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{historyLabel}</SheetTitle>
            <SheetDescription>{copy.ai.subtitle}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
            <AiChatHistorySidebar
              chats={chats}
              activeChatId={chatId}
              basePath={basePath}
              onNewChat={startNewChat}
              onRenameChat={(c) => void renameExistingChat(c)}
              onDeleteChat={(c) => void deleteExistingChat(c)}
            />
          </div>
        </SheetContent>
      </Sheet>
    ) : null;

  function skipClarification() {
    setLatestQuestion(null);
    setQuickReplyOptions([]);
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-4"
          : "mx-auto flex w-full max-w-6xl flex-col gap-4 px-0 sm:px-1"
      }
    >
      <section className="flex min-w-0 flex-col gap-4">
        {pageLoading ? (
          <>
            <AiChatSkeleton />
            <AiResultsSkeleton />
          </>
        ) : (
          <div
            className={
              compact
                ? "flex flex-col gap-4"
                : "grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]"
            }
          >
            <div className="mx-auto w-full min-w-0 max-w-2xl space-y-3 lg:mx-0">
              {compact ? (
                <AiCriteriaChips
                  criteria={criteria}
                  onChange={handleCriteriaChange}
                  onReset={resetCriteria}
                  onRunAgain={() => void handleSend(rerunPrompt)}
                />
              ) : (
                <AiCriteriaToggle
                  open={criteriaOpen}
                  onOpenChange={setCriteriaOpen}
                  label={copy.ai.criteriaManual}
                >
                  <AiCriteriaChips
                    criteria={criteria}
                    onChange={handleCriteriaChange}
                    onReset={resetCriteria}
                    onRunAgain={() => void handleSend(rerunPrompt)}
                  />
                </AiCriteriaToggle>
              )}

              {!compact && chatId ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (typeof window === "undefined") return;
                      void navigator.clipboard
                        .writeText(window.location.href)
                        .then(() => toast.success(copy.common.linkCopied))
                        .catch(() => toast.error(copy.common.copyFailed));
                    }}
                  >
                    <LinkSimple data-icon="inline-start" weight="bold" />
                    {copy.common.copyLink}
                  </Button>
                </div>
              ) : null}

              {!canPersist && visibleMessages.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p>
                    {saveNotice ??
                      (locale === "kk"
                        ? "Кіргеннен кейін бұл таңдауды тарихқа сақтауға болады."
                        : "После входа можно сохранить этот подбор в истории.")}
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={() => void saveCurrentChat()}>
                    {copy.common.save}
                  </Button>
                </div>
              ) : null}
              {saveNotice && canPersist ? (
                <p className="text-xs text-muted-foreground" role="status">
                  {saveNotice}
                </p>
              ) : null}

              <div className="border-border/60 pb-1">
                <AiJobMatchConversation
                  messages={visibleMessages}
                  pending={pending}
                  latestQuestion={latestQuestion}
                  quickReplyOptions={quickReplyOptions}
                  followUpTurns={followUpTurns}
                  hasSearched={hasSearched}
                  onSend={handleSend}
                  onSkipQuestion={skipClarification}
                  onShowResultsNow={showResultsNow}
                  historyAction={historySheet ?? undefined}
                  inputFooter={
                    !compact ? (
                      <div className="space-y-2">
                        {aiUnavailable ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                            <span className="min-w-0 text-muted-foreground">{copy.ai.unavailableTitle}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleSend(retryPrompt)}
                              disabled={pending}
                            >
                              {copy.common.retry}
                            </Button>
                          </div>
                        ) : null}
                        {canUseSeekerProfileInAssistant ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-sm text-foreground">
                              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                <UserCircle className="size-4 shrink-0" weight="bold" />
                                {copy.ai.profileInSearch}
                              </span>
                              <Switch
                                size="sm"
                                checked={useProfileContext}
                                onCheckedChange={setUseProfileContext}
                                disabled={pending}
                                aria-label={copy.ai.profileInSearch}
                              />
                            </div>
                            {useProfileForRequest && profileContextSummary.length > 0 ? (
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                {profileContextSummary.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {copy.applications.advisory}
                        </p>
                      </div>
                    ) : null
                  }
                />
              </div>
            </div>

            <div className="min-w-0 space-y-3 lg:sticky lg:top-4">
              {hasSearched ? (
                <AiResultsTable
                  matches={visibleMatches}
                  selectedIds={selectedIds}
                  onToggleCompare={toggleCompare}
                  onCompare={() => void runComparison()}
                  onRelaxDistrict={() => handleCriteriaChange({ ...criteria, district: null })}
                  onIncludeHh={() => handleCriteriaChange({ ...criteria, sourcePreference: "any" })}
                />
              ) : (
                <p className="px-1 text-center text-sm text-muted-foreground lg:px-0 lg:text-left">
                  {copy.ai.emptyPrompt}
                </p>
              )}
              <VacancyComparePanel
                rows={comparisonRows}
                summary={comparisonSummary}
                onClear={() => {
                  setSelectedIds(new Set());
                  setComparisonRows([]);
                  setComparisonSummary("");
                }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function shouldDiscussLoadedVacancies(
  message: string,
  matchCount: number,
  latestQuestion: string | null,
): boolean {
  if (matchCount === 0 || latestQuestion) {
    return false;
  }
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (/(^|\s)(ищу|найди|подбери|покажи|нужна|нужен|хочу)\b/.test(normalized)) {
    return false;
  }
  return /(какая|какой|какие|котор|лучше|сравн|где|почему|зарплат|услов|требован|без опыта|подходит|\?)/i.test(
    normalized,
  );
}

function mergeEmployerOwnedIntoMatches(
  groups: AiMatchGroups,
  ownedRows: Array<{ vacancy: Vacancy; applicantCount: number }> | undefined,
  locale: Locale,
): AiMatchGroups {
  if (!ownedRows?.length) {
    return groups;
  }
  const extras: AiMatchGroups["all"] = ownedRows.map((row) => {
    const vacancy = row.vacancy;
    const draftRu = "черновик";
    const draftKk = "жоба күйі";
    const pubRu = "опубликована";
    const pubKk = "жарияланған";
    const yoursRu = "Ваша вакансия";
    const yoursKk = "Сіздің жариялығыңыз";
    const statusLine =
      vacancy.status === "draft"
        ? locale === "kk"
          ? draftKk
          : draftRu
        : vacancy.status === "published"
          ? locale === "kk"
            ? pubKk
            : pubRu
          : locale === "kk"
            ? `мәртебе: ${vacancy.status}`
            : `статус: ${vacancy.status}`;
    return {
      vacancy,
      explanation: [locale === "kk" ? yoursKk : yoursRu, statusLine],
    };
  });
  const existing = new Set(groups.all.map((x) => String(x.vacancy._id)));
  const add = extras.filter((x) => !existing.has(String(x.vacancy._id)));
  if (!add.length) {
    return groups;
  }
  const all = [...add, ...groups.all];
  const best = [...add.slice(0, Math.min(4, add.length)), ...groups.best].slice(0, 4);
  const fastStart = [
    ...add.filter((item) => item.vacancy.source === "native"),
    ...groups.fastStart,
  ].slice(0, 4);
  return {
    ...groups,
    best,
    fastStart,
    all,
    totalCount: all.length,
  };
}

function buildFallbackMatches(vacancies: Vacancy[], locale: Locale): AiMatchGroups {
  const all = vacancies.map((vacancy) => ({
    vacancy,
    explanation: [
      vacancy.source === "native"
        ? locale === "kk"
          ? "JumysAI ішінде өтініш беруге болады"
          : "отклик внутри JumysAI"
        : locale === "kk"
          ? "HH.kz сыртқы вакансиясы"
          : "внешняя вакансия HH.kz",
      vacancy.district
        ? locale === "kk"
          ? "аудан көрсетілген"
          : "район указан в описании"
        : locale === "kk"
          ? "аудан көрсетілмеген"
          : "район не указан",
    ],
  }));
  return {
    best: all.slice(0, 4),
    nearby: all.filter((item) => item.vacancy.district).slice(0, 4),
    fastStart: all.filter((item) => item.vacancy.source === "native").slice(0, 4),
    hh: all.filter((item) => item.vacancy.source === "hh").slice(0, 4),
    all,
    totalCount: all.length,
    aiUnavailable: true,
  };
}
