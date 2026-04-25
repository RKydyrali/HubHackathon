import { describe, expect, test } from "vitest";
import { ConvexError } from "convex/values";

import {
  assertApplicationTransition,
  allowedApplicationTransitions,
  buildNotificationDedupeKey,
  canApplyToVacancy,
  filterPublicVacancies,
  isSelectableOnboardingRole,
  isStrongMatch,
  isValidApplicationTransition,
  normalizeMatchScore,
  vacancyAcceptsInAppApplications,
  vacancyMatchesAktauRegion,
} from "../convex/lib/domain";

describe("application transitions", () => {
  test("allows only the strict forward transitions", () => {
    expect(allowedApplicationTransitions.submitted).toEqual(["reviewing", "withdrawn"]);
    expect(isValidApplicationTransition("submitted", "reviewing")).toBe(true);
    expect(isValidApplicationTransition("reviewing", "interview")).toBe(true);
    expect(isValidApplicationTransition("reviewing", "shortlisted")).toBe(true);
    expect(isValidApplicationTransition("interview", "offer_sent")).toBe(true);
    expect(isValidApplicationTransition("interview", "hired")).toBe(true);
    expect(isValidApplicationTransition("offer_sent", "hired")).toBe(true);
  });

  test("rejects invalid jumps and backwards moves", () => {
    expect(isValidApplicationTransition("submitted", "hired")).toBe(false);
    expect(isValidApplicationTransition("interview", "reviewing")).toBe(false);
    expect(isValidApplicationTransition("rejected", "reviewing")).toBe(false);
    expect(isValidApplicationTransition("offer_sent", "withdrawn")).toBe(false);
    expect(isValidApplicationTransition("interview", "withdrawn")).toBe(false);
  });

  test("throws ConvexError for invalid transitions", () => {
    expect(() => assertApplicationTransition("submitted", "hired")).toThrow(ConvexError);
  });
});

describe("vacancyMatchesAktauRegion", () => {
  test("matches Latin and Cyrillic spellings", () => {
    expect(vacancyMatchesAktauRegion("Aktau")).toBe(true);
    expect(vacancyMatchesAktauRegion("aktau")).toBe(true);
    expect(vacancyMatchesAktauRegion("Актау")).toBe(true);
    expect(vacancyMatchesAktauRegion("ақтау")).toBe(true);
    expect(vacancyMatchesAktauRegion("Almaty")).toBe(false);
  });
});

describe("filterPublicVacancies", () => {
  const vacancies = [
    { title: "Older Almaty", status: "published", city: "Almaty", source: "hh" },
    { title: "Aktau Native", status: "published", city: "Aktau", district: "12", source: "native" },
    { title: "Aktau HH", status: "published", city: "Актау", district: "7", source: "hh" },
    { title: "Draft Aktau", status: "draft", city: "Aktau", source: "native" },
  ] as const;

  test("applies visibility and region filters before limiting", () => {
    expect(
      filterPublicVacancies(vacancies, {
        region: "aktau",
        limit: 1,
      }).map((vacancy) => vacancy.title),
    ).toEqual(["Aktau Native"]);
  });

  test("shares city district and source filtering semantics", () => {
    expect(
      filterPublicVacancies(vacancies, {
        city: "Актау",
        source: "hh",
        district: "7",
        limit: 50,
      }).map((vacancy) => vacancy.title),
    ).toEqual(["Aktau HH"]);
  });
});

describe("vacancy application rules", () => {
  test("allows in-app applications only for published native vacancies", () => {
    expect(canApplyToVacancy("native", "published")).toBe(true);
    expect(canApplyToVacancy("native", "draft")).toBe(false);
    expect(canApplyToVacancy("native", "paused")).toBe(false);
    expect(canApplyToVacancy("hh", "published")).toBe(false);
  });

  test("requires owner for published native in-app applications", () => {
    expect(
      vacancyAcceptsInAppApplications({
        source: "native",
        status: "published",
        ownerUserId: "u_owner",
      }),
    ).toBe(true);
    expect(
      vacancyAcceptsInAppApplications({
        source: "native",
        status: "published",
        ownerUserId: undefined,
      }),
    ).toBe(false);
    expect(
      vacancyAcceptsInAppApplications({
        source: "hh",
        status: "published",
        ownerUserId: "u_owner",
      }),
    ).toBe(false);
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
