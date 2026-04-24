import { ConvexError, v } from "convex/values";

import { api, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { getUserByClerkId, requireClerkIdentity } from "./lib/auth";
import { DEFAULT_MATCH_LIMIT } from "./lib/constants";
import {
  buildNotificationDedupeKey,
  isStrongMatch,
  normalizeMatchScore,
} from "./lib/domain";
import {
  buildScreeningAnalysisPrompt,
  buildScreeningQuestionsPrompt,
  buildVacancyGenerationPrompt,
} from "./lib/prompts";
import {
  requestEmbedding,
  requestStructuredJson,
  screeningAnalysisSchema,
  screeningQuestionsSchema,
  vacancyGenerationSchema,
} from "./lib/openrouter";

function buildVacancyEmbeddingText(vacancy: {
  title: string;
  description: string;
  city: string;
}): string {
  return [vacancy.title, vacancy.city, vacancy.description].join("\n");
}

function buildProfileEmbeddingText(profile: {
  fullName: string;
  city: string;
  bio?: string;
  skills: string[];
  resumeText?: string;
}): string {
  return [
    profile.fullName,
    profile.city,
    profile.bio ?? "",
    profile.skills.join(", "),
    profile.resumeText ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const generateVacancy = action({
  args: { rawText: v.string() },
  handler: async (_ctx: any, args: { rawText: string }): Promise<any> => {
    return requestStructuredJson(
      "vacancy_generation",
      buildVacancyGenerationPrompt(args.rawText),
      vacancyGenerationSchema,
    );
  },
});

export const generateScreeningQuestions = action({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx: any, args: { vacancyId: any }): Promise<any> => {
    const vacancy = await ctx.runQuery(internal.vacancies.getForAi, {
      vacancyId: args.vacancyId,
    });

    return requestStructuredJson(
      "screening_questions",
      buildScreeningQuestionsPrompt(vacancy),
      screeningQuestionsSchema,
    );
  },
});

export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (_ctx: any, args: { text: string }): Promise<number[]> =>
    requestEmbedding(args.text),
});

export const analyzeScreening = action({
  args: { applicationId: v.id("applications") },
  handler: async (ctx: any, args: { applicationId: any }): Promise<any> => {
    return ctx.runAction(internal.ai.analyzeScreeningInternal, {
      applicationId: args.applicationId,
    });
  },
});

export const analyzeScreeningInternal = internalAction({
  args: { applicationId: v.id("applications") },
  handler: async (ctx: any, args: { applicationId: any }): Promise<any> => {
    const { application, vacancy } = await ctx.runQuery(
      internal.applications.getForAnalysis,
      {
        applicationId: args.applicationId,
      },
    );

    if (!application.screeningAnswers?.length) {
      return null;
    }

    const analysis = await requestStructuredJson(
      "screening_analysis",
      buildScreeningAnalysisPrompt({
        vacancyTitle: vacancy.title,
        vacancyDescription: vacancy.description,
        screeningAnswers: application.screeningAnswers,
      }),
      screeningAnalysisSchema,
      { complex: true },
    );

    return ctx.runMutation(internal.applications.saveScreeningAnalysis, {
      applicationId: args.applicationId,
      aiScore: analysis.score,
      aiSummary: analysis.summary,
    });
  },
});

export const refreshProfileEmbedding = internalAction({
  args: { profileId: v.id("profiles") },
  handler: async (ctx: any, args: { profileId: any }): Promise<any> => {
    const profile = await ctx.runQuery(internal.profiles.getForMatching, {
      profileId: args.profileId,
    });
    const text = buildProfileEmbeddingText(profile);
    const embedding = await requestEmbedding(text);
    const updatedProfile = await ctx.runMutation(internal.profiles.setEmbedding, {
      profileId: args.profileId,
      embedding,
    });

    if (!updatedProfile) {
      return null;
    }

    const matches = await getMatchingVacanciesForEmbedding(ctx, embedding, 12);
    for (const match of matches) {
      if (!isStrongMatch(match.matchScore)) {
        continue;
      }
      await ctx.runAction(internal.notifications.dispatchNotification, {
        userId: profile.userId,
        type: "strong_match",
        dedupeKey: buildNotificationDedupeKey({
          type: "strong_match",
          recipientUserId: String(profile.userId),
          entityId: String(match.vacancy._id),
        }),
        title: "New strong vacancy match",
        body: `${match.vacancy.title} in ${match.vacancy.city} matched your profile (${match.matchScore}%).`,
      });
    }

    return updatedProfile;
  },
});

