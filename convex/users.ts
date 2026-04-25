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
import { logError, logSuccess } from "./lib/logger";
import { mergeNotificationPreferences } from "./lib/notificationPreferences";
import {
  getTelegramLinkRecordStatus,
  hasTelegramLinkConflict,
} from "./lib/telegramLinking";
import { onboardingUserRoleValidator } from "./lib/validators";

const notificationPreferencesValidator = v.object({
  inApp: v.boolean(),
  telegram: v.boolean(),
  newApplications: v.boolean(),
  statusChanges: v.boolean(),
  interviews: v.boolean(),
  aiRecommendations: v.boolean(),
});

const notificationPreferencesPatchValidator = v.object({
  inApp: v.optional(v.boolean()),
  telegram: v.optional(v.boolean()),
  newApplications: v.optional(v.boolean()),
  statusChanges: v.optional(v.boolean()),
  interviews: v.optional(v.boolean()),
  aiRecommendations: v.optional(v.boolean()),
});

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireClerkIdentity(ctx);
    const clerkId = clerkIdentityKey(identity);
    const existing = await getUserByIdentity(ctx, identity);

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkId,
      });
      const updated = await ctx.db.get(existing._id);
      logSuccess({
        functionName: "syncCurrentUser",
        userId: String(updated!._id),
        status: "ok",
        message: "user synced (patch)",
      });
      return updated;
    }

    const userId = await ctx.db.insert("users", {
      clerkId,
      isBotLinked: false,
    });
    const created = await ctx.db.get(userId);
    logSuccess({
      functionName: "syncCurrentUser",
      userId: String(created!._id),
      status: "ok",
      message: "user synced (insert)",
    });
    return created;
  },
});

export const chooseOnboardingRole = mutation({
  args: {
    role: onboardingUserRoleValidator,
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
      logError({
        functionName: "chooseOnboardingRole",
        userId: String(existing._id),
        status: "role_locked",
        message: "onboarding role change rejected",
        error: "Role is already assigned",
      });
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

export const updateNotificationPreferences = mutation({
  args: {
    preferences: notificationPreferencesValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireClerkIdentity(ctx);
    const user = await getUserByIdentity(ctx, identity);
    if (!user) {
      throw new ConvexError("User not found");
    }
    await ctx.db.patch(user._id, {
      notificationPreferences: args.preferences,
    });
    return ctx.db.get(user._id);
  },
});

export const unlinkTelegram = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireClerkIdentity(ctx);
    const user = await getUserByIdentity(ctx, identity);
    if (!user) {
      throw new ConvexError("User not found");
    }
    await ctx.db.patch(user._id, {
      telegramChatId: undefined,
      telegramUsername: undefined,
      isBotLinked: false,
    });
    return ctx.db.get(user._id);
  },
});

