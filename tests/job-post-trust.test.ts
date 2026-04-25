import { describe, expect, test } from "vitest";

import {
  estimateJobPostTrust,
  type JobPostTrustResult,
} from "../convex/lib/jobPostTrust";

function expectStrictResult(result: JobPostTrustResult) {
  expect(Number.isInteger(result.score)).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
  expect([
    "often responds",
    "rarely responds",
    "low data",
    "external vacancy",
  ]).toContain(result.badgeText);
  expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  expect(result.reasons.length).toBeLessThanOrEqual(5);
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
}

describe("estimateJobPostTrust", () => {
  test("scores a complete post highly", () => {
    const result = estimateJobPostTrust({
      title: "Barista",
      description: [
        "Serve coffee drinks and keep the counter clean.",
        "Responsibilities include greeting guests, using the espresso machine, and closing the cash register.",
        "Requirements: six months of cafe experience and polite communication.",
        "Schedule: 2/2 shifts from 09:00 to 21:00.",
        "Apply by phone: +77000000000.",
      ].join("\n"),
      city: "Aktau",
      salaryMin: 180000,
      salaryMax: 240000,
      salaryCurrency: "KZT",
    });

    expectStrictResult(result);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.badgeText).toBe("often responds");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "Clear city is provided",
        "Salary range is provided",
      ]),
    );
  });

  test("uses external vacancy badge when an apply URL is present", () => {
    const result = estimateJobPostTrust({
      title: "Warehouse picker",
      description: "Pick and pack orders. Requirements: attention to detail. Schedule: night shifts.",
      city: "Aktau",
      salaryMin: 220000,
      externalApplyUrl: "https://example.com/apply",
    });

    expectStrictResult(result);
    expect(result.score).toBeGreaterThan(0);
    expect(result.badgeText).toBe("external vacancy");
  });

  test("scores a vague minimal post low", () => {
    const result = estimateJobPostTrust({
      title: "Work",
      description: "Need people. Good conditions.",
      city: "",
    });

    expectStrictResult(result);
    expect(result.score).toBeLessThan(40);
    expect(result.badgeText).toBe("low data");
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "Title is vague",
        "Description is very short",
        "City is missing",
      ]),
    );
  });

  test("penalizes upfront payment and sensitive document requests", () => {
    const result = estimateJobPostTrust({
      title: "Courier",
      description:
        "Pay a registration fee before the first shift. Send passport and IIN in chat to reserve the job.",
      city: "Aktau",
      salaryMin: 250000,
    });

    expectStrictResult(result);
    expect(result.score).toBeLessThan(40);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "Post asks for upfront payment",
        "Post asks for sensitive documents early",
      ]),
    );
  });

  test("penalizes unrealistic pay claims with little detail", () => {
    const result = estimateJobPostTrust({
      title: "Assistant",
      description: "Earn 5000000 KZT every week. Easy money, no experience needed.",
      city: "Aktau",
      salaryMin: 5000000,
      salaryCurrency: "KZT",
    });

    expectStrictResult(result);
    expect(result.score).toBeLessThan(50);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "Pay claim looks unrealistic for the detail provided",
        "Post uses easy-money wording",
      ]),
    );
  });
});
