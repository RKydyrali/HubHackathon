import { httpRouter, type GenericActionCtx } from "convex/server";
import { z } from "zod";

import { api, internal } from "./_generated/api";
import type { DataModel, Id, TableNames } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { botUserUpsertSchema } from "./lib/botUserHttpSchema";
import {
  assertSharedSecret,
  botErrorResponse,
  jsonResponse,
  parseJsonBody,
} from "./lib/http";
import { mergeNotificationPreferences } from "./lib/notificationPreferences";

const http = httpRouter();

type BotHttpCtx = GenericActionCtx<DataModel>;

function convexId<TableName extends TableNames>(
  _table: TableName,
): z.ZodType<Id<TableName>> {
  return z.string().min(1).transform((s) => s as Id<TableName>);
}

function legacyDeprecationHeaderInit(): HeadersInit {
  const headers: Record<string, string> = { Deprecation: "true" };
  const sunset = process.env.BOT_HTTP_LEGACY_SUNSET;
  if (sunset) {
    headers.Sunset = sunset;
  }
  return headers;
}

function withLegacyDeprecation(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(legacyDeprecationHeaderInit())) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function botHttpAction(
  impl: (ctx: BotHttpCtx, request: Request) => Promise<Response>,
  legacy: boolean,
) {
  return httpAction(async (ctx, request) => {
    const response = await impl(ctx as BotHttpCtx, request);
    return legacy ? withLegacyDeprecation(response) : response;
  });
}

const emptyQueryToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const limitFromQueryOrJson = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  return v;
};

const botVacancyListSchema = z.object({
  city: z.preprocess(emptyQueryToUndefined, z.string().min(1).optional()),
  region: z.preprocess(emptyQueryToUndefined, z.literal("aktau").optional()),
  source: z.preprocess(emptyQueryToUndefined, z.enum(["native", "hh"]).optional()),
  limit: z.preprocess(limitFromQueryOrJson, z.number().int().positive().max(50).optional()),
});

const botApplicationSchema = z.object({
  telegramChatId: z.string().min(1),
  vacancyId: convexId("vacancies"),
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
  userId: convexId("users"),
  type: z.enum([
    "new_application",
    "status_change",
    "strong_match",
    "interview_update",
    "custom",
  ]),
  dedupeKey: z.string().min(1),
  action: z
    .object({
      labelKey: z.string().min(1),
      href: z.string().min(1),
    })
    .optional(),
  payload: z
    .object({
      applicationId: z.string().optional(),
      vacancyId: z.string().optional(),
      interviewId: z.string().optional(),
    })
    .optional(),
  title: z.string().min(1),
  body: z.string().min(1),
});

const botNotificationPreferencesPatchSchema = z.object({
  telegramChatId: z.string().min(1),
  inApp: z.boolean().optional(),
  telegram: z.boolean().optional(),
  newApplications: z.boolean().optional(),
  statusChanges: z.boolean().optional(),
  interviews: z.boolean().optional(),
  aiRecommendations: z.boolean().optional(),
});

const botTelegramLinkSchema = z.object({
  token: z.string().min(16),
  telegramChatId: z.string().min(1),
  telegramUsername: z.string().min(1).optional(),
});

