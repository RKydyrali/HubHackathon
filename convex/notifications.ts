import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { buildNotificationDedupeKey } from "./lib/domain";
import { notificationTypeValidator } from "./lib/validators";

export const listMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new ConvexError("Notification not found");
    }
    await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    return ctx.db.get(args.notificationId);
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const now = Date.now();
    for (const notification of notifications) {
      if (!notification.readAt) {
        await ctx.db.patch(notification._id, { readAt: now });
      }
    }
    return { updated: notifications.filter((notification) => !notification.readAt).length };
  },
});

export const enqueueNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    dedupeKey: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", args.dedupeKey))
      .collect();

    if (existing.length > 0) {
      const notification = existing[0]!;
      const user = await ctx.db.get(notification.userId);
      return {
        notification,
        user,
        wasCreated: false,
      };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("Notification recipient not found");
    }

    const deliveryStatus = user.telegramChatId ? "queued" : "skipped";
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      dedupeKey: args.dedupeKey,
      title: args.title,
      body: args.body,
      deliveryStatus,
      sentAt: deliveryStatus === "skipped" ? Date.now() : undefined,
    });

    const notification = await ctx.db.get(notificationId);
    return {
      notification,
      user,
      wasCreated: true,
    };
  },
});

export const markNotificationDelivery = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    deliveryStatus: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      deliveryStatus: args.deliveryStatus,
      sentAt: Date.now(),
    });
    return ctx.db.get(args.notificationId);
  },
});

export const dispatchNotification = internalAction({
  args: {
    userId: v.id("users"),
    type: notificationTypeValidator,
    dedupeKey: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    const result = await ctx.runMutation(internal.notifications.enqueueNotification, args);
    if (!result.notification) {
      return null;
    }
    if (
      result.notification.deliveryStatus === "skipped" ||
      result.notification.deliveryStatus === "sent"
    ) {
      return result.notification;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !result.user?.telegramChatId) {
      await ctx.runMutation(internal.notifications.markNotificationDelivery, {
        notificationId: result.notification._id,
        deliveryStatus: "skipped",
      });
      return result.notification;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: result.user.telegramChatId,
        text: `${args.title}\n\n${args.body}`,
      }),
    });

    await ctx.runMutation(internal.notifications.markNotificationDelivery, {
      notificationId: result.notification._id,
      deliveryStatus: response.ok ? "sent" : "failed",
    });

    return result.notification;
  },
});

export const handleNewApplication = internalAction({
  args: {
    applicationId: v.id("applications"),
    employerUserId: v.id("users"),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return ctx.runAction(internal.notifications.dispatchNotification, {
      userId: args.employerUserId,
      type: "new_application",
      dedupeKey: buildNotificationDedupeKey({
        type: "new_application",
        recipientUserId: String(args.employerUserId),
        entityId: String(args.applicationId),
      }),
      title: "New application",
      body: `A new application was submitted for vacancy flow item ${String(
        args.applicationId,
      )}.`,
    });
  },
});

export const handleStatusChange = internalAction({
  args: {
    applicationId: v.id("applications"),
    seekerUserId: v.id("users"),
    status: v.string(),
    dedupeKey: v.string(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return ctx.runAction(internal.notifications.dispatchNotification, {
      userId: args.seekerUserId,
      type: "status_change",
      dedupeKey: args.dedupeKey,
      title: "Application status updated",
      body: `Your application is now "${args.status}".`,
    });
  },
});
