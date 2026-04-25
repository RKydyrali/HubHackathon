import { paginationOptsValidator } from "convex/server";

import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertAdmin } from "./lib/permissions";

async function requireAdmin(ctx: QueryCtx) {
  const user = await requireCurrentUser(ctx);
  assertAdmin(user);
  return user;
}

export const listUsersForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("users").order("desc").paginate(args.paginationOpts);
  },
});

export const listVacanciesForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("vacancies").order("desc").paginate(args.paginationOpts);
  },
});

export const listApplicationsForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("applications").order("desc").paginate(args.paginationOpts);
  },
});

export const listInterviewsForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("interviews").order("desc").paginate(args.paginationOpts);
  },
});

export const listNotificationsForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return ctx.db.query("notifications").order("desc").paginate(args.paginationOpts);
  },
});
