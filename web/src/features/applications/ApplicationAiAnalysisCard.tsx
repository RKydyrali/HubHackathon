import { Sparkle } from "@phosphor-icons/react";

import { AiAdvisoryNotice, AiExplainabilityList } from "@/components/product/AiTrust";
import { Progress } from "@/components/ui/progress";
import { AiSummaryRichText } from "@/features/applications/AiSummaryRichText";
import { useI18n } from "@/lib/i18n";
import type { ApplicantWithProfile } from "@/types/domain";

function buildMatchFactors(item: ApplicantWithProfile, locale: "ru" | "kk"): string[] {
  const skills = item.profile?.skills ?? [];
  const hasSkills = skills.length > 0;
  const hasResume = Boolean(item.profile?.bio || item.profile?.resumeText);
  const loc = item.vacancy?.city && item.profile?.city;

  if (locale === "kk") {
    return [
      hasSkills
        ? `Дағдылар: ${skills.slice(0, 3).join(", ")}${skills.length > 3 ? "…" : ""}.`
        : "Дағдылар толық көрсетілмеген.",
      hasResume
        ? "Өтінім/профиль мәтіні бар — қолмен тексеруге ыңғайлы."
        : "Өтінім мәтіні шектеулі — сұрақтарға сүйеніңіз.",
      loc
        ? `Орын: кандидат — ${item.profile!.city}, вакансия — ${item.vacancy!.city}.`
        : "Географиялық сәйкестікті қолмен растаңыз.",
    ];
  }

  return [
    hasSkills
      ? `Навыки в профиле: ${skills.slice(0, 3).join(", ")}${skills.length > 3 ? "…" : ""}.`
      : "Навыки указаны не полностью.",
    hasResume
      ? "Есть текст отклика/резюме — удобно для ручной проверки."
      : "Мало контекста по опыту — опирайтесь на ответы на вопросы.",
    loc
      ? `Локация: кандидат — ${item.profile!.city}, вакансия — ${item.vacancy!.city}.`
      : "Географическое совпадение стоит подтвердить вручную.",
  ];
}

export function ApplicationAiAnalysisCard({ item }: { item: ApplicantWithProfile }) {
  const { copy, locale } = useI18n();
  const aiScore = item.application.aiScore;
  const factors = buildMatchFactors(item, locale);

  return (
    <section className="surface-panel overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.07] to-card shadow-sm">
      <div className="border-b border-primary/10 bg-card/50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sparkle className="size-5" weight="bold" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">{copy.applications.ai}</h2>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{copy.applications.employerAiHint}</p>
            </div>
          </div>
          {typeof aiScore === "number" ? (
            <div className="min-w-[7.5rem] rounded-xl border border-border/80 bg-background p-3 text-center shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">{copy.applications.match}</p>
              <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-foreground">{aiScore}%</p>
              <Progress value={aiScore} className="mt-3 h-2" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {item.application.aiSummary ? (
          <AiSummaryRichText text={item.application.aiSummary} />
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.applications.noSummary}</p>
        )}

        <AiExplainabilityList factors={factors} title={copy.applications.whyThisScore} className="bg-background/80" />
        <AiAdvisoryNotice title={copy.applications.advisoryTitle} body={copy.applications.advisory} className="border-primary/15" />
      </div>
    </section>
  );
}
