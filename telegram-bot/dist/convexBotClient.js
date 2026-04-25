import { z } from "zod";
export class ConvexBotHttpError extends Error {
    status;
    body;
    constructor(status, body) {
        super(`Convex HTTP ${status}`);
        this.status = status;
        this.body = body;
        this.name = "ConvexBotHttpError";
    }
}
const userDocSchema = z.object({}).passthrough();
const upsertUserResponseSchema = z.object({
    user: userDocSchema,
});
const vacancySchema = z
    .object({
    _id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    source: z.enum(["native", "hh"]),
    city: z.string(),
    status: z.string(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    salaryCurrency: z.string().optional(),
    externalApplyUrl: z.string().optional(),
    screeningQuestions: z.array(z.string()).optional(),
})
    .passthrough();
const listVacanciesResponseSchema = z.object({
    vacancies: z.array(vacancySchema),
});
const applicationResponseSchema = z.object({
    application: z.object({}).passthrough(),
});
const errorBodySchema = z.object({
    error: z.string(),
    issues: z.array(z.unknown()).optional(),
});
const notificationPrefsRowSchema = z.object({
    userId: z.string(),
    isBotLinked: z.boolean(),
    telegramUsername: z.string().optional(),
    preferences: z.object({
        inApp: z.boolean(),
        telegram: z.boolean(),
        newApplications: z.boolean(),
        statusChanges: z.boolean(),
        interviews: z.boolean(),
        aiRecommendations: z.boolean(),
    }),
});
const patchPrefsResponseSchema = z.object({
    user: userDocSchema,
    preferences: notificationPrefsRowSchema.shape.preferences,
});
export class ConvexBotClient {
    baseUrl;
    secret;
    constructor(baseUrl, secret) {
        this.baseUrl = baseUrl;
        this.secret = secret;
    }
    async postJson(path, body, parse) {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-bot-secret": this.secret,
            },
            body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new ConvexBotHttpError(res.status, json);
        }
        return parse(json);
    }
    async get(path, parse) {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, {
            method: "GET",
            headers: { "x-bot-secret": this.secret },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new ConvexBotHttpError(res.status, json);
        }
        return parse(json);
    }
    async patchJson(path, body, parse) {
        const url = `${this.baseUrl}${path}`;
        const res = await fetch(url, {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
                "x-bot-secret": this.secret,
            },
            body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new ConvexBotHttpError(res.status, json);
        }
        return parse(json);
    }
    async upsertUser(input) {
        const data = await this.postJson("/users/upsert", input, (j) => upsertUserResponseSchema.parse(j));
        return data.user;
    }
    async listVacancies(params) {
        const sp = new URLSearchParams();
        if (params.region)
            sp.set("region", params.region);
        if (params.source)
            sp.set("source", params.source);
        if (params.city)
            sp.set("city", params.city);
        if (params.limit !== undefined)
            sp.set("limit", String(params.limit));
        const q = sp.toString();
        const path = q ? `/vacancies?${q}` : "/vacancies";
        const data = await this.get(path, (j) => listVacanciesResponseSchema.parse(j));
        return data.vacancies;
    }
    async submitApplication(input) {
        const data = await this.postJson("/applications", input, (j) => applicationResponseSchema.parse(j));
        return data.application;
    }
    async getNotificationPreferences(telegramChatId) {
        const path = `/users/notification-preferences?telegramChatId=${encodeURIComponent(telegramChatId)}`;
        return this.get(path, (j) => notificationPrefsRowSchema.parse(j));
    }
    async patchNotificationPreferences(input) {
        return this.patchJson("/users/notification-preferences", input, (j) => patchPrefsResponseSchema.parse(j));
    }
}
export function formatConvexErrorMessage(err) {
    if (err instanceof ConvexBotHttpError) {
        const parsed = errorBodySchema.safeParse(err.body);
        if (parsed.success) {
            return parsed.data.error;
        }
    }
    if (err instanceof Error) {
        return err.message;
    }
    return "Неизвестная ошибка";
}
