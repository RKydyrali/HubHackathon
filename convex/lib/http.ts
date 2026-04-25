import { z, ZodError } from "zod";

export class BotSharedSecretNotConfiguredError extends Error {
  override readonly name = "BotSharedSecretNotConfiguredError";
  constructor() {
    super("BOT_SHARED_SECRET is not configured");
  }
}

export function assertSharedSecret(request: Request): void {
  const expected = process.env.BOT_SHARED_SECRET;
  if (!expected) {
    throw new BotSharedSecretNotConfiguredError();
  }

  const provided =
    request.headers.get("x-bot-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (provided !== expected) {
    throw new Error("Unauthorized");
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON");
  }
  return schema.parse(body);
}

export function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

type ZodIssueForClient = { path: (string | number)[]; message: string; code: string };

function zodIssuesForResponse(error: ZodError): ZodIssueForClient[] {
  return error.issues.map((i) => ({
    path: i.path as (string | number)[],
    message: i.message,
    code: i.code,
  }));
}

/**
 * Bot HTTP error mapping: misconfiguration (500), auth (401), Zod/JSON (400), default (400).
 */
export function botErrorResponse(error: unknown): Response {
  if (error instanceof BotSharedSecretNotConfiguredError) {
    return jsonResponse({ error: "Internal server error" }, { status: 500 });
  }
  if (error instanceof ZodError) {
    return jsonResponse(
      { error: "Validation failed", issues: zodIssuesForResponse(error) },
      { status: 400 },
    );
  }
  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Invalid JSON") {
      return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
    }
  }
  return jsonResponse(
    { error: error instanceof Error ? error.message : "Bad request" },
    { status: 400 },
  );
}

export type TelegramSendSuccess = { ok: true; status: number };
export type TelegramSendFailure = {
  ok: false;
  error: string;
  status?: number;
};
export type TelegramSendResult = TelegramSendSuccess | TelegramSendFailure;

function telegramFailureShouldRetry(status: number | undefined): boolean {
  if (status === undefined) {
    return true;
  }
  if (status === 429) {
    return true;
  }
  return status >= 500;
}

async function sendTelegramMessageOnce(params: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<TelegramSendResult> {
  const response = await fetch(
    `https://api.telegram.org/bot${params.botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: params.chatId,
        text: params.text,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      error: `Telegram ${response.status}: ${detail}`.trim(),
      status: response.status,
    };
  }

  return { ok: true, status: response.status };
}

export async function sendTelegramMessageSafe(params: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<TelegramSendResult> {
  try {
    let result = await sendTelegramMessageOnce(params);
    if (!result.ok && telegramFailureShouldRetry(result.status)) {
      await new Promise((r) => setTimeout(r, 1000));
      result = await sendTelegramMessageOnce(params);
    }
    return result;
  } catch (error) {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      return await sendTelegramMessageOnce(params);
    } catch {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
