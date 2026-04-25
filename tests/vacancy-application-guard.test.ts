import { describe, expect, test } from "vitest";

import type { Doc, Id } from "../convex/_generated/dataModel";
import { assertVacancyAcceptsInAppApplications } from "../convex/lib/permissions";

function vacancy(
  partial: Pick<Doc<"vacancies">, "source" | "status"> &
    Partial<Pick<Doc<"vacancies">, "ownerUserId">>,
): Doc<"vacancies"> {
  return {
    _id: "v1" as Id<"vacancies">,
    _creationTime: 0,
    sourceId: "",
    title: "",
    description: "",
    city: "",
    ...partial,
  } as Doc<"vacancies">;
}

describe("assertVacancyAcceptsInAppApplications", () => {
  test("throws for native published without owner", () => {
    expect(() =>
      assertVacancyAcceptsInAppApplications(
        vacancy({ source: "native", status: "published", ownerUserId: undefined }),
      ),
    ).toThrow("This vacancy is not open for in-app applications");
  });

  test("allows native published with owner", () => {
    expect(() =>
      assertVacancyAcceptsInAppApplications(
        vacancy({
          source: "native",
          status: "published",
          ownerUserId: "u1" as Id<"users">,
        }),
      ),
    ).not.toThrow();
  });
});
