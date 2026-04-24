import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { EMBEDDING_DIMENSION } from "./lib/constants";
import {
  aiJobChatMessageMetadataValidator,
  aiJobChatMessageRoleValidator,
  aiJobCriteriaValidator,
} from "./lib/aiJobAssistantValidators";
import {
  applicationStatusValidator,
  embeddingValidator,
  interviewStatusValidator,
  notificationDeliveryStatusValidator,
  notificationTypeValidator,
  screeningAnswerValidator,
  screeningQuestionValidator,
  userRoleValidator,
  vacancySourceValidator,
  vacancyStatusValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    role: v.optional(userRoleValidator),
    telegramChatId: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    isBotLinked: v.boolean(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_telegramChatId", ["telegramChatId"]),

  profiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    city: v.string(),
    district: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    resumeText: v.optional(v.string()),
    embedding: embeddingValidator,
  })
    .index("by_userId", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSION,
    }),

  vacancies: defineTable({
    ownerUserId: v.optional(v.id("users")),
    source: vacancySourceValidator,
    sourceId: v.string(),
    status: vacancyStatusValidator,
    title: v.string(),
    description: v.string(),
    city: v.string(),
    district: v.optional(v.string()),
    salaryMin: v.optional(v.number()),
    salaryMax: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    screeningQuestions: v.optional(screeningQuestionValidator),
    embedding: embeddingValidator,
    externalApplyUrl: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_source_sourceId", ["source", "sourceId"])
    .index("by_status", ["status"])
    .index("by_source", ["source"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSION,
    }),

  applications: defineTable({
    vacancyId: v.id("vacancies"),
    seekerUserId: v.id("users"),
    status: applicationStatusValidator,
    screeningAnswers: screeningAnswerValidator,
    aiScore: v.optional(v.number()),
    aiSummary: v.optional(v.string()),
  })
    .index("by_vacancyId", ["vacancyId"])
    .index("by_seekerUserId", ["seekerUserId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationTypeValidator,
    dedupeKey: v.string(),
    title: v.string(),
    body: v.string(),
    deliveryStatus: notificationDeliveryStatusValidator,
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_dedupeKey", ["dedupeKey"]),

  reviews: defineTable({
    authorUserId: v.id("users"),
    targetUserId: v.id("users"),
    applicationId: v.id("applications"),
    rating: v.number(),
    comment: v.optional(v.string()),
  }),

  aiJobChats: defineTable({
    userId: v.optional(v.id("users")),
    title: v.string(),
    extractedCriteria: aiJobCriteriaValidator,
    matchedVacancyIds: v.optional(v.array(v.id("vacancies"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId_and_updatedAt", ["userId", "updatedAt"]),

  aiJobChatMessages: defineTable({
    chatId: v.id("aiJobChats"),
    role: aiJobChatMessageRoleValidator,
    content: v.string(),
    metadata: aiJobChatMessageMetadataValidator,
    createdAt: v.number(),
  }).index("by_chatId_and_createdAt", ["chatId", "createdAt"]),

  interviews: defineTable({
    applicationId: v.id("applications"),
    vacancyId: v.id("vacancies"),
    employerUserId: v.id("users"),
    seekerUserId: v.id("users"),
    scheduledAt: v.number(),
    locationOrLink: v.optional(v.string()),
    status: interviewStatusValidator,
  })
    .index("by_applicationId", ["applicationId"])
    .index("by_employerUserId", ["employerUserId"])
    .index("by_seekerUserId", ["seekerUserId"]),
});
