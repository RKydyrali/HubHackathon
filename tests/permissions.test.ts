import { describe, expect, test } from "vitest";

import type { Doc, Id } from "../convex/_generated/dataModel";
import {
  canAnalyzeScreeningApplication,
  canGenerateScreeningQuestionsForVacancy,
  canUsePublicAiAction,
  canViewVacanciesForAiDiscussion,
} from "../convex/lib/permissions";

function user(role: "seeker" | "employer" | "admin", id: string): Doc<"users"> {
  return { _id: id as Id<"users">, _creationTime: 1, clerkId: id, role, isBotLinked: false } as Doc<"users">;
}

function vacancy(input: Partial<Doc<"vacancies">>): Doc<"vacancies"> {
  return {
    _id: "vacancy_1" as Id<"vacancies">,
    _creationTime: 1,
    title: "Vacancy",
    description: "Description",
    city: "Aktau",
    status: "published",
    source: "native",
    ...input,
  } as Doc<"vacancies">;
}

function application(input: Partial<Doc<"applications">>): Doc<"applications"> {
  return {
    _id: "application_1" as Id<"applications">,
    _creationTime: 1,
    vacancyId: "vacancy_1" as Id<"vacancies">,
    seekerUserId: "seeker_1" as Id<"users">,
    status: "submitted",
    screeningAnswers: [],
    ...input,
  } as Doc<"applications">;
}

describe("AI public action authorization helpers", () => {
  const owner = user("employer", "owner_1");
  const otherEmployer = user("employer", "owner_2");
  const seeker = user("seeker", "seeker_1");
  const admin = user("admin", "admin_1");

  test("limits vacancy generation and screening question generation to employers and admins", () => {
    const ownedDraft = vacancy({ status: "draft", ownerUserId: owner._id });

    expect(canUsePublicAiAction(owner)).toBe(true);
    expect(canUsePublicAiAction(admin)).toBe(true);
    expect(canUsePublicAiAction(seeker)).toBe(false);
    expect(canGenerateScreeningQuestionsForVacancy(owner, ownedDraft)).toBe(true);
    expect(canGenerateScreeningQuestionsForVacancy(otherEmployer, ownedDraft)).toBe(false);
    expect(canGenerateScreeningQuestionsForVacancy(admin, ownedDraft)).toBe(true);
  });

  test("allows screening analysis only for participants and admins", () => {
    const ownedVacancy = vacancy({ ownerUserId: owner._id });
    const row = application({ seekerUserId: seeker._id, vacancyId: ownedVacancy._id });

    expect(canAnalyzeScreeningApplication(seeker, row, ownedVacancy)).toBe(true);
    expect(canAnalyzeScreeningApplication(owner, row, ownedVacancy)).toBe(true);
    expect(canAnalyzeScreeningApplication(admin, row, ownedVacancy)).toBe(true);
    expect(canAnalyzeScreeningApplication(otherEmployer, row, ownedVacancy)).toBe(false);
  });

  test("limits AI vacancy discussion to visible or owned vacancies", () => {
    const published = vacancy({ status: "published" });
    const ownerDraft = vacancy({ status: "draft", ownerUserId: owner._id });
    const otherDraft = vacancy({ status: "draft", ownerUserId: otherEmployer._id });

    expect(canViewVacanciesForAiDiscussion(seeker, [published])).toBe(true);
    expect(canViewVacanciesForAiDiscussion(owner, [published, ownerDraft])).toBe(true);
    expect(canViewVacanciesForAiDiscussion(owner, [otherDraft])).toBe(false);
    expect(canViewVacanciesForAiDiscussion(admin, [otherDraft])).toBe(true);
  });
});
