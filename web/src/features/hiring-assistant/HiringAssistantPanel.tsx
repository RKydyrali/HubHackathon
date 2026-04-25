import { MagnifyingGlass, Trash } from "@phosphor-icons/react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: unknown;
};

export function HiringAssistantPanel({
  chatId,
  initialVacancyId,
}: {
  chatId?: string;
  initialVacancyId?: string;
}) {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const convexAuth = useConvexAuth();
  const currentUser = useQuery(api.users.getSelf, convexAuth.isAuthenticated ? {} : "skip");
  const sendTurn = useAction(api.recruiterAssistantActions.sendTurn);
  const deleteChat = useMutation(api.recruiterAssistant.deleteChat);
  const chats = useQuery(api.recruiterAssistant.listChats, currentUser?.role === "employer" ? {} : "skip");
  const savedMessages = useQuery(
    api.recruiterAssistant.getChatMessages,
    chatId && currentUser?.role === "employer"
      ? { chatId: chatId as Id<"recruiterAiChats"> }
      : "skip",
  );
  const activeChat = useQuery(
    api.recruiterAssistant.getChat,
    chatId && currentUser?.role === "employer" ? { chatId: chatId as Id<"recruiterAiChats"> } : "skip",
  );

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [vacancyId, setVacancyId] = useState<string | undefined>(initialVacancyId);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVacancyId(initialVacancyId ?? activeChat?.vacancyId ?? undefined);
  }, [initialVacancyId, activeChat?.vacancyId]);

  const visibleMessages: ChatMessage[] = useMemo(
    () =>
      (savedMessages ?? []).map((m) => ({
        role: m.role as ChatMessage["role"],
        content: m.content,
        metadata: m.metadata,
      })),
    [savedMessages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length, pending]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) {
      return;
    }
    setDraft("");
    setPending(true);
    try {
      const res = await sendTurn({
        chatId: chatId ? (chatId as Id<"recruiterAiChats">) : undefined,
        vacancyId: vacancyId ? (vacancyId as Id<"vacancies">) : undefined,
        message: text,
        createChat: !chatId,
      });
      if (res.chatId && !chatId) {
        navigate(`/employer/hiring-assistant/${res.chatId}`, { replace: true });
      }
    } catch (e) {
      toast.error(locale === "kk" ? "Жіберу сәтсіз аяқталды" : "Не удалось отправить", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPending(false);
    }
  }, [chatId, draft, locale, navigate, pending, sendTurn, vacancyId]);

  const loading =
    currentUser === undefined ||
    (Boolean(chatId) && (savedMessages === undefined || activeChat === undefined));

  if (currentUser && currentUser.role !== "employer") {
    return (
      <p className="text-sm text-muted-foreground">
        {locale === "kk" ? "Тек жұмыс беруші үшін." : "Доступно только работодателю."}
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden rounded-2xl border bg-card/60 p-3 lg:block">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {locale === "kk" ? "Диалогтар" : "Диалоги"}
        </p>
        <ul className="space-y-1">
          {(chats ?? []).map((c) => (
            <li key={c._id}>
              <Link
                to={`/employer/hiring-assistant/${c._id}`}
                className={cn(
                  "block rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted",
                  c._id === chatId ? "bg-primary/10 text-primary" : "text-foreground",
                )}
              >
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => navigate("/employer/hiring-assistant")}
        >
          {locale === "kk" ? "Жаңа" : "Новый"}
        </Button>
      </aside>

      <div className="flex min-h-[420px] flex-col rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MagnifyingGlass className="size-4 text-primary" weight="bold" />
            {activeChat?.title ?? (locale === "kk" ? "Жаңа диалог" : "Новый диалог")}
          </div>
          {chatId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                void (async () => {
                  await deleteChat({ chatId: chatId as Id<"recruiterAiChats"> });
                  navigate("/employer/hiring-assistant");
                })();
              }}
            >
              <Trash className="size-4" weight="bold" />
              {locale === "kk" ? "Жою" : "Удалить"}
            </Button>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading ? (
            <LoadingSkeleton variant="rows" />
          ) : visibleMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "kk"
                ? "Рөлді немесе идеал қызметкерді сипаттаңыз. Вакансияны жақсартқыңыз келсе, карточкадан осы бетті ашыңыз."
                : "Опишите роль или идеального кандидата. Чтобы улучшить вакансию, откройте ассистент из карточки вакансии — тогда подтянется контекст."}
            </p>
          ) : (
            visibleMessages.map((m, idx) => (
              <div key={`${idx}-${m.role}-${m.content.slice(0, 24)}`}>
                <div className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[90%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground"
                        : "max-w-[90%] rounded-2xl rounded-bl-md border bg-background px-3 py-2 text-sm leading-relaxed"
                    }
                  >
                    {m.content}
                  </div>
                </div>
                {m.role === "assistant" && m.metadata && typeof m.metadata === "object" ? (
                  <>
                    <AssistantExtras metadata={m.metadata as Record<string, unknown>} locale={locale} />
                    <AssistantJobExtras metadata={m.metadata as Record<string, unknown>} locale={locale} />
                  </>
                ) : null}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              locale === "kk"
                ? "Мысалы: 5 жыл тәжірибелі электрик, вахта..."
                : "Например: электрик, вахта, 5+ лет, Актау..."
            }
            rows={3}
            className="resize-none"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" onClick={() => void handleSend()} disabled={pending || !draft.trim()}>
              {pending ? <Spinner className="size-4" /> : locale === "kk" ? "Жіберу" : "Отправить"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantJobExtras({
  metadata,
  locale,
}: {
  metadata: Record<string, unknown>;
  locale: "ru" | "kk";
}) {
  const job = metadata.jobSuggestions;
  if (!job || typeof job !== "object") {
    return null;
  }
  const j = job as Record<string, unknown>;
  const issues = j.issues;
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-dashed bg-muted/20 p-3 text-xs">
      <p className="font-semibold text-foreground">
        {locale === "kk" ? "Вакансия ұсыныстары" : "Правки вакансии"}
      </p>
      {j.titleSuggestion ? (
        <p>
          <span className="font-medium">{locale === "kk" ? "Тақырып" : "Заголовок"}: </span>
          {String(j.titleSuggestion)}
        </p>
      ) : null}
      {j.salaryWording ? (
        <p>
          <span className="font-medium">{locale === "kk" ? "Зарплата формуласы" : "Формулировка зарплаты"}: </span>
          {String(j.salaryWording)}
        </p>
      ) : null}
      {j.requirementsRewrite ? (
        <p className="whitespace-pre-wrap text-muted-foreground">{String(j.requirementsRewrite)}</p>
      ) : null}
      {Array.isArray(j.missingFields) && j.missingFields.length ? (
        <p className="text-amber-700 dark:text-amber-400">
          {(locale === "kk" ? "Толтырылмаған: " : "Не хватает: ") + j.missingFields.map(String).join(", ")}
        </p>
      ) : null}
      {Array.isArray(issues) && issues.length ? (
        <ul className="space-y-1">
          {(issues as Record<string, unknown>[]).map((it, i) => (
            <li key={i} className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">
              [{String(it.severity ?? "")}] {String(it.message ?? "")}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AssistantExtras({
  metadata,
  locale,
}: {
  metadata: Record<string, unknown>;
  locale: "ru" | "kk";
}) {
  const cards = metadata.candidateCards;
  if (!Array.isArray(cards) || !cards.length) {
    return null;
  }
  return (
    <div className="mt-2 space-y-2 rounded-xl border bg-muted/30 p-3 text-xs">
      <p className="font-semibold text-foreground">{locale === "kk" ? "Сәйкестік" : "Совпадения"}</p>
      <ul className="space-y-2">
        {cards.slice(0, 8).map((raw, i) => {
          const c = raw as Record<string, unknown>;
          return (
            <li key={i} className="rounded-lg border bg-card p-2">
              <div className="flex flex-wrap justify-between gap-1 font-medium">
                <span>{String(c.fullName ?? "")}</span>
                <span className="text-primary">
                  {typeof c.matchScore === "number" ? `${c.matchScore}%` : ""}
                </span>
              </div>
              <p className="text-muted-foreground">{String(c.city ?? "")}</p>
              {Array.isArray(c.reasons) ? (
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {c.reasons.map((r, j) => (
                    <li key={j}>{String(r)}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
