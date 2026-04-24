import { describe, expect, test } from "vitest";

import { buildStructuredCoach } from "../convex/lib/coach";

describe("structured coach", () => {
  test("returns diagnosis, action cards, checklist, and next step from live domain inputs", () => {
    const coach = buildStructuredCoach({
      profile: {
        fullName: "Aigerim",
        city: "Aktau",
        district: "12 mikrorayon",
        skills: ["Sales", "Kazakh"],
        resumeText: "",
      },
      applications: [
        {
          application: { status: "submitted" },
          vacancy: { title: "Sales assistant", source: "native" },
        },
      ],
      matches: [
        {
          vacancy: { title: "Customer support", source: "native" },
          matchScore: 88,
        },
      ],
    });

    expect(coach.diagnosis.summary).toContain("Aigerim");
    expect(coach.actionCards.length).toBeGreaterThanOrEqual(3);
    expect(coach.checklist.length).toBeGreaterThanOrEqual(4);
    expect(coach.nextStep.href).toMatch(/^\/app\/seeker\//);
  });

  test("prioritizes profile setup when a seeker has no profile", () => {
    const coach = buildStructuredCoach({
      profile: null,
      applications: [],
      matches: [],
    });

    expect(coach.diagnosis.level).toBe("setup");
    expect(coach.nextStep.href).toBe("/app/seeker/profile");
  });
});
