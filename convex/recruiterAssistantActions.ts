import { ConvexError, v } from "convex/values";

import { api, internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireClerkIdentity } from "./lib/auth";
import { assertCanRunNativeVacancySeekerMatching, assertEmployerOrAdmin } from "./lib/permissions";
import { EMBEDDING_DIMENSION } from "./lib/constants";
import {
  buildRecruiterMatchPackPrompt,
  buildRecruiterRouterPrompt,
  buildRecruiterVacancyCoachPrompt,
  recruiterAgentSystemPrompt,
} from "./lib/prompts";
import {
  recruiterAgentRouterSchema,
  recruiterMatchPackSchema,
  recruiterVacancyCoachSchema,
} from "./lib/recruiterAssistantSchemas";
import { tryRequestEmbedding, tryRequestStructuredJson } from "./lib/openrouter";

function isUsableEmbedding(embedding: number[] | undefined): boolean {
  return Boolean(
    embedding &&
      embedding.length > 0 &&
      embedding.length === EMBEDDING_DIMENSION,
  );
}

function buildVacancySnapshot(vacancy: Doc<"vacancies">): string {
  return JSON.stringify(
    {
      title: vacancy.title,
      city: vacancy.city,
      district: vacancy.district ?? null,
      employmentType: vacancy.employmentType ?? null,
      experienceLevel: vacancy.experienceLevel ?? null,
      workFormat: vacancy.workFormat ?? null,
      salaryMin: vacancy.salaryMin ?? null,
      salaryMax: vacancy.salaryMax ?? null,
      salaryCurrency: vacancy.salaryCurrency ?? null,
      description: vacancy.description.slice(0, 2000),
      requirements: vacancy.requirements?.slice(0, 1200) ?? null,
      responsibilities: vacancy.responsibilities?.slice(0, 1200) ?? null,
      languageRequirements: vacancy.languageRequirements ?? null,
      benefits: vacancy.benefits ?? null,
    },
    null,
    2,
  );
}

