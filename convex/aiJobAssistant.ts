import { ConvexError, v } from "convex/values";

import { api, internal } from "./_generated/api";
import {
  action,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertRole, requireCurrentUser } from "./lib/auth";
import { normalizeMatchScore } from "./lib/domain";
import {
  aiJobAssistantDiscussionSchema,
  aiJobAssistantExtractionSchema,
  applyProfileContextToMatches,
  aiJobCriteriaSchema,
  buildAssistantMatchExplanation,
  compareVacanciesForAssistant,
  criteriaToSearchText,
  emptyAiJobCriteria,
  fallbackExtractCriteria,
  inferChatTitle,
  mergeAiJobCriteria,
  profileContextToSearchText,
  summarizeProfileContext,
  type AiJobCriteria,
  type AssistantProfileContext,
  type AssistantVacancyLike,
} from "./lib/aiJobAssistantSchemas";
import {
  aiJobAssistantExtractionValidator,
  aiJobChatMessageMetadataValidator,
  aiJobChatMessageRoleValidator,
  aiJobCriteriaValidator,
} from "./lib/aiJobAssistantValidators";
import {
  buildAiJobComparisonPrompt,
  buildAiJobCriteriaPrompt,
  buildAiJobDiscussionPrompt,
} from "./lib/prompts";
import {
  requestEmbedding,
  requestStructuredJson,
} from "./lib/openrouter";

const DEFAULT_LIMIT = 12;

type AssistantMatch = {
  vacancy: Doc<"vacancies">;
  explanation: string[];
  matchScore?: number;
  boost: number;
};

type AssistantMatchResponse = {
  best: AssistantMatch[];
  nearby: AssistantMatch[];
  fastStart: AssistantMatch[];
  hh: AssistantMatch[];
  all: AssistantMatch[];
  totalCount: number;
  aiUnavailable: boolean;
};

type SendMessageResponse = {
  chatId: Id<"aiJobChats"> | null;
  extraction: ReturnType<typeof fallbackExtractCriteria>;
  usedFallback: boolean;
  profileContextUsed: boolean;
  profileContextSummary: string[];
  assistantMessage: string;
  matches: AssistantMatchResponse;
};

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAssistantUser(ctx);
    return ctx.db
      .query("aiJobChats")
      .withIndex("by_userId_and_updatedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
  },
});

export const getChat = query({
  args: { chatId: v.id("aiJobChats") },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }
    assertChatAccess(user, chat);
    return chat;
  },
});

export const getChatMessages = query({
  args: { chatId: v.id("aiJobChats") },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return [];
    }
    assertChatAccess(user, chat);
    return ctx.db
      .query("aiJobChatMessages")
      .withIndex("by_chatId_and_createdAt", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .take(100);
  },
});

