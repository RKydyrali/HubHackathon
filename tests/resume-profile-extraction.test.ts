import { describe, expect, test } from "vitest";

import {
  fallbackExtractResumeProfileDraft,
  normalizeResumeProfileDraft,
} from "../convex/lib/resumeProfileExtraction";
import { buildResumeProfileExtractionPrompt } from "../convex/lib/prompts";

const resumeText = [
  "Алия Нурланова",
  "Актау, 12 мкр",
  "Работала администратором и консультантом. Умею вести CRM, Excel, продажи и общение с клиентами.",
  "Ищу стабильную работу рядом с домом, готова к сменному графику.",
].join("\n");

describe("resume profile extraction fallback", () => {
  test("normalizes partial AI output without losing the pasted resume text", () => {
    const draft = normalizeResumeProfileDraft(
      {
        fullName: "  Алия Нурланова  ",
        skills: ["CRM", "crm", "Excel", " "],
        bio: "  Администратор с опытом клиентского сервиса.  ",
      },
      resumeText,
    );

    expect(draft).toEqual({
      fullName: "Алия Нурланова",
      city: "Aktau",
      district: null,
      skills: ["CRM", "Excel"],
      bio: "Администратор с опытом клиентского сервиса.",
      resumeText,
    });
  });

  test("builds a conservative draft when AI extraction fails", () => {
    const draft = fallbackExtractResumeProfileDraft(resumeText);

    expect(draft.fullName).toBe("Алия Нурланова");
    expect(draft.city).toBe("Aktau");
    expect(draft.district).toBe("12 мкр");
    expect(draft.skills).toEqual(expect.arrayContaining(["CRM", "Excel", "продажи"]));
    expect(draft.resumeText).toBe(resumeText);
  });

  test("prompt tells the model to prepare a reviewable draft without inventing facts", () => {
    const prompt = buildResumeProfileExtractionPrompt(resumeText);

    expect(prompt).toContain("AI prepared a draft");
    expect(prompt).toContain("Do not invent");
    expect(prompt).toContain("resumeText");
    expect(prompt).toContain(resumeText);
  });
});
