import { useParams, useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { useI18n } from "@/lib/i18n";
import { AiJobAssistant } from "./AiJobAssistant";

export function AiSearchPage({ dashboard = false }: { dashboard?: boolean }) {
  const { chatId } = useParams();
  const [params] = useSearchParams();
  const { copy } = useI18n();
  const basePath = dashboard ? "/dashboard/ai-search" : "/ai-search";

  return (
    <>
      {dashboard ? null : <PublicNavbar />}
      <PageHeader title={copy.ai.title} subtitle={copy.ai.subtitle} />
      <main className="container-app pb-6 pt-5">
        <AiJobAssistant chatId={chatId} initialQuery={params.get("q") ?? undefined} basePath={basePath} dashboard={dashboard} />
      </main>
    </>
  );
}
