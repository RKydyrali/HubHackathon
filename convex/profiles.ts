import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { assertRole, requireCurrentUser } from "./lib/auth";
import { DEFAULT_CITY } from "./lib/constants";

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const upsertMyProfile = mutation({
  args: {
    fullName: v.string(),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    resumeText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertRole(user, ["seeker", "admin"]);

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const patch = {
      userId: user._id,
      fullName: args.fullName,
      city: args.city ?? DEFAULT_CITY,
      district: args.district,
      bio: args.bio,
      skills: args.skills,
      resumeText: args.resumeText,
    };

    let profileId;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      profileId = existing._id;
    } else {
      profileId = await ctx.db.insert("profiles", patch);
    }

    await ctx.scheduler.runAfter(0, internal.ai.refreshProfileEmbedding, {
      profileId,
    });

    return ctx.db.get(profileId);
  },
});

export const getByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getForMatching = internalQuery({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new ConvexError("Profile not found");
    }
    return profile;
  },
});

export const fetchByIds = internalQuery({
  args: { ids: v.array(v.id("profiles")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const profile = await ctx.db.get(id);
      if (profile) {
        results.push(profile);
      }
    }
    return results;
  },
});

export const setEmbedding = internalMutation({
  args: {
    profileId: v.id("profiles"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new ConvexError("Profile not found");
    }
    await ctx.db.patch(args.profileId, { embedding: args.embedding });
    return ctx.db.get(args.profileId);
  },
});
