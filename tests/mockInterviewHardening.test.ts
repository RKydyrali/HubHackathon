import { describe, expect, test } from "vitest";

import {
  countMockInterviewUserMessages,
  truncateMockInterviewTranscriptForDebrief,
} from "../convex/lib/mockInterviewHardening";

describe("countMockInterviewUserMessages", () => {
  test("counts only user role", () => {
    expect(
      countMockInterviewUserMessages([
        { role: "assistant" },
        { role: "user" },
        { role: "user" },
      ]),
    ).toBe(2);
  });

  test("returns zero for empty", () => {
    expect(countMockInterviewUserMessages([])).toBe(0);
  });
});

describe("truncateMockInterviewTranscriptForDebrief", () => {
  test("returns short text unchanged", () => {
    const t = "hello";
    expect(truncateMockInterviewTranscriptForDebrief(t, 100)).toBe(t);
  });

  test("keeps suffix when over limit", () => {
    const t = "a".repeat(50);
    const out = truncateMockInterviewTranscriptForDebrief(t, 20);
    expect(out.length).toBeGreaterThan(20);
    expect(out.endsWith("a".repeat(20))).toBe(true);
    expect(out.startsWith("…")).toBe(true);
  });
});
