import { describe, expect, test, vi } from "vitest";

import {
  EMPTY_STATES,
  formatAbsoluteDate,
  formatRelativeTime,
  formatSalary,
  statusLabel,
} from "./format";

describe("format helpers", () => {
  test("formats salaries with space-separated KZT thousands", () => {
    expect(formatSalary({ salaryMin: 200000, salaryCurrency: "KZT" })).toBe(
      "от 200 000 KZT",
    );
    expect(formatSalary({ salaryMin: 200000, salaryMax: 350000 })).toBe(
      "200 000-350 000 KZT",
    );
    expect(formatSalary({}, "kk")).toBe("Жалақы келісім бойынша");
  });

  test("formats recent timestamps relatively and older timestamps absolutely", () => {
    vi.setSystemTime(new Date("2026-04-24T08:00:00.000Z"));

    expect(formatRelativeTime(new Date("2026-04-24T07:30:00.000Z").getTime())).toBe(
      "30 minutes ago",
    );
    expect(formatRelativeTime(new Date("2026-04-10T07:30:00.000Z").getTime())).toBe(
      formatAbsoluteDate(new Date("2026-04-10T07:30:00.000Z").getTime()),
    );

    vi.useRealTimers();
  });

  test("provides fixed empty states and status labels", () => {
    expect(EMPTY_STATES).toEqual({
      vacancies: "No matching vacancies yet",
      applications: "No applications yet",
      interviews: "No interviews scheduled",
      notifications: "No notifications yet",
      users: "No users found",
    });
    expect(statusLabel("reviewing")).toBe("Reviewing");
  });
});
