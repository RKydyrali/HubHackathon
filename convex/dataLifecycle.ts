import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Notifications with readAt set and this age (by _creationTime) may be purged. */
const NOTIFICATION_READ_TTL_MS = 14 * MS_DAY;
/** Any notification older than this (by _creationTime) is purged. */
const NOTIFICATION_MAX_AGE_MS = 90 * MS_DAY;
/** Chats idle longer than this (by updatedAt) are purged. */
const CHAT_IDLE_TTL_MS = 30 * MS_DAY;

const ROW_BATCH = 50;
const MAX_PURGE_ROUNDS = 40;
/** Safety cap for message batches per chat within one mutation transaction. */
const MAX_MESSAGE_DELETE_ROUNDS = 200;

function shouldPurgeMaxAge(doc: Doc<"notifications">, now: number): boolean {
  return now - doc._creationTime >= NOTIFICATION_MAX_AGE_MS;
}

function shouldPurgeRead(doc: Doc<"notifications">, now: number): boolean {
  if (doc.readAt === undefined) {
    return false;
  }
  return now - doc._creationTime >= NOTIFICATION_READ_TTL_MS;
}

/**
 * Deletes messages for a chat in batches. Returns false if the cap was hit before the thread was empty.
 */
async function deleteAllMessagesForChat(
  ctx: MutationCtx,
  chatId: Id<"aiJobChats">,
): Promise<boolean> {
  for (let i = 0; i < MAX_MESSAGE_DELETE_ROUNDS; i++) {
    const messages = await ctx.db
      .query("aiJobChatMessages")
      .withIndex("by_chatId_and_createdAt", (q) => q.eq("chatId", chatId))
      .take(100);
    if (messages.length === 0) {
      return true;
    }
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  }
  return false;
}

export const purgeStaleNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deleted = 0;
    let scheduleAgain = false;

    // Phase 1: max age — only the globally oldest rows can qualify; safe to use take() batches.
    for (let round = 0; round < MAX_PURGE_ROUNDS; round++) {
      const batch = await ctx.db.query("notifications").order("asc").take(ROW_BATCH);
      if (batch.length === 0) {
        break;
      }
      let batchDeleted = 0;
      for (const doc of batch) {
        if (shouldPurgeMaxAge(doc, now)) {
          await ctx.db.delete(doc._id);
          deleted += 1;
          batchDeleted += 1;
        }
      }
      if (batch.length < ROW_BATCH) {
        break;
      }
      if (batchDeleted === 0) {
        break;
      }
      if (round === MAX_PURGE_ROUNDS - 1) {
        scheduleAgain = true;
      }
    }

    // Phase 2: read TTL — may apply to newer rows than the oldest; scan in order and batch-delete.
    const readIds: Id<"notifications">[] = [];
    for await (const doc of ctx.db.query("notifications").order("asc")) {
      if (shouldPurgeRead(doc, now)) {
        readIds.push(doc._id);
        if (readIds.length >= ROW_BATCH) {
          break;
        }
      }
    }
    for (const id of readIds) {
      await ctx.db.delete(id);
      deleted += 1;
    }
    if (readIds.length === ROW_BATCH) {
      scheduleAgain = true;
    }

    if (scheduleAgain) {
      await ctx.scheduler.runAfter(0, internal.dataLifecycle.purgeStaleNotifications, {});
    }

    return { deleted, scheduledContinuation: scheduleAgain };
  },
});

export const purgeOldAiJobChats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - CHAT_IDLE_TTL_MS;
    let chatsPurged = 0;
    let scheduleAgain = false;

    const staleChatIds: Id<"aiJobChats">[] = [];
    for await (const chat of ctx.db.query("aiJobChats").order("asc")) {
      if (chat.updatedAt < cutoff) {
        staleChatIds.push(chat._id);
        if (staleChatIds.length >= ROW_BATCH) {
          scheduleAgain = true;
          break;
        }
      }
    }

    for (const chatId of staleChatIds) {
      const messagesDone = await deleteAllMessagesForChat(ctx, chatId);
      if (!messagesDone) {
        scheduleAgain = true;
        continue;
      }
      await ctx.db.delete(chatId);
      chatsPurged += 1;
    }

    if (scheduleAgain) {
      await ctx.scheduler.runAfter(0, internal.dataLifecycle.purgeOldAiJobChats, {});
    }

    return { chatsPurged, scheduledContinuation: scheduleAgain };
  },
});
