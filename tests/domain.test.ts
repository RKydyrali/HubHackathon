import { describe, expect, test } from "vitest";

import {
  allowedApplicationTransitions,
  buildNotificationDedupeKey,
  canApplyToVacancy,
  isSelectableOnboardingRole,
  isStrongMatch,
  isValidApplicationTransition,
  normalizeMatchScore,
} from "../convex/lib/domain";

describe("application transitions", () => {
  test("allows only the strict forward transitions", () => {
    expect(allowedApplicationTransitions.submitted).toEqual(["reviewing"]);
    expect(isValidApplicationTransition("submitted", "reviewing")).toBe(true);
    expect(isValidApplicationTransition("reviewing", "interview")).toBe(true);
    expect(isValidApplicationTransition("interview", "hired")).toBe(true);
  });

  test("rejects invalid jumps and backwards moves", () => {
    expect(isValidApplicationTransition("submitted", "hired")).toBe(false);
    expect(isValidApplicationTransition("interview", "reviewing")).toBe(false);
    expect(isValidApplicationTransition("rejected", "reviewing")).toBe(false);
  });
});

describe("vacancy application rules", () => {
  test("allows in-app applications only for published native vacancies", () => {
    expect(canApplyToVacancy("native", "published")).toBe(true);
    expect(canApplyToVacancy("native", "draft")).toBe(false);
    expect(canApplyToVacancy("hh", "published")).toBe(false);
  });
});

describe("notification dedupe and match scoring", () => {
  test("builds deterministic dedupe keys", () => {
    const first = buildNotificationDedupeKey({
      type: "strong_match",
      recipientUserId: "u1",
      entityId: "v1",
      secondaryId: "p1",
    });
    const second = buildNotificationDedupeKey({
      type: "strong_match",
      recipientUserId: "u1",
      entityId: "v1",
      secondaryId: "p1",
    });

    expect(first).toBe(second);
  });

  test("normalizes vector scores into 0-100", () => {
    expect(normalizeMatchScore(-1)).toBe(0);
    expect(normalizeMatchScore(0)).toBe(50);
    expect(normalizeMatchScore(1)).toBe(100);
    expect(isStrongMatch(85)).toBe(true);
    expect(isStrongMatch(84)).toBe(false);
  });
});

describe("onboarding role selection", () => {
  test("allows seekers and employers but never admin self-selection", () => {
    expect(isSelectableOnboardingRole("seeker")).toBe(true);
    expect(isSelectableOnboardingRole("employer")).toBe(true);
    expect(isSelectableOnboardingRole("admin")).toBe(false);
  });
});
