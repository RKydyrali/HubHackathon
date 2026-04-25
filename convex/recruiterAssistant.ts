/**
 * Employer hiring assistant: conversational candidate matching + vacancy copy coaching.
 *
 * Persisted: `recruiterAiChats`, `recruiterAiChatMessages` (see schema).
 * Agent turn (LLM + vector match): `recruiterAssistantActions.sendTurn`.
 */
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  assertCanAccessRecruiterChat,
  assertCanActAsVacancyOwnerOrAdmin,
  assertEmployerOrAdmin,
} from "./lib/permissions";
import {
  recruiterChatMessageMetadataValidator,
  recruiterChatMessageRoleValidator,
} from "./lib/recruiterChatValidators";

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireEmployerAssistantUser(ctx);
    return ctx.db
      .query("recruiterAiChats")
      .withIndex("by_employerUserId_and_updatedAt", (q) => q.eq("employerUserId", user._id))
      .order("desc")
      .take(20);
  },
});

export const getChat = query({
  args: { chatId: v.id("recruiterAiChats") },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }
    assertCanAccessRecruiterChat(user, chat);
    return chat;
  },
});

export const getChatMessages = query({
  args: { chatId: v.id("recruiterAiChats") },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return [];
    }
    assertCanAccessRecruiterChat(user, chat);
    return ctx.db
      .query("recruiterAiChatMessages")
      .withIndex("by_chatId_and_createdAt", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .take(100);
  },
});

export const startChat = mutation({
  args: {
    title: v.optional(v.string()),
    vacancyId: v.optional(v.id("vacancies")),
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantUser(ctx);
    assertEmployerOrAdmin(user);
    if (args.vacancyId) {
      const vacancy = await ctx.db.get(args.vacancyId);
      if (!vacancy) {
        throw new ConvexError("Vacancy not found");
      }
      assertCanActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
    }
    const now = Date.now();
    const chatId = await ctx.db.insert("recruiterAiChats", {
      employerUserId: user._id,
      vacancyId: args.vacancyId,
      title: args.title ?? "Новый диалог",
      createdAt: now,
      updatedAt: now,
    });
    if (args.initialMessage) {
      await ctx.db.insert("recruiterAiChatMessages", {
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
    chatId: v.id("recruiterAiChats"),
    role: recruiterChatMessageRoleValidator,
    content: v.string(),
    metadata: recruiterChatMessageMetadataValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }
    assertCanAccessRecruiterChat(user, chat);
    const now = Date.now();
    const id = await ctx.db.insert("recruiterAiChatMessages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: now,
    });
    await ctx.db.patch(args.chatId, { updatedAt: now });
    return ctx.db.get(id);
  },
});

export const saveChat = mutation({
  args: {
    chatId: v.id("recruiterAiChats"),
    title: v.optional(v.string()),
    vacancyId: v.optional(v.id("vacancies")),
  },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }
    assertCanAccessRecruiterChat(user, chat);
    if (args.vacancyId) {
      const vacancy = await ctx.db.get(args.vacancyId);
      if (!vacancy) {
        throw new ConvexError("Vacancy not found");
      }
      assertCanActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
    }
    await ctx.db.patch(args.chatId, {
      title: args.title ?? chat.title,
      vacancyId: args.vacancyId !== undefined ? args.vacancyId : chat.vacancyId,
      updatedAt: Date.now(),
    });
    return ctx.db.get(args.chatId);
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("recruiterAiChats") },
  handler: async (ctx, args) => {
    const user = await requireEmployerAssistantUser(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return { deleted: false };
    }
    assertCanAccessRecruiterChat(user, chat);
    const messages = await ctx.db
      .query("recruiterAiChatMessages")
      .withIndex("by_chatId_and_createdAt", (q) => q.eq("chatId", args.chatId))
      .take(200);
    for (const m of messages) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.chatId);
    return { deleted: true };
  },
});

async function requireEmployerAssistantUser(ctx: Parameters<typeof requireCurrentUser>[0]) {
  const user = await requireCurrentUser(ctx);
  assertEmployerOrAdmin(user);
  return user;
}
