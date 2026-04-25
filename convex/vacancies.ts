import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getUserByIdentity, requireCurrentUser } from "./lib/auth";
import { filterPublicVacancies, isVisibleVacancy } from "./lib/domain";
import { DEFAULT_CITY } from "./lib/constants";
import { hasHhVacancyChanged } from "./lib/hh";
import {
  assertCanGenerateScreeningQuestionsForVacancy,
  assertCanViewVacanciesForAiDiscussion,
  assertCanCreateNativeVacancy,
  assertCanEditVacancy,
  assertCanViewVacancy,
  assertEmployerOrAdmin,
} from "./lib/permissions";
import { vacancySourceValidator } from "./lib/validators";

export const createNativeVacancy = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertCanCreateNativeVacancy(user);

    const vacancyId = await ctx.db.insert("vacancies", {
      ownerUserId: user._id,
      source: "native",
      sourceId: "",
      status: "draft",
      title: args.title,
      description: args.description,
      city: args.city ?? DEFAULT_CITY,
      district: args.district,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      salaryCurrency: args.salaryCurrency,
    });

    await ctx.scheduler.runAfter(0, internal.ai.refreshVacancyEmbedding, {
      vacancyId,
    });

    return ctx.db.get(vacancyId);
  },
});

export const updateNativeVacancy = mutation({
  args: {
    vacancyId: v.id("vacancies"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    screeningQuestions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanEditVacancy(user, vacancy);

    const patch = {
      title: args.title ?? vacancy.title,
      description: args.description ?? vacancy.description,
      city: args.city ?? vacancy.city,
      district: args.district ?? vacancy.district,
      salaryMin: args.salaryMin ?? vacancy.salaryMin,
      salaryMax: args.salaryMax ?? vacancy.salaryMax,
      salaryCurrency: args.salaryCurrency ?? vacancy.salaryCurrency,
      screeningQuestions: args.screeningQuestions ?? vacancy.screeningQuestions,
    };

    await ctx.db.patch(args.vacancyId, patch);
    await ctx.scheduler.runAfter(0, internal.ai.refreshVacancyEmbedding, {
      vacancyId: args.vacancyId,
    });
    return ctx.db.get(args.vacancyId);
  },
});

export const publishVacancy = mutation({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanEditVacancy(user, vacancy);
    await ctx.db.patch(args.vacancyId, { status: "published" });
    return ctx.db.get(args.vacancyId);
  },
});

export const archiveNativeVacancy = mutation({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanEditVacancy(user, vacancy);
    await ctx.db.patch(args.vacancyId, { status: "archived" });
    return ctx.db.get(args.vacancyId);
  },
});

export const getVacancy = query({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      return null;
    }
    if (isVisibleVacancy(vacancy.status)) {
      return vacancy;
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Forbidden");
    }

    const user = await getUserByIdentity(ctx, identity);
    if (!user) {
      throw new ConvexError("Forbidden");
    }

    assertCanViewVacancy(user, vacancy);
    return vacancy;
  },
});

export const listPublicVacancies = query({
  args: {
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    source: v.optional(vacancySourceValidator),
    limit: v.optional(v.number()),
    region: v.optional(v.literal("aktau")),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return filterPublicVacancies(vacancies, { ...args, limit });
  },
});

export const listPublic = query({
  args: {
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    source: v.optional(vacancySourceValidator),
    limit: v.optional(v.number()),
    region: v.optional(v.literal("aktau")),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return filterPublicVacancies(vacancies, { ...args, limit });
  },
});

/**
 * Public list for seekers/anonymous, but lets signed-in employers/admins
 * also see their own draft vacancies in the same list.
 */
export const listPublicOrOwner = query({
  args: {
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    source: v.optional(vacancySourceValidator),
    limit: v.optional(v.number()),
    region: v.optional(v.literal("aktau")),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);
    const published = await ctx.db
      .query("vacancies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const visiblePublished = filterPublicVacancies(published, { ...args, limit });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return visiblePublished;

    const user = await getUserByIdentity(ctx, identity);
    if (!user) return visiblePublished;

    try {
      assertEmployerOrAdmin(user);
    } catch {
      return visiblePublished;
    }

    const mine = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .collect();

    // Include drafts in the public list (but never archived).
    const myVisibleDrafts = mine.filter((v) => v.status === "draft" || v.status === "published");

    const merged = new Map<string, (typeof visiblePublished)[number]>();
    for (const v of visiblePublished) merged.set(String(v._id), v);
    for (const v of myVisibleDrafts) merged.set(String(v._id), v);
    return [...merged.values()];
  },
});

