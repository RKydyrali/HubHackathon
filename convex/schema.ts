import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { EMBEDDING_DIMENSION } from "./lib/constants";
import {
  aiJobChatMessageMetadataValidator,
  aiJobChatMessageRoleValidator,
  aiJobCriteriaValidator,
} from "./lib/aiJobAssistantValidators";
import {
  postHireChannelValidator,
  postHireVisibilityValidator,
  recruiterChatMessageMetadataValidator,
  recruiterChatMessageRoleValidator,
} from "./lib/recruiterChatValidators";
import {
  applicationStatusValidator,
  demoAnalyticsKindValidator,
  embeddingValidator,
  employmentTypeValidator,
  experienceLevelValidator,
  interviewStatusValidator,
  companyComplaintKindValidator,
  companyComplaintStatusValidator,
  mockInterviewMessageValidator,
  mockInterviewSessionStatusValidator,
  notificationDeliveryStatusValidator,
  notificationTypeValidator,
  screeningAnswerValidator,
  screeningQuestionValidator,
  userRoleValidator,
  vacancySourceValidator,
  vacancyStatusValidator,
  workFormatValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    role: v.optional(userRoleValidator),
    telegramChatId: v.optional(v.string()),
    telegramUsername: v.optional(v.string()),
    isBotLinked: v.boolean(),
    notificationPreferences: v.optional(
      v.object({
        inApp: v.boolean(),
        telegram: v.boolean(),
        newApplications: v.boolean(),
        statusChanges: v.boolean(),
        interviews: v.boolean(),
        aiRecommendations: v.boolean(),
      }),
    ),
    dismissedHints: v.optional(v.record(v.string(), v.number())),
    /** Dev / seed: batch id for idempotent clear (e.g. mangystau_v1). */
    seedBatchId: v.optional(v.string()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_telegramChatId", ["telegramChatId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  telegramLinkTokens: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    telegramChatId: v.optional(v.string()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"]),

  companies: defineTable({
    slug: v.string(),
    name: v.string(),
    legalName: v.optional(v.string()),
    description: v.string(),
    industry: v.string(),
    companyType: v.string(),
    address: v.string(),
    city: v.string(),
    district: v.optional(v.string()),
    logoUrl: v.string(),
    phone: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
    ownerUserId: v.id("users"),
    /** Widened migration field. New writes set it; old rows fall back to 0 until backfilled. */
    companyTrustScore: v.optional(v.number()),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  profiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    city: v.string(),
    district: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.array(v.string()),
    resumeText: v.optional(v.string()),
    embedding: embeddingValidator,
    phone: v.optional(v.string()),
    emailPublic: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    preferredSalaryMin: v.optional(v.number()),
    preferredSalaryMax: v.optional(v.number()),
    preferredCurrency: v.optional(v.string()),
    workFormatPreference: v.optional(workFormatValidator),
    employmentTypes: v.optional(v.array(employmentTypeValidator)),
    educationSummary: v.optional(v.string()),
    experienceSummary: v.optional(v.string()),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_seedBatchId", ["seedBatchId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: EMBEDDING_DIMENSION,
    }),

  vacancies: defineTable({
    ownerUserId: v.optional(v.id("users")),
    companyId: v.optional(v.id("companies")),
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
    publishedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    employmentType: v.optional(employmentTypeValidator),
    experienceLevel: v.optional(experienceLevelValidator),
    workFormat: v.optional(workFormatValidator),
    languageRequirements: v.optional(v.array(v.string())),
    benefits: v.optional(v.array(v.string())),
    requirements: v.optional(v.string()),
    responsibilities: v.optional(v.string()),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_companyId", ["companyId"])
    .index("by_source_sourceId", ["source", "sourceId"])
    .index("by_status", ["status"])
    .index("by_source", ["source"])
    .index("by_seedBatchId", ["seedBatchId"])
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
    seedBatchId: v.optional(v.string()),
  })
    .index("by_vacancyId", ["vacancyId"])
    .index("by_seekerUserId", ["seekerUserId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  applicationStatusEvents: defineTable({
    applicationId: v.id("applications"),
    fromStatus: v.optional(applicationStatusValidator),
    toStatus: applicationStatusValidator,
    changedAt: v.number(),
    actorUserId: v.optional(v.id("users")),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_applicationId", ["applicationId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  applicationMessages: defineTable({
    applicationId: v.id("applications"),
    senderUserId: v.id("users"),
    recipientUserId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_applicationId", ["applicationId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  companyComplaints: defineTable({
    companyId: v.id("companies"),
    authorUserId: v.id("users"),
    vacancyId: v.optional(v.id("vacancies")),
    applicationId: v.optional(v.id("applications")),
    kind: companyComplaintKindValidator,
    details: v.string(),
    status: companyComplaintStatusValidator,
    createdAt: v.number(),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_companyId", ["companyId"])
    .index("by_companyId_and_status", ["companyId", "status"])
    .index("by_seedBatchId", ["seedBatchId"]),

  companyTrustMetrics: defineTable({
    companyId: v.id("companies"),
    applicationsCount: v.number(),
    employerResponsesCount: v.number(),
    hiresCount: v.number(),
    validComplaintsCount: v.number(),
    firstResponseTimeTotalMs: v.number(),
    averageFirstResponseTimeMs: v.optional(v.number()),
    updatedAt: v.number(),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_companyId", ["companyId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  savedVacancies: defineTable({
    userId: v.id("users"),
    vacancyId: v.id("vacancies"),
    savedAt: v.number(),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_vacancyId", ["userId", "vacancyId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  /** Internal: multi-phase Mangystau marketplace seed progress (cleared with same `batchId`). */
  seedScratchpads: defineTable({
    batchId: v.string(),
    scale: v.number(),
    phase: v.string(),
    phaseOffset: v.number(),
    targetEmployers: v.number(),
    targetSeekers: v.number(),
    targetVacancies: v.number(),
    targetApplications: v.number(),
    employerUserIds: v.array(v.id("users")),
    companyIds: v.array(v.id("companies")),
    seekerUserIds: v.array(v.id("users")),
    vacancyIds: v.array(v.id("vacancies")),
    applicationIds: v.array(v.id("applications")),
  }).index("by_batchId", ["batchId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: notificationTypeValidator,
    dedupeKey: v.string(),
    action: v.optional(
      v.object({
        labelKey: v.string(),
        href: v.string(),
      }),
    ),
    payload: v.optional(
      v.object({
        applicationId: v.optional(v.string()),
        vacancyId: v.optional(v.string()),
        interviewId: v.optional(v.string()),
      }),
    ),
    title: v.string(),
    body: v.string(),
    deliveryStatus: notificationDeliveryStatusValidator,
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    seedBatchId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_dedupeKey", ["dedupeKey"])
    .index("by_seedBatchId", ["seedBatchId"]),

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

  recruiterAiChats: defineTable({
    employerUserId: v.id("users"),
    vacancyId: v.optional(v.id("vacancies")),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_employerUserId_and_updatedAt", ["employerUserId", "updatedAt"]),

  recruiterAiChatMessages: defineTable({
    chatId: v.id("recruiterAiChats"),
    role: recruiterChatMessageRoleValidator,
    content: v.string(),
    metadata: recruiterChatMessageMetadataValidator,
    createdAt: v.number(),
  }).index("by_chatId_and_createdAt", ["chatId", "createdAt"]),

  /** Per hired application + channel: visibility policy and mutual-consent timestamps. */
  postHireChannelConsents: defineTable({
    applicationId: v.id("applications"),
    channel: postHireChannelValidator,
    visibility: postHireVisibilityValidator,
    employerConsentAt: v.optional(v.number()),
    seekerConsentAt: v.optional(v.number()),
  }).index("by_applicationId_and_channel", ["applicationId", "channel"]),

  interviews: defineTable({
    applicationId: v.id("applications"),
    vacancyId: v.id("vacancies"),
    employerUserId: v.id("users"),
    seekerUserId: v.id("users"),
    scheduledAt: v.number(),
    locationOrLink: v.optional(v.string()),
    status: interviewStatusValidator,
    seedBatchId: v.optional(v.string()),
  })
    .index("by_applicationId", ["applicationId"])
    .index("by_employerUserId", ["employerUserId"])
    .index("by_seekerUserId", ["seekerUserId"])
    .index("by_seedBatchId", ["seedBatchId"]),

  mockInterviewSessions: defineTable({
    vacancyId: v.id("vacancies"),
    seekerUserId: v.id("users"),
    messages: v.array(mockInterviewMessageValidator),
    status: mockInterviewSessionStatusValidator,
    finalScore: v.optional(v.number()),
    hiringRecommendation: v.optional(v.string()),
    strengths: v.optional(v.array(v.string())),
    improvements: v.optional(v.array(v.string())),
    debriefSummary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_seekerUserId_and_updatedAt", ["seekerUserId", "updatedAt"])
    .index("by_seekerUserId_and_vacancyId", ["seekerUserId", "vacancyId"]),

  demoAnalyticsEvents: defineTable({
    kind: demoAnalyticsKindValidator,
    vacancyId: v.optional(v.id("vacancies")),
    userId: v.optional(v.id("users")),
    surface: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  })
    .index("by_kind_and_createdAt", ["kind", "createdAt"])
    .index("by_vacancyId_and_createdAt", ["vacancyId", "createdAt"]),
});
