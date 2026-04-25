import { z } from "zod";

/**
 * Request body for POST /v1/bot/users/upsert and legacy /bot/users/upsert.
 * `role` is onboarding-only; privileged roles are never accepted from the integrator.
 */
export const botUserOnboardingRoles = ["seeker", "employer"] as const;

export const botUserUpsertSchema = z.object({
  telegramChatId: z.string().min(1),
  telegramUsername: z.string().min(1).optional(),
  clerkId: z.string().min(1).optional(),
  role: z.enum(botUserOnboardingRoles).optional(),
});
