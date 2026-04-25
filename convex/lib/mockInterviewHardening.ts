import { MOCK_INTERVIEW_MAX_DEBRIEF_TRANSCRIPT_CHARS } from "./constants";

export function countMockInterviewUserMessages(
  messages: ReadonlyArray<{ role: string }>,
): number {
  return messages.reduce(
    (n, m) => n + (m.role === "user" ? 1 : 0),
    0,
  );
}

/**
 * Keeps the end of the transcript so the debrief model sees the latest turns.
 */
export function truncateMockInterviewTranscriptForDebrief(
  transcript: string,
  maxChars: number = MOCK_INTERVIEW_MAX_DEBRIEF_TRANSCRIPT_CHARS,
): string {
  if (transcript.length <= maxChars) {
    return transcript;
  }
  return `…(начало скрыто — лимит ${maxChars} символов)\n${transcript.slice(
    transcript.length - maxChars,
  )}`;
}
