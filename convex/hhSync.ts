import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { fetchHhVacanciesPageSafe, normalizeHhVacancy } from "./lib/hh";

export const syncHHVacancies = internalAction({
  args: {},
  handler: async (ctx: any): Promise<any> => {
    const syncedAt = Date.now();
    const seenSourceIds: string[] = [];
    const embeddingRefreshIds: any[] = [];

    let page = 0;
    let pages = 1;
    let lastError: string | undefined;

    while (page < pages) {
      const fetched = await fetchHhVacanciesPageSafe(page);
      if (!fetched.ok) {
        lastError = fetched.error;
        break;
      }
      const payload = fetched.data;
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

    const archived =
      lastError === undefined
        ? (
            await ctx.runMutation(internal.vacancies.archiveStaleHhVacancies, {
              activeSourceIds: seenSourceIds,
              syncedAt,
            })
          ).archived
        : 0;

    return {
      syncedAt,
      seen: seenSourceIds.length,
      refreshedEmbeddings: embeddingRefreshIds.length,
      archived,
      ...(lastError ? { error: lastError, completed: false } : { completed: true }),
    };
  },
});
