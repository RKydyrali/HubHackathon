/**
 * Post-hire contact workspace (Hired status only).
 *
 * Persisted today: `postHireChannelConsents` (per application + channel).
 *
 * What the server should persist long-term (when extending beyond this MVP):
 * - Employer defaults: optional `vacancy.postHireDefaults` or `company.postHireDefaults`
 *   ({ channel: "email"|"telegram"|"phone", visibility: "public"|"mutual" }[]).
 * - Audit log of policy changes and consent timestamps (compliance).
 * - Optional seeker notification when employer requests reveal.
 *
 * Client contract: `getWorkspace` returns channel rows + derived `revealed` flags;
 * `ensureChannels` seeds rows; `setChannelVisibility` (employer) and `grantConsent` update them.
 */
import { ConvexError, v } from "convex/values";

import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./lib/auth";
import {
  assertCanAccessHiredApplicationMessaging,
  assertCanListApplicationsForVacancy,
} from "./lib/permissions";
import { postHireChannelValidator, postHireVisibilityValidator } from "./lib/recruiterChatValidators";

const CHANNELS = ["email", "telegram", "phone"] as const;

type Channel = (typeof CHANNELS)[number];

async function bundleFor(ctx: QueryCtx | MutationCtx, applicationId: Id<"applications">) {
  const application = await ctx.db.get(applicationId);
  if (!application) {
    return null;
  }
  const vacancy = await ctx.db.get(application.vacancyId);
  if (!vacancy) {
    return null;
  }
  const company = vacancy.companyId ? await ctx.db.get(vacancy.companyId) : null;
  const seekerProfile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
    .unique();
  const seekerUser = await ctx.db.get(application.seekerUserId);
  const employerUser = vacancy.ownerUserId ? await ctx.db.get(vacancy.ownerUserId) : null;
  return { application, vacancy, company, seekerProfile, seekerUser, employerUser };
}

function channelValue(
  channel: Channel,
  side: "employer" | "seeker",
  input: {
    company: Doc<"companies"> | null;
    seekerProfile: Doc<"profiles"> | null;
    seekerUser: Doc<"users"> | null;
    employerUser: Doc<"users"> | null;
  },
): string | null {
  if (channel === "email") {
    if (side === "employer") {
      return input.company?.email?.trim() || null;
    }
    return input.seekerProfile?.emailPublic?.trim() || null;
  }
  if (channel === "phone") {
    if (side === "employer") {
      return input.company?.phone?.trim() || null;
    }
    return input.seekerProfile?.phone?.trim() || null;
  }
  const tg =
    side === "employer"
      ? input.employerUser?.telegramUsername?.replace(/^@/, "")
      : input.seekerUser?.telegramUsername?.replace(/^@/, "");
  if (!tg) {
    return null;
  }
  return `https://t.me/${tg}`;
}

function revealed(row: Doc<"postHireChannelConsents">): boolean {
  if (row.visibility === "public") {
    return true;
  }
  return Boolean(row.employerConsentAt && row.seekerConsentAt);
}

export const ensureChannels = mutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const b = await bundleFor(ctx, args.applicationId);
    if (!b) {
      throw new ConvexError("Application not found");
    }
    assertCanAccessHiredApplicationMessaging(user, b.application, b.vacancy);
    if (b.application.status !== "hired") {
      throw new ConvexError("Not hired");
    }
    const now = Date.now();
    for (const channel of CHANNELS) {
      const existing = await ctx.db
        .query("postHireChannelConsents")
        .withIndex("by_applicationId_and_channel", (q) =>
          q.eq("applicationId", args.applicationId).eq("channel", channel),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("postHireChannelConsents", {
          applicationId: args.applicationId,
          channel,
          visibility: "mutual",
          employerConsentAt: undefined,
          seekerConsentAt: undefined,
        });
      }
    }
    return { ok: true as const, seededAt: now };
  },
});

export const setChannelVisibility = mutation({
  args: {
    applicationId: v.id("applications"),
    channel: postHireChannelValidator,
    visibility: postHireVisibilityValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const b = await bundleFor(ctx, args.applicationId);
    if (!b) {
      throw new ConvexError("Application not found");
    }
    assertCanListApplicationsForVacancy(user, b.vacancy);
    if (b.application.status !== "hired") {
      throw new ConvexError("Not hired");
    }
    const row = await ctx.db
      .query("postHireChannelConsents")
      .withIndex("by_applicationId_and_channel", (q) =>
        q.eq("applicationId", args.applicationId).eq("channel", args.channel),
      )
      .unique();
    if (!row) {
      throw new ConvexError("Run ensureChannels first");
    }
    await ctx.db.patch(row._id, { visibility: args.visibility });
    return ctx.db.get(row._id);
  },
});

export const grantConsent = mutation({
  args: { applicationId: v.id("applications"), channel: postHireChannelValidator },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const b = await bundleFor(ctx, args.applicationId);
    if (!b) {
      throw new ConvexError("Application not found");
    }
    assertCanAccessHiredApplicationMessaging(user, b.application, b.vacancy);
    if (b.application.status !== "hired") {
      throw new ConvexError("Not hired");
    }
    const row = await ctx.db
      .query("postHireChannelConsents")
      .withIndex("by_applicationId_and_channel", (q) =>
        q.eq("applicationId", args.applicationId).eq("channel", args.channel),
      )
      .unique();
    if (!row) {
      throw new ConvexError("Run ensureChannels first");
    }
    const now = Date.now();
    if (user._id === b.application.seekerUserId) {
      await ctx.db.patch(row._id, { seekerConsentAt: now });
    } else if (user._id === b.vacancy.ownerUserId || user.role === "admin") {
      await ctx.db.patch(row._id, { employerConsentAt: now });
    } else {
      throw new ConvexError("Forbidden");
    }
    return ctx.db.get(row._id);
  },
});

export const getWorkspace = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const b = await bundleFor(ctx, args.applicationId);
    if (!b) {
      return null;
    }
    assertCanAccessHiredApplicationMessaging(user, b.application, b.vacancy);
    const isHired = b.application.status === "hired";
    const rows = await ctx.db
      .query("postHireChannelConsents")
      .withIndex("by_applicationId_and_channel", (q) => q.eq("applicationId", args.applicationId))
      .collect();
    const rowByChannel = new Map(rows.map((r) => [r.channel, r]));

    const channels = CHANNELS.map((channel) => {
      const row = rowByChannel.get(channel);
      const employerValue = channelValue(channel, "employer", {
        company: b.company,
        seekerProfile: b.seekerProfile,
        seekerUser: b.seekerUser,
        employerUser: b.employerUser,
      });
      const seekerValue = channelValue(channel, "seeker", {
        company: b.company,
        seekerProfile: b.seekerProfile,
        seekerUser: b.seekerUser,
        employerUser: b.employerUser,
      });
      const show = isHired && row ? revealed(row) : false;
      return {
        channel,
        visibility: row?.visibility ?? ("mutual" as const),
        employerValue: show ? employerValue : null,
        seekerValue: show ? seekerValue : null,
        employerHasValue: Boolean(employerValue),
        seekerHasValue: Boolean(seekerValue),
        employerConsentAt: row?.employerConsentAt ?? null,
        seekerConsentAt: row?.seekerConsentAt ?? null,
        needsConsent: row ? row.visibility === "mutual" && !(row.employerConsentAt && row.seekerConsentAt) : true,
        missingRow: !row,
      };
    });

    return {
      applicationId: args.applicationId,
      isHired,
      role: user._id === b.application.seekerUserId ? ("seeker" as const) : ("employer" as const),
      channels,
    };
  },
});
