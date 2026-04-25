import { z } from "zod";

/** Routes a single employer turn between candidate matching and vacancy copy help. */
export const recruiterAgentRouterSchema = z.object({
  mode: z.enum(["match_candidates", "improve_job_post", "clarify", "both"]),
  clarifyingQuestion: z.string().nullable(),
  quickReplies: z.array(z.string()).max(6),
  reasoning: z.string(),
});

export type RecruiterAgentRouter = z.infer<typeof recruiterAgentRouterSchema>;

export const recruiterCandidateReasonSchema = z.object({
  profileId: z.string(),
  rank: z.number().min(1).max(20),
  matchScore: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1).max(5),
});

export const recruiterMatchPackSchema = z.object({
  assistantMessage: z.string(),
  candidates: z.array(recruiterCandidateReasonSchema).max(12),
});

export type RecruiterMatchPack = z.infer<typeof recruiterMatchPackSchema>;

export const recruiterVacancyCoachSchema = z.object({
  assistantMessage: z.string(),
  titleSuggestion: z.string().nullable(),
  requirementsRewrite: z.string().nullable(),
  responsibilitiesRewrite: z.string().nullable(),
  salaryWording: z.string().nullable(),
  missingFields: z.array(z.string()).max(12),
  toneNotes: z.string().nullable(),
  issues: z
    .array(
      z.object({
        severity: z.enum(["info", "warn", "block"]),
        code: z.string(),
        message: z.string(),
      }),
    )
    .max(12),
});

export type RecruiterVacancyCoach = z.infer<typeof recruiterVacancyCoachSchema>;
