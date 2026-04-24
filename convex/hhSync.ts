import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { normalizeHhVacancy, type HhVacancy } from "./lib/hh";

type HhResponse = {
  items: HhVacancy[];
  pages: number;
  page: number;
};

async function fetchHhPage(page: number): Promise<HhResponse> {
  const url = new URL("https://api.hh.ru/vacancies");
  url.searchParams.set("area", "159");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "100");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HH sync failed on page ${page}: ${response.status}`);
  }
  return response.json() as Promise<HhResponse>;
}

export const syncHHVacancies = internalAction({
  args: {},
  handler: async (ctx: any): Promise<any> => {
    const syncedAt = Date.now();
    const seenSourceIds: string[] = [];
    const embeddingRefreshIds: any[] = [];

    let page = 0;
    let pages = 1;

    while (page < pages) {
      const payload = await fetchHhPage(page);
      pages = payload.pages;

      for (const item of payload.items) {
        const normalized = normalizeHhVacancy(item);
        seenSourceIds.push(normalized.sourceId);

        const result = await ctx.runMutation(internal.vacancies.upsertHhVacancy, {
          ...normalized,
          syncedAt,
        });

        if (result.changed && result.textChanged) {
          embeddingRefreshIds.push(result.vacancyId);
        }
      }

      page += 1;
    }

    for (const vacancyId of embeddingRefreshIds) {
      await ctx.runAction(internal.ai.refreshVacancyEmbedding, {
        vacancyId,
      });
    }

    const archival = await ctx.runMutation(internal.vacancies.archiveStaleHhVacancies, {
      activeSourceIds: seenSourceIds,
      syncedAt,
    });

    return {
      syncedAt,
      seen: seenSourceIds.length,
      refreshedEmbeddings: embeddingRefreshIds.length,
      archived: archival.archived,
    };
  },
});
