import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("seeker"),
  v.literal("employer"),
  v.literal("admin"),
);

/** Roles a client or integrator may assign during onboarding; never `admin`. */
export const onboardingUserRoleValidator = v.union(
  v.literal("seeker"),
  v.literal("employer"),
);

export const vacancySourceValidator = v.union(
  v.literal("native"),
  v.literal("hh"),
);

export const vacancyStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("paused"),
  v.literal("archived"),
);

export const applicationStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("reviewing"),
  v.literal("shortlisted"),
  v.literal("interview"),
  v.literal("offer_sent"),
  v.literal("rejected"),
  v.literal("hired"),
  v.literal("withdrawn"),
);

export const employmentTypeValidator = v.union(
  v.literal("full_time"),
  v.literal("part_time"),
  v.literal("contract"),
  v.literal("rotational"),
  v.literal("internship"),
);

export const experienceLevelValidator = v.union(
  v.literal("intern"),
  v.literal("junior"),
  v.literal("middle"),
  v.literal("senior"),
  v.literal("lead"),
);

export const workFormatValidator = v.union(
  v.literal("office"),
  v.literal("remote"),
  v.literal("hybrid"),
  v.literal("field"),
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
  v.literal("interview_update"),
  v.literal("custom"),
);

export const interviewStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const mockInterviewSessionStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("abandoned"),
);

export const mockInterviewMessageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

export const mockInterviewMessageValidator = v.object({
  role: mockInterviewMessageRoleValidator,
  content: v.string(),
  createdAt: v.number(),
});

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

export const demoAnalyticsKindValidator = v.union(
  v.literal("vacancy_viewed"),
  v.literal("application_submitted"),
  v.literal("ai_assistant_used"),
  v.literal("external_apply_clicked"),
);
