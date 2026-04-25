import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  assertCanReadReviewsAboutUser,
  assertCanSubmitReview,
} from "./lib/permissions";

export const createReview = mutation({
  args: {
    applicationId: v.id("applications"),
    targetUserId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    const vacancy = await ctx.db.get(application.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }

    assertCanSubmitReview({
      author: user,
      application,
      vacancy,
      targetUserId: args.targetUserId,
    });

    const reviewId = await ctx.db.insert("reviews", {
      authorUserId: user._id,
      targetUserId: args.targetUserId,
      applicationId: args.applicationId,
      rating: args.rating,
      comment: args.comment,
    });

    return ctx.db.get(reviewId);
  },
});

export const listReviewsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewer = await requireCurrentUser(ctx);
    assertCanReadReviewsAboutUser(viewer, args.userId);
    const reviews = await ctx.db.query("reviews").collect();
    return reviews.filter((review) => review.targetUserId === args.userId);
  },
});
