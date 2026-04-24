import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  clerkIdentityKey,
  getUserByClerkId,
  getUserByIdentity,
  requireClerkIdentity,
} from "./lib/auth";
import { userRoleValidator } from "./lib/validators";

async function upsertUserRecord(
  ctx: any,
  input: {
    clerkId: string;
    role?: "seeker" | "employer" | "admin";
    telegramChatId?: string;
    telegramUsername?: string;
    isBotLinked?: boolean;
  },
) {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", input.clerkId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      role: input.role ?? existing.role,
      telegramChatId: input.telegramChatId ?? existing.telegramChatId,
      telegramUsername: input.telegramUsername ?? existing.telegramUsername,
      isBotLinked: input.isBotLinked ?? existing.isBotLinked,
    });
    return existing._id;
  }

  return ctx.db.insert("users", {
    clerkId: input.clerkId,
    role: input.role,
    telegramChatId: input.telegramChatId,
    telegramUsername: input.telegramUsername,
    isBotLinked: input.isBotLinked ?? Boolean(input.telegramChatId),
  });
}

export const syncCurrentUser = mutation({
  args: {
    role: v.optional(userRoleValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireClerkIdentity(ctx);
    const clerkId = clerkIdentityKey(identity);
    const existing = await getUserByIdentity(ctx, identity);

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkId,
        role: args.role ?? existing.role,
      });
      return ctx.db.get(existing._id);
    }

    const userId = await ctx.db.insert("users", {
      clerkId,
      role: args.role,
      isBotLinked: false,
    });
    return ctx.db.get(userId);
  },
});

export const chooseOnboardingRole = mutation({
  args: {
    role: v.union(v.literal("seeker"), v.literal("employer")),
  },
  handler: async (ctx, args) => {
    const identity = await requireClerkIdentity(ctx);
    const clerkId = clerkIdentityKey(identity);
    const existing = await getUserByIdentity(ctx, identity);

    if (!existing) {
      const userId = await ctx.db.insert("users", {
        clerkId,
        role: args.role,
        isBotLinked: false,
      });
      return ctx.db.get(userId);
    }

    if (existing.role && existing.role !== args.role) {
      throw new ConvexError("Role is already assigned");
    }

    await ctx.db.patch(existing._id, {
      clerkId,
      role: args.role,
    });
    return ctx.db.get(existing._id);
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return getUserByIdentity(ctx, identity);
  },
});

export const getSelf = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return getUserByIdentity(ctx, identity);
  },
});

export const getById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

export const getByClerkIdInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const getByTelegramChatId = internalQuery({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .unique();
  },
});

export const upsertFromBot = internalMutation({
  args: {
    telegramChatId: v.string(),
    telegramUsername: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    role: v.optional(userRoleValidator),
  },
  handler: async (ctx, args) => {
    let existing =
      args.clerkId !== undefined
        ? await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId!))
            .unique()
        : null;

    if (!existing) {
      existing = await ctx.db
        .query("users")
        .withIndex("by_telegramChatId", (q) =>
          q.eq("telegramChatId", args.telegramChatId),
        )
        .unique();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkId: args.clerkId ?? existing.clerkId,
        telegramChatId: args.telegramChatId,
        telegramUsername: args.telegramUsername ?? existing.telegramUsername,
        isBotLinked: true,
        role: args.role ?? existing.role,
      });
      return ctx.db.get(existing._id);
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId ?? `telegram:${args.telegramChatId}`,
      role: args.role ?? "seeker",
      telegramChatId: args.telegramChatId,
      telegramUsername: args.telegramUsername,
      isBotLinked: true,
    });

    return ctx.db.get(userId);
  },
});
