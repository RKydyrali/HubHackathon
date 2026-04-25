import { v } from "convex/values";

import { internalMutation, mutation } from "./_generated/server";
import { getUserByIdentity } from "./lib/auth";
import { demoAnalyticsKindValidator } from "./lib/validators";
import { recordDemoAnalyticsEvent } from "./lib/demoAnalytics";

const metadataValidator = v.optional(v.record(v.string(), v.string()));

export const record = internalMutation({
  args: {
    kind: demoAnalyticsKindValidator,
    vacancyId: v.optional(v.id("vacancies")),
    userId: v.optional(v.id("users")),
    surface: v.optional(v.string()),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    await recordDemoAnalyticsEvent(ctx, args);
  },
});

export const track = mutation({
  args: {
    kind: demoAnalyticsKindValidator,
    vacancyId: v.optional(v.id("vacancies")),
    surface: v.optional(v.string()),
    metadata: metadataValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = identity ? await getUserByIdentity(ctx, identity) : null;
    await recordDemoAnalyticsEvent(ctx, {
      kind: args.kind,
      vacancyId: args.vacancyId,
      userId: user?._id,
      surface: args.surface,
      metadata: args.metadata,
    });
  },
});