export const sendTurn = action({
  args: {
    chatId: v.optional(v.id("recruiterAiChats")),
    vacancyId: v.optional(v.id("vacancies")),
    message: v.string(),
    createChat: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantActionUser(ctx);
    if (user.role !== "employer" && user.role !== "admin") {
      throw new ConvexError("Forbidden");
    }

    let vacancy: Doc<"vacancies"> | null = null;
    const effectiveVacancyId = args.vacancyId;
    if (effectiveVacancyId) {
      vacancy = await ctx.runQuery(internal.vacancies.getForAi, {
        vacancyId: effectiveVacancyId,
      });
      assertCanRunNativeVacancySeekerMatching(user, vacancy);
    }

    let chatVacancyId = effectiveVacancyId;
    let activeChatId = args.chatId ?? null;
    if (activeChatId) {
      const chat = await ctx.runQuery(api.recruiterAssistant.getChat, { chatId: activeChatId });
      if (!chat) {
        throw new ConvexError("Chat not found");
      }
      if (!chatVacancyId && chat.vacancyId) {
        vacancy = await ctx.runQuery(internal.vacancies.getForAi, { vacancyId: chat.vacancyId });
        assertCanRunNativeVacancySeekerMatching(user, vacancy);
        chatVacancyId = chat.vacancyId;
      }
    }

    const vacancySnapshot = vacancy ? buildVacancySnapshot(vacancy) : null;
    const recentLines = activeChatId ? await loadRecentLines(ctx, activeChatId) : [];

    const routerPrompt = buildRecruiterRouterPrompt({
      vacancySnapshot,
      recentMessages: recentLines,
      userMessage: args.message,
    });
    const routerAi = await tryRequestStructuredJson(
      "recruiter_agent_router",
      routerPrompt,
      recruiterAgentRouterSchema,
      { systemPrompt: recruiterAgentSystemPrompt() },
    );
    const router = routerAi.ok
      ? routerAi.data
      : {
          mode: "match_candidates" as const,
          clarifyingQuestion: null,
          quickReplies: [] as string[],
          reasoning: "fallback",
        };

    let mode = router.mode;
    if ((mode === "improve_job_post" || mode === "both") && !vacancySnapshot) {
      mode = "clarify";
    }

    const profileHits = await loadProfileCandidates(ctx, {
      message: args.message,
      vacancy,
      limit: 14,
    });

    const profilesJson = JSON.stringify(
      profileHits.map((p) => ({
        profileId: String(p._id),
        userId: String(p.userId),
        fullName: p.fullName,
        city: p.city,
        district: p.district ?? null,
        skills: p.skills.slice(0, 24),
        bio: (p.bio ?? "").slice(0, 400),
        resumeText: (p.resumeText ?? "").slice(0, 500),
      })),
    );

    let assistantParts: string[] = [];
    let metadata: {
      kind?: string;
      candidateCards?: Array<{
        profileId: Id<"profiles">;
        seekerUserId: Id<"users">;
        fullName: string;
        city: string;
        matchScore: number;
        reasons: string[];
      }>;
      jobSuggestions?: NonNullable<
        NonNullable<Doc<"recruiterAiChatMessages">["metadata"]>["jobSuggestions"]
      >;
    } = {};

    if (mode === "clarify") {
      const q =
        router.clarifyingQuestion?.trim() ||
        "Уточните, пожалуйста: вы хотите подобрать кандидатов по описанию роли или улучшить текст вакансии? Если второе — откройте ассистента из карточки вакансии.";
      assistantParts.push(q);
    } else {
      if (mode === "match_candidates" || mode === "both") {
        if (profileHits.length === 0) {
          assistantParts.push(
            "Пока не нашли профили в базе для этого запроса. Попробуйте описать must-have навыки, график и локацию чуть конкретнее.",
          );
        } else {
          const packAi = await tryRequestStructuredJson(
            "recruiter_match_pack",
            buildRecruiterMatchPackPrompt({
              roleOrUserMessage: args.message,
              vacancySnapshot,
              profilesJson,
            }),
            recruiterMatchPackSchema,
            { systemPrompt: recruiterAgentSystemPrompt(), complex: true },
          );
          if (packAi.ok) {
            const allowed = new Set(profileHits.map((p) => String(p._id)));
            const cards = packAi.data.candidates
              .filter((c) => allowed.has(c.profileId))
              .slice(0, 10)
              .map((c) => {
                const prof = profileHits.find((p) => String(p._id) === c.profileId)!;
                return {
                  profileId: prof._id,
                  seekerUserId: prof.userId,
                  fullName: prof.fullName,
                  city: prof.city,
                  matchScore: c.matchScore,
                  reasons: c.reasons,
                };
              });
            assistantParts.push(packAi.data.assistantMessage);
            metadata.kind = mode === "both" ? "match_and_job" : "match";
            metadata.candidateCards = cards;
          } else {
            assistantParts.push(
              "Не удалось сгенерировать объяснения матча (AI недоступен). Ниже показан сырой список по векторной близости.",
            );
            metadata.kind = mode === "both" ? "match_and_job" : "match";
            metadata.candidateCards = profileHits.slice(0, 8).map((prof, i) => ({
              profileId: prof._id,
              seekerUserId: prof.userId,
              fullName: prof.fullName,
              city: prof.city,
              matchScore: Math.max(55, 92 - i * 5),
              reasons: ["Совпадение по профилю и описанию роли (эвристика без LLM)."],
            }));
          }
        }
      }

      if ((mode === "improve_job_post" || mode === "both") && vacancy) {
        const coachAi = await tryRequestStructuredJson(
          "recruiter_vacancy_coach",
          buildRecruiterVacancyCoachPrompt({
            vacancyJson: buildVacancySnapshot(vacancy),
            userMessage: args.message,
          }),
          recruiterVacancyCoachSchema,
          { systemPrompt: recruiterAgentSystemPrompt(), complex: true },
        );
        if (coachAi.ok) {
          assistantParts.push(coachAi.data.assistantMessage);
          metadata.kind =
            mode === "both" || Boolean(metadata.candidateCards?.length) ? "match_and_job" : "job";
          metadata.jobSuggestions = {
            titleSuggestion: coachAi.data.titleSuggestion ?? undefined,
            requirementsRewrite: coachAi.data.requirementsRewrite ?? undefined,
            responsibilitiesRewrite: coachAi.data.responsibilitiesRewrite ?? undefined,
            salaryWording: coachAi.data.salaryWording ?? undefined,
            missingFields: coachAi.data.missingFields,
            toneNotes: coachAi.data.toneNotes ?? undefined,
            issues: coachAi.data.issues,
          };
        } else {
          assistantParts.push(
            "Не удалось получить правки вакансии от AI. Проверьте формулировки вручную: зарплата, график, локация, обязанности, требования без дискриминационных формулировок.",
          );
        }
      }
    }

    const assistantMessage = assistantParts.filter(Boolean).join("\n\n");

    let outChatId = activeChatId;
    if (!outChatId && args.createChat !== false) {
      const created = await ctx.runMutation(api.recruiterAssistant.startChat, {
        title: vacancy?.title?.slice(0, 80) ?? "Подбор и вакансия",
        vacancyId: chatVacancyId,
      });
      outChatId = created!._id;
    }

    if (outChatId) {
      await ctx.runMutation(api.recruiterAssistant.appendMessage, {
        chatId: outChatId,
        role: "user",
        content: args.message,
        metadata: undefined,
      });
      await ctx.runMutation(api.recruiterAssistant.appendMessage, {
        chatId: outChatId,
        role: "assistant",
        content: assistantMessage,
        metadata: Object.keys(metadata).length ? metadata : { kind: "reply" },
      });
    }

    return {
      chatId: outChatId,
      assistantMessage,
      metadata,
      router,
      quickReplies: router.quickReplies ?? [],
    };
  },
});

