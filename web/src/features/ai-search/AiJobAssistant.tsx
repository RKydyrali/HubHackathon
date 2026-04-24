import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AiUnavailableState } from "@/components/feedback/AiUnavailableState";
import { Button } from "@/components/shared/Button";
import { Switch } from "@/components/ui/switch";
import { api, type Id } from "@/lib/convex-api";
import { useI18n, type Locale } from "@/lib/i18n";
import type { Vacancy } from "@/types/domain";
import { AiChatHistorySidebar } from "./AiChatHistorySidebar";
import { AiChatPanel } from "./AiChatPanel";
import { AiCriteriaPanel } from "./AiCriteriaPanel";
import { AiResultsPanel } from "./AiResultsPanel";
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
  dashboard = false,
}: {
  initialQuery?: string;
  chatId?: string;
  compact?: boolean;
  basePath?: string;
  dashboard?: boolean;
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
  const initialSentRef = useRef(false);
  const navigate = useNavigate();
  const { copy, locale } = useI18n();
  const convexAuth = useConvexAuth();

  const sendMessage = useAction(api.aiJobAssistant.sendMessage);
  const compareVacancies = useAction(api.aiJobAssistant.compareVacancies);
  const startChat = useMutation(api.aiJobAssistant.startChat);
  const renameChat = useMutation(api.aiJobAssistant.renameChat);
  const deleteChat = useMutation(api.aiJobAssistant.deleteChat);
  const currentUser = useQuery(api.users.getSelf, convexAuth.isAuthenticated ? {} : "skip");
  const canPersist = currentUser?.role === "seeker" || currentUser?.role === "admin";
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
    () => savedMessages?.map((message) => ({ role: message.role, content: message.content })) ?? [],
    [savedMessages],
  );
  const activeMessageScope = chatId ?? "temporary";
  const scopedMessages = messageScope === activeMessageScope ? messages : [];
  const visibleMessages = scopedMessages.length ? scopedMessages : savedChatMessages;

  useEffect(() => {
    if (!initialQuery || initialSentRef.current) return;
    initialSentRef.current = true;
    void handleSend(initialQuery);
    // This bootstraps a shared-link query exactly once; handleSend intentionally uses the current draft state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const visibleMatches = useMemo(() => {
    if (matches.totalCount || !hasSearched || !fallbackVacancies?.length) {
      return matches;
    }
    return buildFallbackMatches(fallbackVacancies, locale);
  }, [fallbackVacancies, hasSearched, locale, matches]);

  async function handleSend(message: string) {
    const userMessage: AiChatMessage = { role: "user", content: message };
    const startingMessages = visibleMessages;
    setMessageScope(activeMessageScope);
    setMessages([...startingMessages, userMessage]);
    setPending(true);
    setHasSearched(true);
    setAiUnavailable(false);

    try {
      const response = await sendMessage({
        chatId: chatId ? (chatId as Id<"aiJobChats">) : undefined,
        message,
        previousCriteria: criteria,
        followUpTurns,
        limit: compact ? 6 : 12,
        createChat: Boolean(canPersist && !chatId),
        useProfileContext: Boolean(canPersist && useProfileContext),
      });
      const nextCriteria = response.extraction.knownCriteria as AiJobCriteria;
      const assistantMessage: AiChatMessage = { role: "assistant", content: response.assistantMessage };
      const nextMessages = [...startingMessages, userMessage, assistantMessage];
      setCriteria(nextCriteria);
      setMatches(response.matches as AiMatchGroups);
      setLatestQuestion(response.extraction.nextQuestion);
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
          matchedVacancyIds: response.matches.all.map((item) => item.vacancy._id),
        });
      } else {
        setMessages(nextMessages);
      }
    } catch {
      setAiUnavailable(true);
      setLatestQuestion(null);
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
    const response = await compareVacancies({
      vacancyIds: Array.from(selectedIds).slice(0, 3) as Array<Id<"vacancies">>,
      criteria,
    });
    setComparisonRows(response.rows as AssistantComparisonRow[]);
    setComparisonSummary(response.summary);
  }

  function startNewChat() {
    setMessageScope("temporary");
    setMessages([]);
    setCriteria(emptyCriteria);
    setMatches(emptyMatches);
    setLatestQuestion(null);
    setFollowUpTurns(0);
    setHasSearched(false);
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

  return (
    <div className={compact ? "flex flex-col gap-4" : "grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(360px,0.72fr)]"}>
      {!compact && canPersist ? (
        <aside className="order-3 xl:order-none">
          <AiChatHistorySidebar
            chats={chats}
            activeChatId={chatId}
            basePath={basePath}
            onNewChat={startNewChat}
            onRenameChat={(chat) => void renameExistingChat(chat)}
            onDeleteChat={(chat) => void deleteExistingChat(chat)}
          />
        </aside>
      ) : null}

      <section className="flex min-w-0 flex-col gap-4">
        <AiChatPanel
          messages={visibleMessages}
          pending={pending}
          latestQuestion={latestQuestion}
          followUpTurns={followUpTurns}
          onSend={handleSend}
          onSkipQuestion={() => setLatestQuestion(null)}
          onShowResultsNow={showResultsNow}
        />
        {!canPersist && visibleMessages.length > 0 ? (
          <div className="rounded-xl border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {saveNotice ??
                  (locale === "kk"
                    ? "Кіргеннен кейін бұл таңдауды тарихқа сақтауға болады."
                    : "После входа можно сохранить этот подбор в истории.")}
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => void saveCurrentChat()}>
                {copy.common.save}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        {canPersist ? (
          <div className="surface-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Profile context</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {profileContextSummary.length
                    ? profileContextSummary.join(" / ")
                    : dashboard
                      ? "Using your seeker profile when enough data is available."
                      : "Signed-in searches can use your seeker profile."}
                </p>
              </div>
              <Switch
                size="sm"
                checked={useProfileContext}
                onCheckedChange={setUseProfileContext}
                aria-label="Use profile context"
              />
            </div>
          </div>
        ) : null}
        <AiCriteriaPanel
          criteria={criteria}
          onChange={handleCriteriaChange}
          onReset={resetCriteria}
          onRunAgain={() =>
            void handleSend(locale === "kk" ? "Қазіргі критерийлер бойынша қайта таңда" : "Подобрать снова по текущим критериям")
          }
        />
        {aiUnavailable ? (
          <AiUnavailableState
            onRetry={() => void handleSend(locale === "kk" ? "AI таңдауды қайтала" : "Повтори AI-подбор")}
          />
        ) : null}
        {hasSearched ? (
          <AiResultsPanel
            matches={visibleMatches}
            selectedIds={selectedIds}
            onToggleCompare={toggleCompare}
            onCompare={() => void runComparison()}
            onRelaxDistrict={() => handleCriteriaChange({ ...criteria, district: null })}
            onIncludeHh={() => handleCriteriaChange({ ...criteria, sourcePreference: "any" })}
          />
        ) : null}
        <VacancyComparePanel
          rows={comparisonRows}
          summary={comparisonSummary}
          onClear={() => {
            setSelectedIds(new Set());
            setComparisonRows([]);
            setComparisonSummary("");
          }}
        />
      </section>
    </div>
  );
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