export const refreshVacancyEmbedding = internalAction({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx: any, args: { vacancyId: any }): Promise<any> => {
    const vacancy = await ctx.runQuery(internal.vacancies.getForAi, {
      vacancyId: args.vacancyId,
    });
    const text = buildVacancyEmbeddingText(vacancy);
    const embedding = await requestEmbedding(text);
    const updatedVacancy = await ctx.runMutation(internal.vacancies.setEmbedding, {
      vacancyId: args.vacancyId,
      embedding,
    });

    if (!updatedVacancy || updatedVacancy.status !== "published") {
      return updatedVacancy;
    }

    const matches = await getMatchingSeekersForEmbedding(ctx, embedding, 12);

    for (const match of matches) {
      if (!isStrongMatch(match.matchScore)) {
        continue;
      }

      await ctx.runAction(internal.notifications.dispatchNotification, {
        userId: match.profile.userId,
        type: "strong_match",
        dedupeKey: buildNotificationDedupeKey({
          type: "strong_match",
          recipientUserId: String(match.profile.userId),
          entityId: String(updatedVacancy._id),
        }),
        title: "New strong vacancy match",
        body: `${updatedVacancy.title} in ${updatedVacancy.city} matched your profile (${match.matchScore}%).`,
      });

      if (updatedVacancy.ownerUserId) {
        await ctx.runAction(internal.notifications.dispatchNotification, {
          userId: updatedVacancy.ownerUserId,
          type: "strong_match",
          dedupeKey: buildNotificationDedupeKey({
            type: "strong_match",
            recipientUserId: String(updatedVacancy.ownerUserId),
            entityId: String(updatedVacancy._id),
            secondaryId: String(match.profile._id),
          }),
          title: "New strong seeker match",
          body: `${match.profile.fullName} matched ${updatedVacancy.title} (${match.matchScore}%).`,
        });
      }
    }

    return updatedVacancy;
  },
});

async function getMatchingVacanciesForEmbedding(
  ctx: any,
  embedding: number[] | undefined,
  limit: number,
): Promise<
  Array<{ vacancy: any; rawScore: number; matchScore: number }>
> {
  if (!embedding?.length) {
    return [];
  }
  const hits = await ctx.vectorSearch("vacancies", "by_embedding", {
    vector: embedding,
    limit: Math.min(limit, 50),
  });
  const vacancies = await ctx.runQuery(internal.vacancies.fetchByIds, {
    ids: hits.map((hit: { _id: string }) => hit._id),
  });
  const scoreMap = new Map(
    hits.map((hit: { _id: string; _score: number }) => [String(hit._id), hit._score]),
  );

  return vacancies
    .filter(
      (vacancy: any) =>
        vacancy.status === "published" &&
        (vacancy.source === "native" || vacancy.source === "hh"),
    )
    .map((vacancy: any) => {
      const rawScore = Number(scoreMap.get(String(vacancy._id)) ?? -1);
      return {
        vacancy,
        rawScore,
        matchScore: normalizeMatchScore(rawScore),
      };
    });
}

async function getMatchingSeekersForEmbedding(
  ctx: any,
  embedding: number[] | undefined,
  limit: number,
): Promise<
  Array<{ profile: any; rawScore: number; matchScore: number }>
> {
  if (!embedding?.length) {
    return [];
  }
  const hits = await ctx.vectorSearch("profiles", "by_embedding", {
    vector: embedding,
    limit: Math.min(limit, 50),
  });
  const profiles = await ctx.runQuery(internal.profiles.fetchByIds, {
    ids: hits.map((hit: { _id: string }) => hit._id),
  });
  const scoreMap = new Map(
    hits.map((hit: { _id: string; _score: number }) => [String(hit._id), hit._score]),
  );

  return profiles.map((profile: any) => {
    const rawScore = Number(scoreMap.get(String(profile._id)) ?? -1);
    return {
      profile,
      rawScore,
      matchScore: normalizeMatchScore(rawScore),
    };
  });
}

export const getMatchingVacancies = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx: any,
    args: { limit?: number },
  ): Promise<Array<{ vacancy: any; rawScore: number; matchScore: number }>> => {
    const identity = await requireClerkIdentity(ctx);
    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    });
    if (!user) {
      throw new ConvexError("User is not initialized");
    }

    const profile = await ctx.runQuery(internal.profiles.getByUserId, {
      userId: user._id,
    });
    if (!profile?.embedding?.length) {
      return [];
    }

    return getMatchingVacanciesForEmbedding(
      ctx,
      profile.embedding,
      args.limit ?? DEFAULT_MATCH_LIMIT,
    );
  },
});

export const getMatchingSeekers = action({
  args: {
    vacancyId: v.id("vacancies"),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx: any,
    args: { vacancyId: any; limit?: number },
  ): Promise<Array<{ profile: any; rawScore: number; matchScore: number }>> => {
    const identity = await requireClerkIdentity(ctx);
    const user = await ctx.runQuery(internal.users.getByClerkIdInternal, {
      clerkId: identity.subject,
    });
    if (!user) {
      throw new ConvexError("User is not initialized");
    }

    const vacancy = await ctx.runQuery(internal.vacancies.getForAi, {
      vacancyId: args.vacancyId,
    });
    if (vacancy.source !== "native") {
      return [];
    }
    if (user.role !== "admin" && vacancy.ownerUserId !== user._id) {
      throw new ConvexError("Forbidden");
    }
    if (!vacancy.embedding?.length) {
      return [];
    }

    return getMatchingSeekersForEmbedding(
      ctx,
      vacancy.embedding,
      args.limit ?? DEFAULT_MATCH_LIMIT,
    );
  },
});