export const startChat = mutation({
  args: {
    title: v.optional(v.string()),
    initialMessage: v.optional(v.string()),
    extractedCriteria: v.optional(aiJobCriteriaValidator),
    matchedVacancyIds: v.optional(v.array(v.id("vacancies"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const now = Date.now();
    const criteria = args.extractedCriteria ?? emptyAiJobCriteria();
    const chatId = await ctx.db.insert("aiJobChats", {
      userId: user._id,
      title: args.title ?? inferChatTitle(criteria, args.initialMessage ?? ""),
      extractedCriteria: criteria,
      matchedVacancyIds: args.matchedVacancyIds,
      createdAt: now,
      updatedAt: now,
    });

    if (args.initialMessage) {
      await ctx.db.insert("aiJobChatMessages", {
        chatId,
        role: "user",
        content: args.initialMessage,
        createdAt: now,
      });
    }

    return ctx.db.get(chatId);
  },
});

export const appendMessage = mutation({
  args: {
    chatId: v.id("aiJobChats"),
    role: aiJobChatMessageRoleValidator,
    content: v.string(),
    metadata: aiJobChatMessageMetadataValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }
    assertChatAccess(user, chat);
    const now = Date.now();
    const messageId = await ctx.db.insert("aiJobChatMessages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: now,
    });
    await ctx.db.patch(args.chatId, { updatedAt: now });
    return ctx.db.get(messageId);
  },
});

export const saveChat = mutation({
  args: {
    chatId: v.id("aiJobChats"),
    title: v.optional(v.string()),
    extractedCriteria: v.optional(aiJobCriteriaValidator),
    matchedVacancyIds: v.optional(v.array(v.id("vacancies"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }
    assertChatAccess(user, chat);
    await ctx.db.patch(args.chatId, {
      title: args.title ?? chat.title,
      extractedCriteria: args.extractedCriteria ?? chat.extractedCriteria,
      matchedVacancyIds: args.matchedVacancyIds ?? chat.matchedVacancyIds,
      updatedAt: Date.now(),
    });
    return ctx.db.get(args.chatId);
  },
});

export const renameChat = mutation({
  args: { chatId: v.id("aiJobChats"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }
    assertChatAccess(user, chat);
    await ctx.db.patch(args.chatId, { title: args.title, updatedAt: Date.now() });
    return ctx.db.get(args.chatId);
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("aiJobChats") },
  handler: async (ctx, args) => {
    const user = await requireAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return { deleted: false };
    }
    assertChatAccess(user, chat);
    const messages = await ctx.db
      .query("aiJobChatMessages")
      .withIndex("by_chatId_and_createdAt", (q) => q.eq("chatId", args.chatId))
      .take(100);
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    await ctx.db.delete(args.chatId);
    return { deleted: true };
  },
});

export const extractCriteria = action({
  args: {
    message: v.string(),
    previousCriteria: v.optional(aiJobCriteriaValidator),
    followUpTurns: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    return extractCriteriaWithFallback({
      message: args.message,
      previousCriteria: args.previousCriteria,
      followUpTurns: args.followUpTurns ?? 0,
    });
  },
});

export const findMatches = action({
  args: {
    criteria: aiJobCriteriaValidator,
    rawText: v.optional(v.string()),
    limit: v.optional(v.number()),
    useProfileContext: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<AssistantMatchResponse> => {
    const profileContext: AssistantProfileContext | null =
      args.useProfileContext === false
        ? null
        : await ctx.runQuery(internal.aiJobAssistant.getProfileContextForAssistant, {});
    return findMatchesForCriteria(
      ctx,
      aiJobCriteriaSchema.parse(args.criteria),
      args.rawText,
      args.limit ?? DEFAULT_LIMIT,
      profileContext,
    );
  },
});

export const sendMessage = action({
  args: {
    chatId: v.optional(v.id("aiJobChats")),
    message: v.string(),
    previousCriteria: v.optional(aiJobCriteriaValidator),
    followUpTurns: v.optional(v.number()),
    limit: v.optional(v.number()),
    createChat: v.optional(v.boolean()),
    useProfileContext: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SendMessageResponse> => {
    const profileContext: AssistantProfileContext | null =
      args.useProfileContext === false
        ? null
        : await ctx.runQuery(internal.aiJobAssistant.getProfileContextForAssistant, {});
    const extractionResult = await extractCriteriaWithFallback({
      message: args.message,
      previousCriteria: args.previousCriteria,
      followUpTurns: args.followUpTurns ?? 0,
    });
    const criteria = aiJobCriteriaSchema.parse(extractionResult.extraction.knownCriteria);
    const matches = extractionResult.extraction.shouldShowResults
      ? await findMatchesForCriteria(ctx, criteria, args.message, args.limit ?? DEFAULT_LIMIT, profileContext)
      : emptyMatchResponse(false);

    const assistantMessage = buildAssistantReply(
      extractionResult.extraction,
      matches.totalCount,
    );

    let activeChatId = args.chatId;
    if (!activeChatId && args.createChat) {
      const chat: Doc<"aiJobChats"> | null = await ctx.runMutation(api.aiJobAssistant.startChat, {
        initialMessage: args.message,
        extractedCriteria: criteria,
        matchedVacancyIds: matches.all.map((item) => item.vacancy._id),
      });
      activeChatId = chat?._id;
    }

    if (activeChatId) {
      if (args.chatId) {
        await safelyAppendActionMessage(ctx, activeChatId, "user", args.message, {
          criteria,
          kind: "user_message",
        });
      }
      await safelyAppendActionMessage(ctx, activeChatId, "assistant", assistantMessage, {
        intent: extractionResult.extraction.intent,
        criteria,
        vacancyIds: matches.all.map((item) => item.vacancy._id),
        kind: extractionResult.usedFallback ? "fallback" : "ai",
      });
      await safelySaveChat(ctx, activeChatId, criteria, matches.all.map((item) => item.vacancy._id));
    }

    return {
      chatId: activeChatId ?? null,
      extraction: extractionResult.extraction,
      usedFallback: extractionResult.usedFallback,
      profileContextUsed: Boolean(profileContext),
      profileContextSummary: summarizeProfileContext(profileContext),
      assistantMessage,
      matches,
    };
  },
});

export const compareVacancies = action({
  args: {
    vacancyIds: v.array(v.id("vacancies")),
    criteria: aiJobCriteriaValidator,
  },
  handler: async (ctx, args) => {
    const vacancies = await ctx.runQuery(internal.vacancies.fetchByIds, {
      ids: args.vacancyIds.slice(0, 3),
    });
    const criteria = aiJobCriteriaSchema.parse(args.criteria);
    const comparison = compareVacanciesForAssistant(
      vacancies.map(toAssistantVacancy),
      criteria,
    );

    let summary = comparison.summary;
    try {
      const aiSummary = await requestStructuredJson(
        "ai_job_comparison",
        buildAiJobComparisonPrompt({
          criteriaJson: JSON.stringify(criteria),
          comparisonJson: JSON.stringify(comparison.rows),
        }),
        aiJobAssistantDiscussionSchema,
      );
      summary = aiSummary.answer;
    } catch {
      // Deterministic comparison remains useful when AI is unavailable.
    }

    return { ...comparison, summary };
  },
});

export const discussVacancies = action({
  args: {
    question: v.string(),
    vacancyIds: v.array(v.id("vacancies")),
    criteria: aiJobCriteriaValidator,
  },
  handler: async (ctx, args): Promise<{ answer: string }> => {
    const vacancies: Doc<"vacancies">[] = await ctx.runQuery(internal.vacancies.fetchByIds, {
      ids: args.vacancyIds.slice(0, 8),
    });
    const criteria = aiJobCriteriaSchema.parse(args.criteria);
    const safeVacancies: Array<{
      title: string;
      source: "native" | "hh";
      city: string;
      district: string | null;
      salaryMin: number | null;
      salaryMax: number | null;
      description: string;
    }> = vacancies.map((vacancy) => ({
      title: vacancy.title,
      source: vacancy.source,
      city: vacancy.city,
      district: vacancy.district ?? null,
      salaryMin: vacancy.salaryMin ?? null,
      salaryMax: vacancy.salaryMax ?? null,
      description: vacancy.description.slice(0, 700),
    }));

    try {
      return requestStructuredJson(
        "ai_job_discussion",
        buildAiJobDiscussionPrompt({
          question: args.question,
          criteriaJson: JSON.stringify(criteria),
          vacanciesJson: JSON.stringify(safeVacancies),
        }),
        aiJobAssistantDiscussionSchema,
      );
    } catch {
      const comparison = compareVacanciesForAssistant(
        vacancies.map(toAssistantVacancy),
        criteria,
      );
      return { answer: comparison.summary };
    }
  },
});

export const fetchPublicVacanciesForAssistant = internalQuery({
  args: {
    source: v.optional(v.union(v.literal("native"), v.literal("hh"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 50);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(50);
    return vacancies
      .filter((vacancy) => (args.source ? vacancy.source === args.source : true))
      .slice(0, limit);
  },
});

export const getProfileContextForAssistant = internalQuery({
  args: {},
  handler: async (ctx): Promise<AssistantProfileContext | null> => {
    try {
      const user = await requireAssistantUser(ctx);
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
      if (!profile) {
        return null;
      }
      return {
        city: profile.city,
        district: profile.district ?? null,
        skills: profile.skills,
        bio: profile.bio ?? null,
        resumeText: profile.resumeText ?? null,
      };
    } catch {
      return null;
    }
  },
});

async function requireAssistantUser(ctx: QueryCtx | MutationCtx) {
  const user = await requireCurrentUser(ctx);
  assertRole(user, ["seeker", "admin"]);
  return user;
}

function assertChatAccess(user: Doc<"users">, chat: Doc<"aiJobChats">): void {
  if (user.role === "admin") {
    return;
  }
  if (!chat.userId || chat.userId !== user._id) {
    throw new ConvexError("Forbidden");
  }
}

async function extractCriteriaWithFallback(input: {
  message: string;
  previousCriteria?: AiJobCriteria;
  followUpTurns: number;
}): Promise<{ extraction: ReturnType<typeof fallbackExtractCriteria>; usedFallback: boolean }> {
  try {
    const aiResult = await requestStructuredJson(
      "ai_job_criteria",
      buildAiJobCriteriaPrompt({
        message: input.message,
        previousCriteriaJson: input.previousCriteria
          ? JSON.stringify(input.previousCriteria)
          : undefined,
        followUpTurns: input.followUpTurns,
      }),
      aiJobAssistantExtractionSchema,
    );

    const merged = mergeAiJobCriteria(input.previousCriteria, aiResult.knownCriteria);
    return {
      extraction: {
        ...aiResult,
        knownCriteria: merged,
        shouldShowResults:
          input.followUpTurns >= 5 || aiResult.shouldShowResults || countCriteria(merged) >= 2,
        nextQuestion:
          input.followUpTurns >= 5 || aiResult.shouldShowResults
            ? null
            : aiResult.nextQuestion,
      },
      usedFallback: false,
    };
  } catch {
    return {
      extraction: fallbackExtractCriteria(input.message, input.previousCriteria),
      usedFallback: true,
    };
  }
}

async function findMatchesForCriteria(
  ctx: ActionCtx,
  criteria: AiJobCriteria,
  rawText: string | undefined,
  limit: number,
  profileContext?: AssistantProfileContext | null,
): Promise<AssistantMatchResponse> {
  const boundedLimit = Math.min(limit, 20);
  const source = criteria.sourcePreference === "any" ? undefined : criteria.sourcePreference;
  const searchText = [criteriaToSearchText(criteria) || rawText || "", profileContextToSearchText(profileContext)]
    .filter(Boolean)
    .join("\n");
  let vacancies: Doc<"vacancies">[] = [];
  const scoreMap = new Map<string, number>();
  let aiUnavailable = false;

  if (searchText.trim()) {
    try {
      const embedding = await requestEmbedding(searchText);
      const hits = await ctx.vectorSearch("vacancies", "by_embedding", {
        vector: embedding,
        limit: Math.min(boundedLimit * 3, 50),
      });
      const fetched: Doc<"vacancies">[] = await ctx.runQuery(
        internal.vacancies.fetchByIds,
        { ids: hits.map((hit: { _id: Id<"vacancies"> }) => hit._id) },
      );
      vacancies = fetched;
      for (const hit of hits as Array<{ _id: Id<"vacancies">; _score: number }>) {
        scoreMap.set(String(hit._id), normalizeMatchScore(hit._score));
      }
    } catch {
      aiUnavailable = true;
    }
  }

  if (!vacancies.length) {
    vacancies = await ctx.runQuery(internal.aiJobAssistant.fetchPublicVacanciesForAssistant, {
      source,
      limit: 50,
    });
  }

  const ranked = vacancies
    .filter((vacancy) => vacancy.status === "published")
    .filter((vacancy) => (source ? vacancy.source === source : true))
    .filter((vacancy) => matchesCriteriaText(vacancy, criteria))
    .map((vacancy) => ({
      vacancy,
      explanation: buildAssistantMatchExplanation(toAssistantVacancy(vacancy), criteria),
      matchScore: scoreMap.get(String(vacancy._id)),
      boost: localBoost(vacancy, criteria),
    }));

  const boosted = applyProfileContextToMatches(ranked, criteria, profileContext)
    .sort((a, b) => (b.matchScore ?? 0) + b.boost - ((a.matchScore ?? 0) + a.boost))
    .slice(0, boundedLimit);

  return {
    best: boosted.slice(0, 4),
    nearby: boosted.filter((item) => item.explanation.includes("рядом с вашим районом") || item.explanation.includes("профиль: подходит район")).slice(0, 4),
    fastStart: boosted.filter((item) => item.explanation.includes("можно начать быстро") || item.explanation.includes("можно без опыта")).slice(0, 4),
    hh: boosted.filter((item) => item.vacancy.source === "hh").slice(0, 4),
    all: boosted,
    totalCount: boosted.length,
    aiUnavailable,
  };
}

function emptyMatchResponse(aiUnavailable: boolean): AssistantMatchResponse {
  return {
    best: [],
    nearby: [],
    fastStart: [],
    hh: [],
    all: [],
    totalCount: 0,
    aiUnavailable,
  };
}

function buildAssistantReply(
  extraction: ReturnType<typeof fallbackExtractCriteria>,
  matchCount: number,
): string {
  if (extraction.nextQuestion && !extraction.shouldShowResults) {
    return extraction.nextQuestion;
  }
  if (matchCount > 0) {
    const district = extraction.knownCriteria.district
      ? ` рядом с ${extraction.knownCriteria.district}`
      : "";
    return `Показываю подходящие вакансии${district}. Можно уточнить запрос или сравнить варианты.`;
  }
  return "Пока не нашли точного совпадения. Можно ослабить район, убрать ожидание по зарплате или включить HH.";
}

async function safelyAppendActionMessage(
  ctx: ActionCtx,
  chatId: Id<"aiJobChats">,
  role: "user" | "assistant" | "system",
  content: string,
  metadata: {
    intent?: "find_jobs" | "refine_results" | "compare_jobs" | "ask_question" | "unknown";
    criteria?: AiJobCriteria;
    vacancyIds?: Id<"vacancies">[];
    kind?: string;
  },
) {
  try {
    await ctx.runMutation(api.aiJobAssistant.appendMessage, {
      chatId,
      role,
      content,
      metadata,
    });
  } catch {
    // Anonymous or stale chats still return a useful response to the caller.
  }
}

async function safelySaveChat(
  ctx: ActionCtx,
  chatId: Id<"aiJobChats">,
  criteria: AiJobCriteria,
  vacancyIds: Id<"vacancies">[],
) {
  try {
    await ctx.runMutation(api.aiJobAssistant.saveChat, {
      chatId,
      extractedCriteria: criteria,
      matchedVacancyIds: vacancyIds,
    });
  } catch {
    // Chat persistence must not block matching.
  }
}

function matchesCriteriaText(vacancy: Doc<"vacancies">, criteria: AiJobCriteria): boolean {
  const text = [
    vacancy.title,
    vacancy.description,
    vacancy.city,
    vacancy.district ?? "",
  ].join(" ").toLowerCase();

  if (criteria.city && vacancy.city.toLowerCase() !== criteria.city.toLowerCase()) {
    return false;
  }
  if (
    criteria.district &&
    vacancy.district &&
    !vacancy.district.toLowerCase().includes(criteria.district.toLowerCase())
  ) {
    return false;
  }
  if (criteria.salaryMin && (vacancy.salaryMax ?? vacancy.salaryMin ?? 0) < criteria.salaryMin) {
    return false;
  }
  if (criteria.roles.length && !criteria.roles.some((role) => text.includes(role.toLowerCase()))) {
    return false;
  }
  return true;
}

function localBoost(vacancy: Doc<"vacancies">, criteria: AiJobCriteria): number {
  const explanation = buildAssistantMatchExplanation(toAssistantVacancy(vacancy), criteria);
  const sourceBoost = vacancy.source === "native" ? 3 : 0;
  const todayBoost = criteria.urgency === "today" && explanation.includes("можно начать быстро") ? 6 : 0;
  return explanation.length * 5 + sourceBoost + todayBoost;
}

function toAssistantVacancy(vacancy: AssistantVacancyLike | Doc<"vacancies">): AssistantVacancyLike {
  return {
    source: vacancy.source,
    title: vacancy.title,
    description: vacancy.description,
    city: vacancy.city,
    district: vacancy.district ?? null,
    salaryMin: vacancy.salaryMin ?? null,
    salaryMax: vacancy.salaryMax ?? null,
    salaryCurrency: vacancy.salaryCurrency ?? null,
  };
}

function countCriteria(criteria: AiJobCriteria): number {
  return [
    criteria.roles.length,
    criteria.skills.length,
    criteria.city,
    criteria.district,
    criteria.schedule,
    criteria.workType,
    criteria.experienceLevel,
    criteria.salaryMin,
    criteria.urgency,
    criteria.sourcePreference !== "any",
  ].filter(Boolean).length;
}
