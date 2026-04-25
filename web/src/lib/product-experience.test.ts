import { describe, expect, test } from "vitest";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getEmployerFirstRunActions,
  getCommandSearchGroupsForRole,
  getNotificationAction,
  getSeekerFirstRunSteps,
  mergeNotificationPreferences,
  shouldShowOnboardingHint,
} from "./product-experience";

describe("product experience helpers", () => {
  test("scopes command search groups by user role", () => {
    expect(getCommandSearchGroupsForRole("seeker", "ru").map((group) => group.kind)).toEqual([
      "vacancies",
      "applications",
    ]);
    expect(getCommandSearchGroupsForRole("employer", "ru").map((group) => group.kind)).toEqual([
      "vacancies",
      "applicants",
    ]);
    expect(getCommandSearchGroupsForRole("admin", "ru").map((group) => group.kind)).toEqual([
      "users",
      "vacancies",
      "applications",
    ]);
    expect(getCommandSearchGroupsForRole("seeker", "ru")[0]?.label).toBe("Вакансии");
    expect(getCommandSearchGroupsForRole("seeker", "kk")[0]?.label).toBe("Вакансиялар");
  });

  test("merges persisted notification preferences with production defaults", () => {
    expect(
      mergeNotificationPreferences({
        telegram: false,
        interviews: false,
      }),
    ).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      telegram: false,
      interviews: false,
    });
  });

  test("shows first-time hints only when useful and not dismissed", () => {
    expect(
      shouldShowOnboardingHint({
        hintId: "seeker.profile.start",
        hasRelevantData: false,
        dismissedHints: {},
      }),
    ).toBe(true);

    expect(
      shouldShowOnboardingHint({
        hintId: "seeker.profile.start",
        hasRelevantData: true,
        dismissedHints: {},
      }),
    ).toBe(false);

    expect(
      shouldShowOnboardingHint({
        hintId: "seeker.profile.start",
        hasRelevantData: false,
        dismissedHints: { "seeker.profile.start": Date.now() },
      }),
    ).toBe(false);
  });

  test("guides seekers from profile completion through matches, applications, and interview prep", () => {
    expect(getSeekerFirstRunSteps("ru").map((step) => step.href)).toEqual([
      "/profile",
      "/for-you",
      "/vacancies",
      "/interview-trainer",
    ]);
    expect(getSeekerFirstRunSteps("ru")[1].title).toMatch(/совпад/i);
  });

  test("offers employer first-run actions for manual and AI vacancy creation", () => {
    expect(getEmployerFirstRunActions("ru")).toEqual([
      expect.objectContaining({
        kind: "manual",
        href: "/employer/vacancies?mode=manual",
      }),
      expect.objectContaining({
        kind: "ai",
        href: "/employer/vacancies?mode=ai",
      }),
    ]);
  });

  test("maps notification types back to actionable product screens", () => {
    expect(
      getNotificationAction(
        {
          type: "new_application",
          dedupeKey: "new_application:employer_1:application_7:base",
          action: { labelKey: "openApplication", href: "/employer/applications/application_7" },
        },
        "employer",
        "ru",
      ),
    ).toMatchObject({
      label: "Открыть отклик",
      href: "/employer/applications/application_7",
    });

    expect(
      getNotificationAction(
        {
          type: "strong_match",
          dedupeKey: "strong_match:seeker_1:vacancy_9:base",
          payload: { vacancyId: "vacancy_9" },
        },
        "seeker",
        "ru",
      ),
    ).toMatchObject({
      label: "Открыть совпадение",
      href: "/for-you?vacancyId=vacancy_9",
    });

    expect(
      getNotificationAction(
        {
          type: "interview_update",
          dedupeKey: "interview_update:seeker_1:interview_3:scheduled",
          payload: { interviewId: "interview_3" },
        },
        "seeker",
        "kk",
      ),
    ).toMatchObject({
      label: "Сұхбатты ашу",
      href: "/interviews?interviewId=interview_3",
    });
  });

  test("falls back to dedupe entity ids only for legacy notifications", () => {
    expect(
      getNotificationAction(
        {
          type: "strong_match",
          dedupeKey: "strong_match:seeker_1:vacancy_9:profile_2",
          action: { labelKey: "openMatch", href: "https://evil.test/vacancy_9" },
        },
        "seeker",
      ),
    ).toMatchObject({
      href: "/for-you?vacancyId=vacancy_9",
    });

    expect(
      getNotificationAction(
        {
          type: "strong_match",
          dedupeKey: "strong_match:seeker_1:vacancy_9:profile_2",
        },
        "seeker",
      ),
    ).toMatchObject({
      href: "/for-you?vacancyId=vacancy_9",
    });

    expect(
      getNotificationAction(
        {
          type: "custom",
          dedupeKey: "custom:seeker_1:custom_1:base",
        },
        "seeker",
      ),
    ).toBeNull();
  });
});
