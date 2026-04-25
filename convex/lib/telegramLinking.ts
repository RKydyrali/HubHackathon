export const TELEGRAM_LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

export type TelegramLinkRecordStatus = "active" | "expired" | "used";

export function buildTelegramDeepLink(botUrl: string, token: string): string {
  const url = new URL(botUrl);
  url.searchParams.set("start", token);
  return url.toString();
}

export function getTelegramLinkRecordStatus(
  record: { expiresAt: number; usedAt?: number },
  now = Date.now(),
): TelegramLinkRecordStatus {
  if (record.usedAt !== undefined) return "used";
  if (record.expiresAt <= now) return "expired";
  return "active";
}

export function hasTelegramLinkConflict(input: {
  existingTelegramUserId: string | null;
  targetUserId: string;
}): boolean {
  return (
    input.existingTelegramUserId !== null &&
    input.existingTelegramUserId !== input.targetUserId
  );
}
