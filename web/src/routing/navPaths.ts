/** Signed-in AI job matching entry. Persisted chats use `/ai-search/:chatId`. */
export const AI_MATCHING_ROOT = "/ai-search";

export function isAiMatchingPath(pathname: string): boolean {
  return pathname === AI_MATCHING_ROOT || pathname.startsWith(`${AI_MATCHING_ROOT}/`);
}
