import { describe, expect, it } from "vitest";

import { buildCreateNativePayload, NATIVE_CITY_DEFAULT, NATIVE_CURRENCY_DEFAULT, parseQuestions, vacancySchema } from "./vacancyFormModel";

describe("vacancyFormModel", () => {
  it("buildCreateNativePayload maps fields and defaults", () => {
    const p = buildCreateNativePayload({
      title: "Admin",
      description: "x".repeat(20),
      district: "12 мкр",
      salaryMin: 200_000,
      salaryMax: 300_000,
    });
    expect(p).toEqual({
      title: "Admin",
      description: "xxxxxxxxxxxxxxxxxxxx",
      city: NATIVE_CITY_DEFAULT,
      district: "12 мкр",
      salaryMin: 200_000,
      salaryMax: 300_000,
      salaryCurrency: NATIVE_CURRENCY_DEFAULT,
    });
  });

  it("buildCreateNativePayload omits empty district and salary", () => {
    const p = buildCreateNativePayload({
      title: "A",
      description: "y".repeat(10),
    });
    expect(p.district).toBeUndefined();
    expect(p.salaryMin).toBeUndefined();
    expect(p.salaryMax).toBeUndefined();
  });

  it("parseQuestions strips blank lines", () => {
    expect(parseQuestions(" a \n b \n")).toEqual(["a", "b"]);
  });

  it("vacancySchema validates", () => {
    const r = vacancySchema.safeParse({
      title: "Ok",
      description: "1234567890a",
    });
    expect(r.success).toBe(true);
  });
});
