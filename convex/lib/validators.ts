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

export const interviewScenarioStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const interviewScenarioSubmissionStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("evaluating"),
  v.literal("evaluated"),
  v.literal("evaluation_failed"),
);

export const interviewScenarioTaskValidator = v.object({
  prompt: v.string(),
});

export const interviewScenarioRubricCriterionValidator = v.object({
  criterion: v.string(),
  description: v.string(),
  maxScore: v.number(),
});

export const interviewScenarioTasksValidator = v.array(interviewScenarioTaskValidator);
export const interviewScenarioConstraintsValidator = v.array(v.string());
export const interviewScenarioRubricValidator = v.array(
  interviewScenarioRubricCriterionValidator,
);

export const interviewScenarioDraftValidator = v.object({
  context: v.string(),
  tasks: interviewScenarioTasksValidator,
  constraints: interviewScenarioConstraintsValidator,
  rubric: interviewScenarioRubricValidator,
});

export const interviewScenarioAnswerValidator = v.object({
  taskIndex: v.number(),
  answer: v.string(),
  links: v.optional(v.array(v.string())),
});

export const interviewScenarioEvaluationValidator = v.object({
  overallScore: v.number(),
  criterionScores: v.array(
    v.object({
      criterion: v.string(),
      score: v.number(),
      maxScore: v.number(),
      evidence: v.string(),
    }),
  ),
  riskNotes: v.array(v.string()),
  recommendation: v.string(),
});

export const companyComplaintKindValidator = v.union(
  v.literal("no_response"),
  v.literal("misleading_vacancy"),
  v.literal("bad_conditions"),
  v.literal("other"),
);

export const companyComplaintStatusValidator = v.union(
  v.literal("open"),
  v.literal("valid"),
  v.literal("rejected"),
  v.literal("resolved"),
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
