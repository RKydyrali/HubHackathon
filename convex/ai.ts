import { ConvexError, v } from "convex/values";
import type { z } from "zod";

import { api, internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import { requireClerkIdentity } from "./lib/auth";
import {
  assertCanAnalyzeScreeningApplication,
  assertCanRunNativeVacancySeekerMatching,
  assertCanUsePublicAiAction,
  assertSeekerOrAdmin,
} from "./lib/permissions";
import {
  DEFAULT_CITY,
  DEFAULT_MATCH_LIMIT,
  EMBEDDING_DIMENSION,
  MOCK_INTERVIEW_MAX_USER_MESSAGE_CHARS,
  MOCK_INTERVIEW_MIN_USER_MESSAGES_TO_FINALIZE,
} from "./lib/constants";
import {
  countMockInterviewUserMessages,
  truncateMockInterviewTranscriptForDebrief,
} from "./lib/mockInterviewHardening";
import {
  buildNotificationDedupeKey,
  isStrongMatch,
  normalizeMatchScore,
} from "./lib/domain";
import {
  ruStrongMatchSeekerForEmployerBody,
  ruStrongMatchSeekerForEmployerTitle,
  ruStrongMatchVacancyBody,
  ruStrongMatchVacancyTitle,
} from "./lib/notificationCopyRu";
import {
  buildMockInterviewDebriefPrompt,
  buildMockInterviewSystemPrompt,
  buildElevatorPitchImprovePrompt,
  buildInterviewAnswerFeedbackPrompt,
  buildResumeProfileExtractionPrompt,
  buildScreeningAnalysisPrompt,
  buildScreeningQuestionsPrompt,
  buildVacancyGenerationPrompt,
} from "./lib/prompts";
import {
  createZeroEmbedding,
  answerFeedbackSchema,
  elevatorPitchSchema,
  mockInterviewDebriefSchema,
  screeningAnalysisSchema,
  screeningQuestionsSchema,
  tryRequestChatCompletionWithMockInterviewModels,
  tryRequestEmbedding,
  tryRequestStructuredJson,
  tryRequestStructuredJsonWithMockInterviewModels,
  vacancyGenerationSchema,
} from "./lib/openrouter";
import {
  fallbackExtractResumeProfileDraft,
  MAX_RESUME_PROFILE_TEXT_LENGTH,
  MIN_RESUME_PROFILE_TEXT_LENGTH,
  normalizeResumeProfileDraft,
  resumeProfileDraftSchema,
  type ResumeProfileDraft,
} from "./lib/resumeProfileExtraction";

function isUsableEmbedding(embedding: number[] | undefined | null): boolean {
  return Boolean(
    embedding &&
      embedding.length > 0 &&
      embedding.length === EMBEDDING_DIMENSION,
  );
}

async function requireActionUser(ctx: any) {
  const identity = await requireClerkIdentity(ctx);
  const user = await ctx.runQuery(internal.users.getUserByIdentityInternal, {
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier ?? undefined,
  });
  if (!user) {
    throw new ConvexError("User is not initialized");
  }
  return user;
}

export const listProfilesFallbackForMatching = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const lim = Math.min(Math.max(1, args.limit), 50);
    return ctx.db.query("profiles").order("desc").take(lim);
  },
});

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
  handler: async (ctx: any, args: { rawText: string }): Promise<any> => {
    const user = await requireActionUser(ctx);
    assertCanUsePublicAiAction(user);
    const fallback = {
      source: "native" as const,
      title: args.rawText.trim().split(/\n/)[0]?.trim().slice(0, 200) || "Generated vacancy",
      description: args.rawText.trim() || "No description provided.",
      city: DEFAULT_CITY,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
    };
    const result = await tryRequestStructuredJson(
      "vacancy_generation",
      buildVacancyGenerationPrompt(args.rawText),
      vacancyGenerationSchema,
    );
    return result.ok ? result.data : fallback;
  },
});

type ExtractResumeProfileDraftResult = {
  ok: true;
  aiFailed: boolean;
  draft: ResumeProfileDraft;
};