export const dismissHint = mutation({
  args: {
    hintId: v.string(),
  },
  handler: async (ctx, args) => {
    const hintId = args.hintId.trim();
    if (!hintId) {
      throw new ConvexError("Hint id is required");
    }
    const identity = await requireClerkIdentity(ctx);
    const user = await getUserByIdentity(ctx, identity);
    if (!user) {
      throw new ConvexError("User not found");
    }
    await ctx.db.patch(user._id, {
      dismissedHints: {
        ...(user.dismissedHints ?? {}),
        [hintId]: Date.now(),
      },
    });
    return ctx.db.get(user._id);
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

/** Same resolution as getUserByIdentity (token vs subject) for use from actions. */
export const getUserByIdentityInternal = internalQuery({
  args: {
    subject: v.string(),
    tokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return getUserByIdentity(ctx, {
      subject: args.subject,
      tokenIdentifier: args.tokenIdentifier,
    });
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

export const createTelegramLinkTokenForClerkId = internalMutation({
  args: {
    clerkId: v.string(),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        isBotLinked: false,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new ConvexError("User not found");
    }

    const tokenId = await ctx.db.insert("telegramLinkTokens", {
      userId: user._id,
      tokenHash: args.tokenHash,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
    });

    return {
      tokenId,
      expiresAt: args.expiresAt,
      isBotLinked: user.isBotLinked,
      telegramUsername: user.telegramUsername ?? null,
    };
  },
});

export const redeemTelegramLinkTokenFromBot = internalMutation({
  args: {
    tokenHash: v.string(),
    telegramChatId: v.string(),
    telegramUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("telegramLinkTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();

    if (!token) {
      throw new ConvexError("Invalid or expired Telegram link");
    }

    const status = getTelegramLinkRecordStatus(token);
    if (status === "expired") {
      throw new ConvexError("Telegram link expired");
    }
    if (status === "used") {
      throw new ConvexError("Telegram link already used");
    }

    const targetUser = await ctx.db.get(token.userId);
    if (!targetUser) {
      throw new ConvexError("User not found");
    }

    if (targetUser.telegramChatId && targetUser.telegramChatId !== args.telegramChatId) {
      throw new ConvexError(
        "This JumysAI account is already linked to another Telegram chat. Open JumysAI → Settings → Telegram and disconnect it, then try again.",
      );
    }

    const existingTelegramUser = await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) => q.eq("telegramChatId", args.telegramChatId))
      .unique();

    if (
      hasTelegramLinkConflict({
        existingTelegramUserId: existingTelegramUser ? String(existingTelegramUser._id) : null,
        targetUserId: String(targetUser._id),
      })
    ) {
      throw new ConvexError(
        "This Telegram chat is already linked to another JumysAI account. Open JumysAI → Settings → Telegram and disconnect it in the other account, then try again.",
      );
    }

    const now = Date.now();
    await ctx.db.patch(targetUser._id, {
      telegramChatId: args.telegramChatId,
      telegramUsername: args.telegramUsername,
      isBotLinked: true,
    });
    await ctx.db.patch(token._id, {
      usedAt: now,
      telegramChatId: args.telegramChatId,
    });

    return ctx.db.get(targetUser._id);
  },
});

export const upsertFromBot = internalMutation({
  args: {
    telegramChatId: v.string(),
    telegramUsername: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    role: v.optional(onboardingUserRoleValidator),
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
      });
      return ctx.db.get(existing._id);
    }

    if (args.clerkId === undefined) {
      throw new ConvexError("Telegram link token required");
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      role: args.role ?? "seeker",
      telegramChatId: args.telegramChatId,
      telegramUsername: args.telegramUsername,
      isBotLinked: true,
    });

    return ctx.db.get(userId);
  },
});

export const getNotificationPreferencesForBot = internalQuery({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .unique();
    if (!user || !user.isBotLinked) {
      return null;
    }
    return {
      userId: user._id,
      isBotLinked: user.isBotLinked,
      telegramUsername: user.telegramUsername,
      preferences: mergeNotificationPreferences(user.notificationPreferences),
    };
  },
});

export const patchNotificationPreferencesFromBot = internalMutation({
  args: {
    telegramChatId: v.string(),
    patch: notificationPreferencesPatchValidator,
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .unique();
    if (!user || !user.isBotLinked) {
      throw new ConvexError("User not found or Telegram not linked");
    }
    const current = mergeNotificationPreferences(user.notificationPreferences);
    const next = { ...current };
    const p = args.patch;
    if (p.inApp !== undefined) next.inApp = p.inApp;
    if (p.telegram !== undefined) next.telegram = p.telegram;
    if (p.newApplications !== undefined) next.newApplications = p.newApplications;
    if (p.statusChanges !== undefined) next.statusChanges = p.statusChanges;
    if (p.interviews !== undefined) next.interviews = p.interviews;
    if (p.aiRecommendations !== undefined) next.aiRecommendations = p.aiRecommendations;
    await ctx.db.patch(user._id, { notificationPreferences: next });
    return ctx.db.get(user._id);
  },
});
