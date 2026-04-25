import { useParams, useSearchParams } from "react-router-dom";

import { useI18n } from "@/lib/i18n";
import { AiJobAssistant } from "./AiJobAssistant";

export function AiSearchPage() {
  const { chatId } = useParams();
  const [params] = useSearchParams();
  const { copy } = useI18n();

  return (
    <main className="container-app max-w-6xl py-4 pb-10 sm:py-6">
      <div className="mb-4 text-center sm:mb-5 sm:text-left">
        <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {copy.ai.title}
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground sm:mx-0">{copy.ai.subtitle}</p>
      </div>
      <AiJobAssistant chatId={chatId} initialQuery={params.get("q") ?? undefined} basePath="/ai-search" />
    </main>
  );
}
