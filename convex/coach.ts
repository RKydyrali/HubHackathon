import { query } from "./_generated/server";
import { assertRole, requireCurrentUser } from "./lib/auth";
import { buildStructuredCoach } from "./lib/coach";

export const getMyStructuredCoach = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    assertRole(user, ["seeker", "admin"]);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_seekerUserId", (q) => q.eq("seekerUserId", user._id))
      .collect();

    const joinedApplications = [];
    for (const application of applications) {
      joinedApplications.push({
        application,
        vacancy: await ctx.db.get(application.vacancyId),
      });
    }

    return buildStructuredCoach({
      profile,
      applications: joinedApplications,
      matches: [],
    });
  },
});