async function handleBotUsersUpsert(ctx: BotHttpCtx, request: Request): Promise<Response> {
  try {
    assertSharedSecret(request);
    const body = await parseJsonBody(request, botUserUpsertSchema);
    const user = await ctx.runMutation(internal.users.upsertFromBot, body);
    return jsonResponse({ user });
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotUsersLinkTelegram(
  ctx: BotHttpCtx,
  request: Request,
): Promise<Response> {
  try {
    assertSharedSecret(request);
    const body = await parseJsonBody(request, botTelegramLinkSchema);
    const user = await ctx.runAction(internal.telegramLinking.redeemFromBot, body);
    return jsonResponse({ user });
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleVacancyList(
  ctx: BotHttpCtx,
  input: { city?: string; region?: "aktau"; source?: "native" | "hh"; limit?: number },
) {
  const vacancies = await ctx.runQuery(api.vacancies.listPublicVacancies, input);
  return jsonResponse({ vacancies });
}

async function handleBotVacanciesGet(ctx: BotHttpCtx, request: Request): Promise<Response> {
  try {
    assertSharedSecret(request);
    const sp = new URL(request.url).searchParams;
    const input = botVacancyListSchema.parse({
      city: sp.get("city") ?? undefined,
      region: sp.get("region") ?? undefined,
      source: sp.get("source") ?? undefined,
      limit: sp.get("limit") ?? undefined,
    });
    return handleVacancyList(ctx, input);
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotVacanciesPost(ctx: BotHttpCtx, request: Request): Promise<Response> {
  try {
    assertSharedSecret(request);
    const body = await parseJsonBody(request, botVacancyListSchema);
    return handleVacancyList(ctx, body);
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotApplications(ctx: BotHttpCtx, request: Request): Promise<Response> {
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
      vacancyId: body.vacancyId,
      seekerUserId: user._id,
      screeningAnswers: body.screeningAnswers,
    });
    return jsonResponse({ application });
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotApplicationsList(ctx: BotHttpCtx, request: Request): Promise<Response> {
  try {
    assertSharedSecret(request);
    const sp = new URL(request.url).searchParams;
    const telegramChatId = sp.get("telegramChatId")?.trim();
    if (!telegramChatId) {
      return jsonResponse({ error: "telegramChatId required" }, { status: 400 });
    }
    const applications = await ctx.runQuery(internal.applications.listForBotByTelegramChatId, {
      telegramChatId,
      limit: 5,
    });
    if (!applications) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
    return jsonResponse({ applications });
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotNotificationsList(ctx: BotHttpCtx, request: Request): Promise<Response> {
  try {
    assertSharedSecret(request);
    const sp = new URL(request.url).searchParams;
    const telegramChatId = sp.get("telegramChatId")?.trim();
    if (!telegramChatId) {
      return jsonResponse({ error: "telegramChatId required" }, { status: 400 });
    }
    const notifications = await ctx.runQuery(internal.notifications.listForBotByTelegramChatId, {
      telegramChatId,
      limit: 5,
    });
    if (!notifications) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
    return jsonResponse({ notifications });
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotNotificationsSend(ctx: BotHttpCtx, request: Request): Promise<Response> {
  try {
    assertSharedSecret(request);
    const body = await parseJsonBody(request, botNotificationSchema);
    const notification = await ctx.runAction(internal.notifications.dispatchNotification, {
      userId: body.userId,
      type: body.type,
      dedupeKey: body.dedupeKey,
      action: body.action,
      payload: body.payload,
      title: body.title,
      body: body.body,
    });
    return jsonResponse({ notification });
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotNotificationPreferencesGet(
  ctx: BotHttpCtx,
  request: Request,
): Promise<Response> {
  try {
    assertSharedSecret(request);
    const sp = new URL(request.url).searchParams;
    const telegramChatId = sp.get("telegramChatId")?.trim();
    if (!telegramChatId) {
      return jsonResponse({ error: "telegramChatId required" }, { status: 400 });
    }
    const row = await ctx.runQuery(internal.users.getNotificationPreferencesForBot, {
      telegramChatId,
    });
    if (!row) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
    return jsonResponse(row);
  } catch (error) {
    return botErrorResponse(error);
  }
}

async function handleBotNotificationPreferencesPatch(
  ctx: BotHttpCtx,
  request: Request,
): Promise<Response> {
  try {
    assertSharedSecret(request);
    const body = await parseJsonBody(request, botNotificationPreferencesPatchSchema);
    const { telegramChatId, ...patch } = body;
    const user = await ctx.runMutation(internal.users.patchNotificationPreferencesFromBot, {
      telegramChatId,
      patch,
    });
    return jsonResponse({
      user,
      preferences: mergeNotificationPreferences(user?.notificationPreferences),
    });
  } catch (error) {
    return botErrorResponse(error);
  }
}

/** Phase C: delete this call (and the `/bot` branch) after legacy traffic is gone. */
function registerBotHttpRoutes(prefix: string, legacy: boolean) {
  http.route({
    path: `${prefix}/users/upsert`,
    method: "POST",
    handler: botHttpAction(handleBotUsersUpsert, legacy),
  });

  http.route({
    path: `${prefix}/users/link-telegram`,
    method: "POST",
    handler: botHttpAction(handleBotUsersLinkTelegram, legacy),
  });

  http.route({
    path: `${prefix}/vacancies`,
    method: "GET",
    handler: botHttpAction(handleBotVacanciesGet, legacy),
  });

  http.route({
    path: `${prefix}/vacancies`,
    method: "POST",
    handler: botHttpAction(handleBotVacanciesPost, legacy),
  });

  http.route({
    path: `${prefix}/applications`,
    method: "GET",
    handler: botHttpAction(handleBotApplicationsList, legacy),
  });

  http.route({
    path: `${prefix}/applications`,
    method: "POST",
    handler: botHttpAction(handleBotApplications, legacy),
  });

  http.route({
    path: `${prefix}/notifications`,
    method: "GET",
    handler: botHttpAction(handleBotNotificationsList, legacy),
  });

  http.route({
    path: `${prefix}/notifications/send`,
    method: "POST",
    handler: botHttpAction(handleBotNotificationsSend, legacy),
  });

  http.route({
    path: `${prefix}/users/notification-preferences`,
    method: "GET",
    handler: botHttpAction(handleBotNotificationPreferencesGet, legacy),
  });

  http.route({
    path: `${prefix}/users/notification-preferences`,
    method: "PATCH",
    handler: botHttpAction(handleBotNotificationPreferencesPatch, legacy),
  });
}

registerBotHttpRoutes("/v1/bot", false);
registerBotHttpRoutes("/bot", true);

export default http;