export const extractResumeProfileDraft = action({
  args: { resumeText: v.string() },
  handler: async (
    ctx: any,
    args: { resumeText: string },
  ): Promise<ExtractResumeProfileDraftResult> => {
    const user = await requireActionUser(ctx);
    assertSeekerOrAdmin(user);

    const resumeText = args.resumeText.trim().slice(0, MAX_RESUME_PROFILE_TEXT_LENGTH);
    if (!resumeText) {
      throw new ConvexError("Resume text is required");
    }
    if (resumeText.length < MIN_RESUME_PROFILE_TEXT_LENGTH) {
      throw new ConvexError("Resume text is too short");
    }

    const result = await tryRequestStructuredJson(
      "resume_profile_draft",
      buildResumeProfileExtractionPrompt(resumeText),
      resumeProfileDraftSchema,
    );

    if (!result.ok) {
      return {
        ok: true,
        aiFailed: true,
        draft: fallbackExtractResumeProfileDraft(resumeText),
      };
    }

    return {
      ok: true,
      aiFailed: false,
      draft: normalizeResumeProfileDraft(result.data, resumeText),
    };
  },
});

export const improveElevatorPitch = action({
  args: { rawText: v.string() },
  handler: async (ctx, args) => {
    const user = await requireActionUser(ctx);
    assertSeekerOrAdmin(user);
    const rawText = args.rawText.trim();
    if (!rawText) {
      throw new ConvexError("Text is required");
    }

    const result = await tryRequestStructuredJson(
      "elevator_pitch",
      buildElevatorPitchImprovePrompt({ rawText }),
      elevatorPitchSchema,
    );

    if (!result.ok) {
      return { ok: true as const, aiFailed: true as const, data: null };
    }

    return {
      ok: true as const,
      aiFailed: false as const,
      data: {
        score: result.data.score,
        variants: {
          short: result.data.short,
          neutral: result.data.neutral,
          confident: result.data.confident,
        },
      },
    };
  },
});

export const scoreInterviewAnswer = action({
  args: { question: v.string(), answer: v.string() },
  handler: async (ctx, args) => {
    const user = await requireActionUser(ctx);
    assertSeekerOrAdmin(user);
    const question = args.question.trim();
    const answer = args.answer.trim();
    if (!question) {
      throw new ConvexError("Question is required");
    }
    if (!answer) {
      throw new ConvexError("Answer is required");
    }

    const result = await tryRequestStructuredJson(
      "interview_answer_feedback",
      buildInterviewAnswerFeedbackPrompt({ question, answer }),
      answerFeedbackSchema,
    );

    if (!result.ok) {
      return { ok: true as const, aiFailed: true as const, data: null };
    }

    return {
      ok: true as const,
      aiFailed: false as const,
      data: { score: result.data.score, suggestion: result.data.suggestion },
    };
  },
});

export const generateScreeningQuestions = action({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx: any, args: { vacancyId: any }): Promise<any> => {
    const user = await requireActionUser(ctx);
    const vacancy = await ctx.runQuery(internal.vacancies.getForAiScreening, {
      vacancyId: args.vacancyId,
      callerUserId: user._id,
    });

    const result = await tryRequestStructuredJson(
      "screening_questions",
      buildScreeningQuestionsPrompt(vacancy),
      screeningQuestionsSchema,
    );
    if (result.ok) {
      return result.data;
    }
    return {
      questions: [
        "Какой опыт у вас есть по похожим задачам?",
        "Почему вам интересна эта вакансия?",
        "Когда вы сможете приступить к работе?",
      ],
    };
  },
});

export const generateEmbedding = action({
  args: { text: v.string() },
  handler: async (ctx: any, args: { text: string }): Promise<number[]> => {
    await requireActionUser(ctx);
    const result = await tryRequestEmbedding(args.text);
    return result.ok ? result.embedding : createZeroEmbedding();
  },
});

