import { httpRouter } from "convex/server";
import { z } from "zod";

import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { assertSharedSecret, jsonResponse, parseJsonBody } from "./lib/http";

const http = httpRouter();

const botUserUpsertSchema = z.object({
  telegramChatId: z.string().min(1),
  telegramUsername: z.string().min(1).optional(),
  clerkId: z.string().min(1).optional(),
  role: z.enum(["seeker", "employer", "admin"]).optional(),
});

const botVacancyListSchema = z.object({
  city: z.string().min(1).optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const botApplicationSchema = z.object({
  telegramChatId: z.string().min(1),
  vacancyId: z.string().min(1),
  screeningAnswers: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .optional(),
});

const botNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["new_application", "status_change", "strong_match", "custom"]),
  dedupeKey: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

http.route({
  path: "/bot/users/upsert",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertSharedSecret(request);
      const body = await parseJsonBody(request, botUserUpsertSchema);
      const user = await ctx.runMutation(internal.users.upsertFromBot, body);
      return jsonResponse({ user });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Bad request" },
        { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 },
      );
    }
  }),
});

async function handleVacancyList(ctx: Parameters<typeof httpAction>[0] | any, input: {
  city?: string;
  limit?: number;
}) {
  const vacancies = await ctx.runQuery(api.vacancies.listPublicVacancies, input);
  return jsonResponse({ vacancies });
}

http.route({
  path: "/bot/vacancies",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      assertSharedSecret(request);
      const input = botVacancyListSchema.parse({
        city: request.url ? new URL(request.url).searchParams.get("city") ?? undefined : undefined,
        limit: request.url
          ? Number(new URL(request.url).searchParams.get("limit") ?? undefined) || undefined
          : undefined,
      });
      return handleVacancyList(ctx, input);
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Bad request" },
        { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 },
      );
    }
  }),
});

http.route({
  path: "/bot/vacancies",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertSharedSecret(request);
      const body = await parseJsonBody(request, botVacancyListSchema);
      return handleVacancyList(ctx, body);
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Bad request" },
        { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 },
      );
    }
  }),
});

http.route({
  path: "/bot/applications",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertSharedSecret(request);
      const body = await parseJsonBody(request, botApplicationSchema);
      const user = await ctx.runQuery(internal.users.getByTelegramChatId, {
        telegramChatId: body.telegramChatId,
      });
      if (!user) {
        return jsonResponse({ error: "User not found" }, { status: 404 });
      }
      const application = await ctx.runMutation(internal.applications.createFromBot, {
        vacancyId: body.vacancyId as any,
        seekerUserId: user._id,
        screeningAnswers: body.screeningAnswers,
      });
      return jsonResponse({ application });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Bad request" },
        { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 },
      );
    }
  }),
});

http.route({
  path: "/bot/notifications/send",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      assertSharedSecret(request);
      const body = await parseJsonBody(request, botNotificationSchema);
      const notification = await ctx.runAction(internal.notifications.dispatchNotification, {
        userId: body.userId as any,
        type: body.type,
        dedupeKey: body.dedupeKey,
        title: body.title,
        body: body.body,
      });
      return jsonResponse({ notification });
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Bad request" },
        { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 },
      );
    }
  }),
});

export default http;
