"use node";

import { createHash, randomBytes } from "node:crypto";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { clerkIdentityKey, requireClerkIdentity } from "./lib/auth";
import {
  TELEGRAM_LINK_TOKEN_TTL_MS,
  buildTelegramDeepLink,
} from "./lib/telegramLinking";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function newLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

type CreateTelegramLinkResult = {
  url: string;
  expiresAt: number;
  isBotLinked: boolean;
  telegramUsername: string | null;
};

type StoredTelegramLinkResult = {
  tokenId: Id<"telegramLinkTokens">;
  expiresAt: number;
  isBotLinked: boolean;
  telegramUsername: string | null;
};

export const createLink = action({
  args: {
    botUrl: v.string(),
  },
  handler: async (ctx, args): Promise<CreateTelegramLinkResult> => {
    const identity = await requireClerkIdentity(ctx);
    const token = newLinkToken();
    const now = Date.now();
    const expiresAt = now + TELEGRAM_LINK_TOKEN_TTL_MS;

    const link: StoredTelegramLinkResult = await ctx.runMutation(internal.users.createTelegramLinkTokenForClerkId, {
      clerkId: clerkIdentityKey(identity),
      tokenHash: hashToken(token),
      createdAt: now,
      expiresAt,
    });

    return {
      url: buildTelegramDeepLink(args.botUrl, token),
      expiresAt: link.expiresAt,
      isBotLinked: link.isBotLinked,
      telegramUsername: link.telegramUsername,
    };
  },
});

export const redeemFromBot = internalAction({
  args: {
    token: v.string(),
    telegramChatId: v.string(),
    telegramUsername: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return ctx.runMutation(internal.users.redeemTelegramLinkTokenFromBot, {
      tokenHash: hashToken(args.token),
      telegramChatId: args.telegramChatId,
      telegramUsername: args.telegramUsername,
    });
  },
});
