import { ChatCircleText } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { useMobile } from "@/hooks/useMobile";
import type { Vacancy } from "@/types/domain";
import { VacancyTable } from "@/features/vacancies/VacancyTable";
import { SeekerMatchList } from "@/components/product/SeekerMatchList";
import { useVacancySeekerMatches } from "@/features/vacancies/useVacancySeekerMatches";
import { HiringAssistantPanel } from "./HiringAssistantPanel";

function normalizeChatParam(value: string | null): "open" | "closed" {
  return value === "open" ? "open" : "closed";
}

export function AiHiringPage() {
  const { locale } = useI18n();
  const isMobile = useMobile();
  const [params, setParams] = useSearchParams();

  const vacancyId = params.get("vacancyId") ?? undefined;
  const chatId = params.get("chatId") ?? undefined;
  const chatState = normalizeChatParam(params.get("chat"));
  const chatOpen = chatState === "open";
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  const rows = useQuery(api.vacancies.listByOwner);
  const vacancies = useMemo<Vacancy[]>(
    () => rows?.map((row: { vacancy: Vacancy }) => row.vacancy) ?? [],
    [rows],
  );

  const activeVacancy = useQuery(
    api.vacancies.getVacancy,
    vacancyId ? { vacancyId: vacancyId as Id<"vacancies"> } : "skip",
  );

  const matches = useVacancySeekerMatches(vacancyId);

  const title = locale === "kk" ? "AI найм" : "AI найм";
  const subtitle =
    locale === "kk"
      ? "Вакансияны таңдаңыз, кандидаттарды қараңыз, және чатта талаптарды нақтылаңыз."
      : "Выберите вакансию, посмотрите кандидатов и уточняйте требования в чате.";

  function setParam(next: Record<string, string | undefined>, replace = false) {
    const nextParams = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v) nextParams.delete(k);
      else nextParams.set(k, v);
    }
    setParams(nextParams, { replace });
  }

  function onPickVacancy(v: Vacancy) {
    setParam({ vacancyId: String(v._id) });
  }

  function openChat() {
    setParam({ chat: "open" });
  }

  function closeChat() {
    setParam({ chat: "closed" });
    openButtonRef.current?.focus();
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button ref={openButtonRef} type="button" onClick={openChat} aria-haspopup="dialog">
            <ChatCircleText data-icon="start" weight="bold" />
            {locale === "kk" ? "Чатты ашу" : "Открыть чат"}
          </Button>
        }
      />

      <main className="container-app min-w-0 max-w-6xl space-y-4 py-4 pb-10">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <SectionPanel
            title={locale === "kk" ? "Вакансиялар" : "Вакансии"}
            subtitle={locale === "kk" ? "Белсенді вакансияны таңдаңыз." : "Выберите активную вакансию."}
            className="min-w-0"
          >
            <VacancyTable
              vacancies={vacancies}
              ownerView
              employerSlim
              onOwnerRowNavigate={onPickVacancy}
              stickyHeader
              stickyHeaderClassName="bg-background/95 backdrop-blur"
            />
          </SectionPanel>

          <div className="min-w-0 space-y-4">
            <SectionPanel
              title={locale === "kk" ? "Белсенді вакансия" : "Активная вакансия"}
              subtitle={
                vacancyId
                  ? locale === "kk"
                    ? "Контекст чатқа беріледі."
                    : "Контекст будет передан в чат."
                  : locale === "kk"
                    ? "Сол жақтан вакансия таңдаңыз."
                    : "Выберите вакансию слева."
              }
              patterned
            >
              {activeVacancy ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{activeVacancy.title}</p>
                  <p className="text-xs text-muted-foreground">{String(activeVacancy.status ?? "")}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === "kk" ? "Вакансия таңдалмаған." : "Вакансия не выбрана."}
                </p>
              )}
            </SectionPanel>

            <SectionPanel
              title={locale === "kk" ? "Үздік кандидаттар" : "Подходящие кандидаты"}
              subtitle={
                vacancyId
                  ? locale === "kk"
                    ? "Match% бойынша кандидаттар."
                    : "Кандидаты по Match%."
                  : locale === "kk"
                    ? "Алдымен вакансияны таңдаңыз."
                    : "Сначала выберите вакансию."
              }
              patterned
            >
              {!vacancyId ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "kk" ? "Кандидаттарды көру үшін вакансия таңдаңыз." : "Выберите вакансию, чтобы увидеть кандидатов."}
                </p>
              ) : matches.loading ? (
                <p className="text-sm text-muted-foreground">{locale === "kk" ? "Жүктелуде…" : "Загрузка…"}</p>
              ) : matches.unavailable ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "kk"
                    ? "Тек JumysAI ішіндегі (native) вакансиялар үшін қолжетімді."
                    : "Доступно только для native-вакансий."}
                </p>
              ) : matches.matches.length ? (
                <SeekerMatchList matches={matches.matches} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === "kk" ? "Әзірге дәл сәйкес кандидаттар табылмады." : "Пока не найдено подходящих кандидатов."}
                </p>
              )}
            </SectionPanel>
          </div>
        </div>
      </main>

      <Sheet open={chatOpen} onOpenChange={(open) => (open ? openChat() : closeChat())}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[100dvh] max-h-[100dvh] w-full p-0"
              : "w-[min(100vw,440px)] p-0 sm:max-w-none"
          }
        >
          <div className="min-h-0 flex-1 overflow-hidden p-4 pt-14">
            <HiringAssistantPanel
              chatId={chatId}
              initialVacancyId={vacancyId}
              embed
              onChatId={(nextChatId) => {
                setParam({ chatId: nextChatId }, true);
              }}
              autoFocus
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