export const analyzeScreening = action({
  args: { applicationId: v.id("applications") },
  handler: async (ctx: any, args: { applicationId: any }): Promise<any> => {
    const user = await requireActionUser(ctx);
    const { application, vacancy } = await ctx.runQuery(
      internal.applications.getForAnalysis,
      {
        applicationId: args.applicationId,
      },
    );
    assertCanAnalyzeScreeningApplication(user, application, vacancy);
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

    const analysis = await tryRequestStructuredJson(
      "screening_analysis",
      buildScreeningAnalysisPrompt({
        vacancyTitle: vacancy.title,
        vacancyDescription: vacancy.description,
        screeningAnswers: application.screeningAnswers,
      }),
      screeningAnalysisSchema,
      { complex: true },
    );

    if (!analysis.ok) {
      return null;
    }

    return ctx.runMutation(internal.applications.saveScreeningAnalysis, {
      applicationId: args.applicationId,
      aiScore: analysis.data.score,
      aiSummary: analysis.data.summary,
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
    const embeddingResult = await tryRequestEmbedding(text);
    const embedding = embeddingResult.ok ? embeddingResult.embedding : undefined;
    if (!isUsableEmbedding(embedding)) {
      return null;
    }
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
      const score = normalizeMatchScore(match.matchScore);
      await ctx.runAction(internal.notifications.dispatchNotification, {
        userId: profile.userId,
        type: "strong_match",
        dedupeKey: buildNotificationDedupeKey({
          type: "strong_match",
          recipientUserId: String(profile.userId),
          entityId: String(match.vacancy._id),
        }),
        title: ruStrongMatchVacancyTitle(),
        body: ruStrongMatchVacancyBody(
          match.vacancy.title,
          match.vacancy.city,
          score,
        ),
        action: {
          labelKey: "openMatch",
          href: `/for-you?vacancyId=${match.vacancy._id}`,
        },
        payload: { vacancyId: String(match.vacancy._id) },
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
    const embeddingResult = await tryRequestEmbedding(text);
    const embedding = embeddingResult.ok ? embeddingResult.embedding : undefined;
    if (!isUsableEmbedding(embedding)) {
      return null;
    }
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

      const seekerScore = normalizeMatchScore(match.matchScore);
      await ctx.runAction(internal.notifications.dispatchNotification, {
        userId: match.profile.userId,
        type: "strong_match",
        dedupeKey: buildNotificationDedupeKey({
          type: "strong_match",
          recipientUserId: String(match.profile.userId),
          entityId: String(updatedVacancy._id),
        }),
        title: ruStrongMatchVacancyTitle(),
        body: ruStrongMatchVacancyBody(
          updatedVacancy.title,
          updatedVacancy.city,
          seekerScore,
        ),
        action: {
          labelKey: "openMatch",
          href: `/for-you?vacancyId=${updatedVacancy._id}`,
        },
        payload: { vacancyId: String(updatedVacancy._id) },
      });

      if (updatedVacancy.ownerUserId) {
        const employerScore = normalizeMatchScore(match.matchScore);
        await ctx.runAction(internal.notifications.dispatchNotification, {
          userId: updatedVacancy.ownerUserId,
          type: "strong_match",
          dedupeKey: buildNotificationDedupeKey({
            type: "strong_match",
            recipientUserId: String(updatedVacancy.ownerUserId),
            entityId: String(updatedVacancy._id),
            secondaryId: String(match.profile._id),
          }),
          title: ruStrongMatchSeekerForEmployerTitle(),
          body: ruStrongMatchSeekerForEmployerBody(
            match.profile.fullName,
            updatedVacancy.title,
            employerScore,
          ),
          action: {
            labelKey: "openMatch",
            href: `/employer/vacancies/${updatedVacancy._id}`,
          },
          payload: { vacancyId: String(updatedVacancy._id) },
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
  if (!isUsableEmbedding(embedding)) {
    return [];
  }
  try {
    const hits = await ctx.vectorSearch("vacancies", "by_embedding", {
      vector: embedding as number[],
      limit: Math.min(limit, 50),
    });
    const vacancies = await ctx.runQuery(internal.vacancies.fetchByIds, {
      ids: hits.map((hit: { _id: string }) => hit._id),
    });
    const scoreMap = new Map(
      hits.map((hit: { _id: string; _score: number }) => [
        String(hit._id),
        hit._score,
      ]),
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
  } catch {
    return [];
  }
}

async function getMatchingSeekersForEmbedding(
  ctx: any,
  embedding: number[] | undefined,
  limit: number,
): Promise<
  Array<{ profile: any; rawScore: number; matchScore: number }>
> {
  if (!isUsableEmbedding(embedding)) {
    return [];
  }
  try {
    const hits = await ctx.vectorSearch("profiles", "by_embedding", {
      vector: embedding as number[],
      limit: Math.min(limit, 50),
    });
    const profiles = await ctx.runQuery(internal.profiles.fetchByIds, {
      ids: hits.map((hit: { _id: string }) => hit._id),
    });
    const scoreMap = new Map(
      hits.map((hit: { _id: string; _score: number }) => [
        String(hit._id),
        hit._score,
      ]),
    );

    return profiles.map((profile: any) => {
      const rawScore = Number(scoreMap.get(String(profile._id)) ?? -1);
      return {
        profile,
        rawScore,
        matchScore: normalizeMatchScore(rawScore),
      };
    });
  } catch {
    return [];
  }
}

async function fallbackMatchingVacancies(
  ctx: any,
  limit: number,
): Promise<Array<{ vacancy: any; rawScore: number; matchScore: number }>> {
  try {
    const rows = await ctx.runQuery(
      internal.aiJobAssistant.fetchPublicVacanciesForAssistant,
      {
        limit: Math.min(limit, 50),
      },
    );
    return rows
      .filter(
        (vacancy: any) =>
          vacancy.status === "published" &&
          (vacancy.source === "native" || vacancy.source === "hh"),
      )
      .slice(0, limit)
      .map((vacancy: any) => ({
        vacancy,
        rawScore: -1,
        matchScore: normalizeMatchScore(-1),
      }));
  } catch {
    return [];
  }
}

async function fallbackMatchingSeekers(
  ctx: any,
  limit: number,
): Promise<Array<{ profile: any; rawScore: number; matchScore: number }>> {
  try {
    const profiles = await ctx.runQuery(
      internal.ai.listProfilesFallbackForMatching,
      {
        limit: Math.min(limit, 50),
      },
    );
    return profiles.map((profile: any) => ({
      profile,
      rawScore: -1,
      matchScore: normalizeMatchScore(-1),
    }));
  } catch {
    return [];
  }
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
    const user = await ctx.runQuery(internal.users.getUserByIdentityInternal, {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) {
      throw new ConvexError("User is not initialized");
    }

    const profile = await ctx.runQuery(internal.profiles.getByUserId, {
      userId: user._id,
    });
    if (!profile) {
      return [];
    }

    const limit = args.limit ?? DEFAULT_MATCH_LIMIT;
    if (!isUsableEmbedding(profile.embedding)) {
      return fallbackMatchingVacancies(ctx, limit);
    }

    const ranked = await getMatchingVacanciesForEmbedding(
      ctx,
      profile.embedding,
      limit,
    );
    if (ranked.length) {
      return ranked;
    }
    const fallback = await fallbackMatchingVacancies(ctx, limit);
    return fallback.length ? fallback : [];
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
    const user = await ctx.runQuery(internal.users.getUserByIdentityInternal, {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
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
    assertCanRunNativeVacancySeekerMatching(user, vacancy);
    const limit = args.limit ?? DEFAULT_MATCH_LIMIT;
    if (!isUsableEmbedding(vacancy.embedding)) {
      return fallbackMatchingSeekers(ctx, limit);
    }

    const ranked = await getMatchingSeekersForEmbedding(
      ctx,
      vacancy.embedding,
      limit,
    );
    if (ranked.length) {
      return ranked;
    }
    const fallback = await fallbackMatchingSeekers(ctx, limit);
    return fallback.length ? fallback : [];
  },
});

type MockInterviewDebriefPayload = z.infer<typeof mockInterviewDebriefSchema>;

type RunMockInterviewResult =
  | { ok: true; finalized: true; debrief: MockInterviewDebriefPayload }
  | { ok: true; finalized: false; assistantMessage: string; aiFailed: boolean }
  | { ok: false; error: string };

function buildProfileSnippetForMockInterview(profile: {
  fullName: string;
  city: string;
  bio?: string;
  skills: string[];
  resumeText?: string;
} | null): string | undefined {
  if (!profile) {
    return undefined;
  }
  const resume = profile.resumeText?.trim().slice(0, 1200);
  return [
    `${profile.fullName}, ${profile.city}`,
    profile.bio?.trim(),
    profile.skills.length ? `Навыки: ${profile.skills.join(", ")}` : undefined,
    resume ? `Резюме (фрагмент): ${resume}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export const runMockInterview = action({
  args: {
    sessionId: v.id("mockInterviewSessions"),
    vacancyId: v.id("vacancies"),
    message: v.optional(v.string()),
    finalize: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<RunMockInterviewResult> => {
    const identity = await requireClerkIdentity(ctx);
    const user = await ctx.runQuery(internal.users.getUserByIdentityInternal, {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) {
      throw new ConvexError("User is not initialized");
    }
    if (user.role !== "seeker" && user.role !== "admin") {
      throw new ConvexError("Forbidden");
    }

    const session = await ctx.runQuery(internal.coach.getMockInterviewSessionInternal, {
      sessionId: args.sessionId,
    });
    if (!session) {
      throw new ConvexError("Session not found");
    }
    if (session.seekerUserId !== user._id) {
      throw new ConvexError("Forbidden");
    }
    if (session.vacancyId !== args.vacancyId) {
      throw new ConvexError("Vacancy mismatch");
    }

    const vacancy = await ctx.runQuery(internal.vacancies.getForAi, {
      vacancyId: args.vacancyId,
    });
    if (vacancy.status !== "published") {
      throw new ConvexError("Vacancy is not available");
    }

    if (args.finalize) {
      if (session.status === "completed") {
        if (
          session.finalScore === undefined ||
          !session.hiringRecommendation?.trim()
        ) {
          throw new ConvexError("Interview debrief incomplete");
        }
        return {
          ok: true as const,
          finalized: true as const,
          debrief: {
            score: session.finalScore,
            summary:
              session.debriefSummary?.trim() || "Итог ранее сохранён.",
            strengths: session.strengths ?? [],
            improvements: session.improvements ?? [],
            hiringRecommendation: session.hiringRecommendation,
          },
        };
      }
      if (session.status !== "in_progress") {
        throw new ConvexError("Interview cannot be finalized");
      }
      const userMsgCount = countMockInterviewUserMessages(session.messages);
      if (userMsgCount < MOCK_INTERVIEW_MIN_USER_MESSAGES_TO_FINALIZE) {
        throw new ConvexError(
          "Send at least one message before finalizing",
        );
      }
      const transcriptRaw = session.messages
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n");
      const transcript =
        truncateMockInterviewTranscriptForDebrief(transcriptRaw);
      const debriefPrompt = buildMockInterviewDebriefPrompt({
        vacancyTitle: vacancy.title,
        vacancyDescription: vacancy.description,
        transcript,
      });
      const debrief = await tryRequestStructuredJsonWithMockInterviewModels(
        "mock_interview_debrief",
        debriefPrompt,
        mockInterviewDebriefSchema,
      );
      if (!debrief.ok) {
        return { ok: false as const, error: debrief.error };
      }
      try {
        await ctx.runMutation(
          internal.coach.finalizeMockInterviewSessionInternal,
          {
            sessionId: args.sessionId,
            finalScore: debrief.data.score,
            hiringRecommendation: debrief.data.hiringRecommendation,
            strengths: debrief.data.strengths,
            improvements: debrief.data.improvements,
            debriefSummary: debrief.data.summary,
          },
        );
      } catch (err) {
        if (
          err instanceof ConvexError &&
          err.message === "Session is not active"
        ) {
          const latest = await ctx.runQuery(
            internal.coach.getMockInterviewSessionInternal,
            { sessionId: args.sessionId },
          );
          if (
            latest?.status === "completed" &&
            latest.finalScore !== undefined &&
            latest.hiringRecommendation?.trim()
          ) {
            return {
              ok: true as const,
              finalized: true as const,
              debrief: {
                score: latest.finalScore,
                summary:
                  latest.debriefSummary?.trim() || "Итог ранее сохранён.",
                strengths: latest.strengths ?? [],
                improvements: latest.improvements ?? [],
                hiringRecommendation: latest.hiringRecommendation,
              },
            };
          }
        }
        throw err;
      }
      return {
        ok: true as const,
        finalized: true as const,
        debrief: debrief.data,
      };
    }

    const text = args.message?.trim();
    if (!text) {
      throw new ConvexError("Message is required");
    }
    if (text.length > MOCK_INTERVIEW_MAX_USER_MESSAGE_CHARS) {
      throw new ConvexError("Message too long");
    }
    if (session.status !== "in_progress") {
      throw new ConvexError("Interview is completed");
    }

    const now = Date.now();
    await ctx.runMutation(internal.coach.appendMockInterviewMessageInternal, {
      sessionId: args.sessionId,
      role: "user",
      content: text,
      createdAt: now,
    });

    const updated = await ctx.runQuery(internal.coach.getMockInterviewSessionInternal, {
      sessionId: args.sessionId,
    });
    if (!updated) {
      throw new ConvexError("Session not found");
    }

    const profile = await ctx.runQuery(internal.profiles.getByUserId, {
      userId: user._id,
    });
    const systemPrompt = buildMockInterviewSystemPrompt({
      vacancyTitle: vacancy.title,
      vacancyDescription: vacancy.description,
      vacancyCity: vacancy.city,
      profileSnippet: buildProfileSnippetForMockInterview(profile),
    });

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...updated.messages.map(
        (m: { role: "user" | "assistant" | "system"; content: string }) => ({
          role: m.role,
          content: m.content,
        }),
      ),
    ];

    const chatResult = await tryRequestChatCompletionWithMockInterviewModels(chatMessages);
    const assistantText = chatResult.ok
      ? chatResult.data
      : "Не удалось получить ответ ИИ. Попробуйте ещё раз или завершите интервью позже.";

    const assistantNow = Date.now();
    await ctx.runMutation(internal.coach.appendMockInterviewMessageInternal, {
      sessionId: args.sessionId,
      role: "assistant",
      content: assistantText,
      createdAt: assistantNow,
    });

    return {
      ok: true as const,
      finalized: false as const,
      assistantMessage: assistantText,
      aiFailed: !chatResult.ok,
    };
  },
});
