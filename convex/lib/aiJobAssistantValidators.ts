import { v } from "convex/values";

export const aiJobWorkTypeValidator = v.union(
  v.literal("full_time"),
  v.literal("part_time"),
  v.literal("temporary"),
  v.null(),
);

export const aiJobExperienceLevelValidator = v.union(
  v.literal("none"),
  v.literal("junior"),
  v.literal("experienced"),
  v.null(),
);

export const aiJobUrgencyValidator = v.union(
  v.literal("today"),
  v.literal("this_week"),
  v.literal("flexible"),
  v.null(),
);

export const aiJobSourcePreferenceValidator = v.union(
  v.literal("native"),
  v.literal("hh"),
  v.literal("any"),
);

export const aiJobCriteriaValidator = v.object({
  roles: v.array(v.string()),
  skills: v.array(v.string()),
  city: v.union(v.string(), v.null()),
  district: v.union(v.string(), v.null()),
  schedule: v.union(v.string(), v.null()),
  workType: aiJobWorkTypeValidator,
  experienceLevel: aiJobExperienceLevelValidator,
  salaryMin: v.union(v.number(), v.null()),
  urgency: aiJobUrgencyValidator,
  sourcePreference: aiJobSourcePreferenceValidator,
});

export const aiJobAssistantIntentValidator = v.union(
  v.literal("find_jobs"),
  v.literal("refine_results"),
  v.literal("compare_jobs"),
  v.literal("ask_question"),
  v.literal("unknown"),
);

export const aiJobAssistantExtractionValidator = v.object({
  intent: aiJobAssistantIntentValidator,
  knownCriteria: aiJobCriteriaValidator,
  missingSignals: v.array(v.string()),
  nextQuestion: v.union(v.string(), v.null()),
  shouldShowResults: v.boolean(),
  confidence: v.number(),
});

export const aiJobChatMessageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

export const aiJobChatMessageMetadataValidator = v.optional(
  v.object({
    intent: v.optional(aiJobAssistantIntentValidator),
    criteria: v.optional(aiJobCriteriaValidator),
    vacancyIds: v.optional(v.array(v.id("vacancies"))),
    kind: v.optional(v.string()),
  }),
);
