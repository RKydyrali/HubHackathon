import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  ruInterviewCancelledBody,
  ruInterviewCancelledTitle,
  ruInterviewCompletedBody,
  ruInterviewCompletedTitle,
  ruInterviewScheduledBody,
  ruInterviewScheduledTitle,
  ruNewApplicationBody,
  ruNewApplicationTitle,
  ruStatusChangeBody,
  ruStatusChangeTitle,
  formatRuDateTimeAqtau,
} from "./lib/notificationCopyRu";
import { shouldAttemptTelegramDelivery } from "./lib/notificationPreferences";
import { assertNotificationRecipient } from "./lib/permissions";
import { buildNotificationDedupeKey } from "./lib/domain";
import { sendTelegramMessageSafe } from "./lib/http";
import { APPLICATION_STATUSES, type ApplicationStatus } from "./lib/constants";
import {
  interviewStatusValidator,
  notificationTypeValidator,
} from "./lib/validators";

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

export const listForBotByTelegramChatId = internalQuery({
  args: {
    telegramChatId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramChatId", (q) => q.eq("telegramChatId", args.telegramChatId))
      .unique();
    if (!user || !user.isBotLinked) {
      return null;
    }
    return ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(Math.min(args.limit ?? 5, 10));
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError("Notification not found");
    }
    assertNotificationRecipient(user, notification);
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
    action: v.optional(v.object({ labelKey: v.string(), href: v.string() })),
    payload: v.optional(
      v.object({
        applicationId: v.optional(v.string()),
        vacancyId: v.optional(v.string()),
        interviewId: v.optional(v.string()),
      }),
    ),
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

    const deliveryStatus = shouldAttemptTelegramDelivery(user, args.type)
      ? "queued"
      : "skipped";
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      dedupeKey: args.dedupeKey,
      action: args.action,
      payload: args.payload,
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
    action: v.optional(v.object({ labelKey: v.string(), href: v.string() })),
    payload: v.optional(
      v.object({
        applicationId: v.optional(v.string()),
        vacancyId: v.optional(v.string()),
        interviewId: v.optional(v.string()),
      }),
    ),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    const result = await ctx.runMutation(internal.notifications.enqueueNotification, args);
    if (!result.notification) {
      return null;
    }
    if (!result.wasCreated) {
      return result.notification;
    }
    if (result.notification.deliveryStatus === "skipped") {
      return result.notification;
    }

    const user = await ctx.runQuery(internal.users.getById, {
      userId: args.userId,
    });
    if (!user || !shouldAttemptTelegramDelivery(user, args.type)) {
      return await ctx.runMutation(internal.notifications.markNotificationDelivery, {
        notificationId: result.notification._id,
        deliveryStatus: "skipped",
      });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !user.telegramChatId) {
      return await ctx.runMutation(internal.notifications.markNotificationDelivery, {
        notificationId: result.notification._id,
        deliveryStatus: "skipped",
      });
    }

    const send = await sendTelegramMessageSafe({
      botToken: token,
      chatId: user.telegramChatId,
      text: `${args.title}\n\n${args.body}`,
    });

    return await ctx.runMutation(internal.notifications.markNotificationDelivery, {
      notificationId: result.notification._id,
      deliveryStatus: send.ok ? "sent" : "failed",
    });
  },
});

function asApplicationStatus(status: string): ApplicationStatus | null {
  return APPLICATION_STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : null;
}

export const handleNewApplication = internalAction({
  args: {
    applicationId: v.id("applications"),
    employerUserId: v.id("users"),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    const detail = await ctx.runQuery(
      internal.applications.getNotificationContextForApplication,
      { applicationId: args.applicationId },
    );
    const vacancyTitle = detail?.vacancyTitle ?? "вакансия";
    return ctx.runAction(internal.notifications.dispatchNotification, {
      userId: args.employerUserId,
      type: "new_application",
      dedupeKey: buildNotificationDedupeKey({
        type: "new_application",
        recipientUserId: String(args.employerUserId),
        entityId: String(args.applicationId),
      }),
      title: ruNewApplicationTitle(),
      body: ruNewApplicationBody(vacancyTitle),
      action: {
        labelKey: "openApplication",
        href: `/employer/applications/${args.applicationId}`,
      },
      payload: { applicationId: String(args.applicationId) },
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
    const st = asApplicationStatus(args.status);
    const body = st
      ? ruStatusChangeBody(st)
      : `Статус отклика обновлён: ${args.status}.`;
    return ctx.runAction(internal.notifications.dispatchNotification, {
      userId: args.seekerUserId,
      type: "status_change",
      dedupeKey: args.dedupeKey,
      title: ruStatusChangeTitle(),
      body,
      action: {
        labelKey: "openApplicationStatus",
        href: `/applications?applicationId=${args.applicationId}`,
      },
      payload: { applicationId: String(args.applicationId) },
    });
  },
});

export const handleInterviewScheduled = internalAction({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx: any, args: any): Promise<any> => {
    const bundle = await ctx.runQuery(internal.interviews.getInterviewNotificationContext, {
      interviewId: args.interviewId,
    });
    if (!bundle) {
      return null;
    }
    const { interview, vacancy } = bundle;
    const when = formatRuDateTimeAqtau(interview.scheduledAt);
    return ctx.runAction(internal.notifications.dispatchNotification, {
      userId: interview.seekerUserId,
      type: "interview_update",
      dedupeKey: buildNotificationDedupeKey({
        type: "interview_update",
        recipientUserId: String(interview.seekerUserId),
        entityId: String(interview._id),
        secondaryId: "scheduled",
      }),
      title: ruInterviewScheduledTitle(),
      body: ruInterviewScheduledBody(vacancy.title, when, interview.locationOrLink),
      action: {
        labelKey: "openInterview",
        href: `/interviews?interviewId=${interview._id}`,
      },
      payload: { interviewId: String(interview._id) },
    });
  },
});

export const handleInterviewStatusUpdated = internalAction({
  args: {
    interviewId: v.id("interviews"),
    status: interviewStatusValidator,
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    if (args.status !== "completed" && args.status !== "cancelled") {
      return null;
    }
    const bundle = await ctx.runQuery(internal.interviews.getInterviewNotificationContext, {
      interviewId: args.interviewId,
    });
    if (!bundle) {
      return null;
    }
    const { interview, vacancy } = bundle;
    const title =
      args.status === "completed" ? ruInterviewCompletedTitle() : ruInterviewCancelledTitle();
    const body =
      args.status === "completed"
        ? ruInterviewCompletedBody(vacancy.title)
        : ruInterviewCancelledBody(vacancy.title);
    return ctx.runAction(internal.notifications.dispatchNotification, {
      userId: interview.seekerUserId,
      type: "interview_update",
      dedupeKey: buildNotificationDedupeKey({
        type: "interview_update",
        recipientUserId: String(interview.seekerUserId),
        entityId: String(interview._id),
        secondaryId: args.status,
      }),
      title,
      body,
      action: {
        labelKey: "openInterview",
        href: `/interviews?interviewId=${interview._id}`,
      },
      payload: { interviewId: String(interview._id) },
    });
  },
});