export const listMyVacancies = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    return ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .collect();
  },
});

export const listMyVacanciesWithApplicantCounts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .collect();

    const results = [];
    for (const vacancy of vacancies) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_vacancyId", (q) => q.eq("vacancyId", vacancy._id))
        .collect();
      results.push({ vacancy, applicantCount: applications.length });
    }
    return results;
  },
});

export const listByOwner = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const vacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .order("desc")
      .take(50);

    const results = [];
    for (const vacancy of vacancies) {
      const applications = await ctx.db
        .query("applications")
        .withIndex("by_vacancyId", (q) => q.eq("vacancyId", vacancy._id))
        .take(50);
      results.push({ vacancy, applicantCount: applications.length });
    }
    return results;
  },
});

export const getForAi = internalQuery({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    return vacancy;
  },
});

export const getForAiScreening = internalQuery({
  args: {
    vacancyId: v.id("vacancies"),
    callerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.callerUserId);
    if (!user) {
      throw new ConvexError("Forbidden");
    }
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    assertCanGenerateScreeningQuestionsForVacancy(user, vacancy);
    return vacancy;
  },
});

export const fetchByIds = internalQuery({
  args: { ids: v.array(v.id("vacancies")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const vacancy = await ctx.db.get(id);
      if (vacancy) {
        results.push(vacancy);
      }
    }
    return results;
  },
});

export const fetchVisibleByIdsForAi = internalQuery({
  args: {
    ids: v.array(v.id("vacancies")),
    callerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.callerUserId);
    if (!user) {
      throw new ConvexError("Forbidden");
    }
    const results = [];
    for (const id of args.ids) {
      const vacancy = await ctx.db.get(id);
      if (vacancy) {
        results.push(vacancy);
      }
    }
    assertCanViewVacanciesForAiDiscussion(user, results);
    return results;
  },
});

export const setEmbedding = internalMutation({
  args: {
    vacancyId: v.id("vacancies"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    await ctx.db.patch(args.vacancyId, { embedding: args.embedding });
    return ctx.db.get(args.vacancyId);
  },
});

export const upsertHhVacancy = internalMutation({
  args: {
    sourceId: v.string(),
    title: v.string(),
    description: v.string(),
    city: v.string(),
    district: v.optional(v.string()),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    externalApplyUrl: v.optional(v.string()),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vacancies")
      .withIndex("by_source_sourceId", (q) =>
        q.eq("source", "hh").eq("sourceId", args.sourceId),
      )
      .unique();

    const next = {
      source: "hh" as const,
      sourceId: args.sourceId,
      title: args.title,
      description: args.description,
      city: args.city,
      district: args.district,
      salaryMin: args.salaryMin,
      salaryMax: args.salaryMax,
      salaryCurrency: args.salaryCurrency,
      externalApplyUrl: args.externalApplyUrl,
    };

    const changed = hasHhVacancyChanged(existing, next);
    const textChanged =
      !existing ||
      existing.title !== args.title ||
      existing.description !== args.description ||
      existing.city !== args.city;

    if (existing) {
      if (changed || existing.status !== "published") {
        await ctx.db.patch(existing._id, {
          ...next,
          status: "published",
          lastSyncedAt: args.syncedAt,
        });
      }
      return { vacancyId: existing._id, changed, textChanged };
    }

    const vacancyId = await ctx.db.insert("vacancies", {
      ownerUserId: undefined,
      ...next,
      status: "published",
      lastSyncedAt: args.syncedAt,
    });

    return { vacancyId, changed: true, textChanged: true };
  },
});

export const archiveStaleHhVacancies = internalMutation({
  args: {
    activeSourceIds: v.array(v.string()),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const activeIds = new Set(args.activeSourceIds);
    const hhVacancies = await ctx.db
      .query("vacancies")
      .withIndex("by_source", (q) => q.eq("source", "hh"))
      .collect();

    let archived = 0;
    for (const vacancy of hhVacancies) {
      if (!activeIds.has(vacancy.sourceId) && vacancy.status !== "archived") {
        await ctx.db.patch(vacancy._id, {
          status: "archived",
          lastSyncedAt: args.syncedAt,
        });
        archived += 1;
      }
    }
    return { archived };
  },
});
