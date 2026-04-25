import { v } from "convex/values";

export const recruiterChatMessageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

export const recruiterChatMessageMetadataValidator = v.optional(
  v.object({
    kind: v.optional(v.string()),
    candidateCards: v.optional(
      v.array(
        v.object({
          profileId: v.id("profiles"),
          seekerUserId: v.id("users"),
          fullName: v.string(),
          city: v.string(),
          matchScore: v.number(),
          reasons: v.array(v.string()),
        }),
      ),
    ),
    jobSuggestions: v.optional(
      v.object({
        titleSuggestion: v.optional(v.string()),
        requirementsRewrite: v.optional(v.string()),
        responsibilitiesRewrite: v.optional(v.string()),
        salaryWording: v.optional(v.string()),
        missingFields: v.optional(v.array(v.string())),
        toneNotes: v.optional(v.string()),
        issues: v.optional(
          v.array(
            v.object({
              severity: v.union(v.literal("info"), v.literal("warn"), v.literal("block")),
              code: v.string(),
              message: v.string(),
            }),
          ),
        ),
      }),
    ),
  }),
);

export const postHireChannelValidator = v.union(
  v.literal("email"),
  v.literal("telegram"),
  v.literal("phone"),
);

export const postHireVisibilityValidator = v.union(v.literal("public"), v.literal("mutual"));
