import { z } from "zod";

export function assertSharedSecret(request: Request): void {
  const expected = process.env.BOT_SHARED_SECRET;
  if (!expected) {
    throw new Error("BOT_SHARED_SECRET is not configured");
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
  const body = await request.json();
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
