import { ChatCenteredText } from "@phosphor-icons/react";

import { Button } from "@/components/shared/Button";
import { useI18n } from "@/lib/i18n";

export function AiQuestionCard({
  question,
  showResultsNow,
  onShowResults,
  onSkip,
}: {
  question: string;
  showResultsNow: boolean;
  onShowResults: () => void;
  onSkip: () => void;
}) {
  const { locale } = useI18n();

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ChatCenteredText weight="bold" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{question}</p>
          <p className="mt-1 leading-6 text-muted-foreground">
            {locale === "kk"
              ? "Тек вакансияларды дәлірек таңдауға көмектесетін сұрақтарды қоямыз."
              : "Спрашиваем только то, что помогает точнее подобрать вакансии."}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-0 sm:pl-12">
        {showResultsNow ? (
          <Button type="button" size="sm" onClick={onShowResults}>
            {locale === "kk" ? "Вакансияларды қазір көрсету" : "Показать вакансии сейчас"}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onSkip}>
          {locale === "kk" ? "Сұрақты өткізу" : "Пропустить вопрос"}
        </Button>
      </div>
    </div>
  );
}
