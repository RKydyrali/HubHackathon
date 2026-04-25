import { useParams, useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { useI18n } from "@/lib/i18n";
import { HiringAssistantPanel } from "./HiringAssistantPanel";

export function HiringAssistantPage() {
  const { chatId } = useParams();
  const [params] = useSearchParams();
  const { locale } = useI18n();
  const vacancyId = params.get("vacancyId") ?? undefined;

  return (
    <>
      <PageHeader
        title={locale === "kk" ? "AI найм көмекшісі" : "AI-ассистент найма"}
        subtitle={
          locale === "kk"
            ? "Кандидаттарды сипаттама бойынша сүзіңіз, вакансия мәтінін бір чатта жақсартыңыз."
            : "Подбирайте кандидатов по описанию роли и улучшайте текст вакансии в одном диалоге."
        }
      />
      <div className="container-app max-w-6xl py-4 pb-24 md:pb-10">
        <HiringAssistantPanel chatId={chatId} initialVacancyId={vacancyId} />
      </div>
    </>
  );
}
