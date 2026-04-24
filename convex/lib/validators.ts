import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("seeker"),
  v.literal("employer"),
  v.literal("admin"),
);

export const vacancySourceValidator = v.union(
  v.literal("native"),
  v.literal("hh"),
);

export const vacancyStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const applicationStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("reviewing"),
  v.literal("interview"),
  v.literal("rejected"),
  v.literal("hired"),
);

export const notificationDeliveryStatusValidator = v.union(
  v.literal("queued"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("skipped"),
);

export const notificationTypeValidator = v.union(
  v.literal("new_application"),
  v.literal("status_change"),
  v.literal("strong_match"),
  v.literal("custom"),
);

export const interviewStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const embeddingValidator = v.optional(v.array(v.float64()));

export const screeningQuestionValidator = v.array(v.string());

export const screeningAnswerValidator = v.optional(
  v.array(
    v.object({
      question: v.string(),
      answer: v.string(),
    }),
  ),
);