async function requireEmployerAssistantActionUser(ctx: ActionCtx) {
  const identity = await requireClerkIdentity(ctx);
  const user = await ctx.runQuery(internal.users.getUserByIdentityInternal, {
    subject: identity.subject,
    tokenIdentifier: identity.tokenIdentifier ?? undefined,
  });
  if (!user) {
    throw new ConvexError("User is not initialized");
  }
  assertEmployerOrAdmin(user);
  return user;
}

async function loadRecentLines(ctx: ActionCtx, chatId: Id<"recruiterAiChats">): Promise<string[]> {
  const rows = await ctx.runQuery(api.recruiterAssistant.getChatMessages, { chatId });
  return rows
    .slice(-10)
    .map((m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 500)}`);
}

async function loadProfileCandidates(
  ctx: ActionCtx,
  input: { message: string; vacancy: Doc<"vacancies"> | null; limit: number },
): Promise<Doc<"profiles">[]> {
  const parts = [input.message, input.vacancy ? `${input.vacancy.title}\n${input.vacancy.description}` : ""]
    .filter(Boolean)
    .join("\n");
  let profiles: Doc<"profiles">[] = [];
  const emb = await tryRequestEmbedding(parts);
  if (emb.ok && isUsableEmbedding(emb.embedding)) {
    try {
      const hits = await ctx.vectorSearch("profiles", "by_embedding", {
        vector: emb.embedding,
        limit: Math.min(input.limit * 2, 36),
      });
      const fetched = await ctx.runQuery(internal.profiles.fetchByIds, {
        ids: hits.map((h: { _id: Id<"profiles"> }) => h._id),
      });
      profiles = fetched;
    } catch {
      profiles = [];
    }
  }
  if (!profiles.length) {
    profiles = await ctx.runQuery(internal.ai.listProfilesFallbackForMatching, {
      limit: input.limit,
    });
  }
  const seen = new Set<string>();
  const deduped: Doc<"profiles">[] = [];
  for (const p of profiles) {
    const k = String(p._id);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(p);
    if (deduped.length >= input.limit) break;
  }
  return deduped;
}
