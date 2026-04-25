/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const scenarioDraft = {
  context: "A local cafe needs to reduce evening wait times without hiring another shift.",
  tasks: [
    { prompt: "Identify the two most likely bottlenecks and explain how you would verify them." },
    { prompt: "Propose a 7-day action plan with concrete operational changes." },
  ],
  constraints: ["Budget is limited to 40,000 KZT.", "No extra staff can be scheduled this week."],
  rubric: [
    {
      criterion: "Diagnosis",
      description: "Uses evidence to identify operational bottlenecks.",
      maxScore: 40,
    },
    {
      criterion: "Practicality",
      description: "Recommends steps that can be executed by the current team.",
      maxScore: 60,
    },
  ],
};

async function createInterviewApplication(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const employerUserId = await ctx.db.insert("users", {
      clerkId: "employer",
      role: "employer",
      isBotLinked: false,
    });
    const otherEmployerUserId = await ctx.db.insert("users", {
      clerkId: "other-employer",
      role: "employer",
      isBotLinked: false,
    });
    const seekerUserId = await ctx.db.insert("users", {
      clerkId: "seeker",
      role: "seeker",
      isBotLinked: false,
    });
    const vacancyId = await ctx.db.insert("vacancies", {
      ownerUserId: employerUserId,
      source: "native",
      sourceId: "scenario-vacancy",
      status: "published",
      title: "Cafe Manager",
      description: "Manage service quality, shift handoffs, and wait times.",
      city: "Aktau",
    });
    const applicationId = await ctx.db.insert("applications", {
      vacancyId,
      seekerUserId,
      status: "interview",
      screeningAnswers: [{ question: "Experience?", answer: "Two years managing evening shifts." }],
    });
    return { employerUserId, otherEmployerUserId, seekerUserId, vacancyId, applicationId };
  });
}

function asEmployer(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ subject: "employer", tokenIdentifier: "employer" });
}

function asOtherEmployer(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ subject: "other-employer", tokenIdentifier: "other-employer" });
}

function asSeeker(t: ReturnType<typeof convexTest>) {
  return t.withIdentity({ subject: "seeker", tokenIdentifier: "seeker" });
}

describe("interview scenarios", () => {
  test("employer saves and publishes a draft only for an owned interview application", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createInterviewApplication(t);

    await expect(
      asOtherEmployer(t).mutation(api.interviewScenarios.saveDraft, {
        applicationId: bundle.applicationId,
        draft: scenarioDraft,
      }),
    ).rejects.toThrow("Forbidden");

    const draft = await asEmployer(t).mutation(api.interviewScenarios.saveDraft, {
      applicationId: bundle.applicationId,
      draft: scenarioDraft,
    });
    expect(draft).toMatchObject({
      applicationId: bundle.applicationId,
      status: "draft",
      context: scenarioDraft.context,
    });

    const published = await asEmployer(t).mutation(api.interviewScenarios.publish, {
      scenarioId: draft!._id,
    });
    expect(published).toMatchObject({ status: "published", publishedAt: expect.any(Number) });
  });

  test("seeker cannot view a draft but can view a published scenario for their application", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createInterviewApplication(t);
    const draft = await asEmployer(t).mutation(api.interviewScenarios.saveDraft, {
      applicationId: bundle.applicationId,
      draft: scenarioDraft,
    });

    await expect(
      asSeeker(t).query(api.interviewScenarios.getForSeekerApplication, {
        applicationId: bundle.applicationId,
      }),
    ).resolves.toBeNull();

    await asEmployer(t).mutation(api.interviewScenarios.publish, { scenarioId: draft!._id });
    const seekerView = await asSeeker(t).query(api.interviewScenarios.getForSeekerApplication, {
      applicationId: bundle.applicationId,
    });

    expect(seekerView?.scenario).toMatchObject({
      _id: draft!._id,
      status: "published",
      tasks: scenarioDraft.tasks,
    });
  });

  test("candidate resubmission creates a new attempt without overwriting previous answers", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createInterviewApplication(t);
    const draft = await asEmployer(t).mutation(api.interviewScenarios.saveDraft, {
      applicationId: bundle.applicationId,
      draft: scenarioDraft,
    });
    await asEmployer(t).mutation(api.interviewScenarios.publish, { scenarioId: draft!._id });

    const first = await asSeeker(t).mutation(api.interviewScenarios.submit, {
      scenarioId: draft!._id,
      answers: [{ taskIndex: 0, answer: "First answer", links: [] }],
    });
    const second = await asSeeker(t).mutation(api.interviewScenarios.submit, {
      scenarioId: draft!._id,
      answers: [{ taskIndex: 0, answer: "Improved answer", links: ["https://example.com/plan"] }],
    });

    expect(first).toMatchObject({ attemptNumber: 1, status: "evaluating" });
    expect(second).toMatchObject({ attemptNumber: 2, status: "evaluating" });

    const employerView = await asEmployer(t).query(api.interviewScenarios.getForApplication, {
      applicationId: bundle.applicationId,
    });
    expect(
      employerView?.submissions.map((submission: { attemptNumber: number }) => submission.attemptNumber),
    ).toEqual([2, 1]);
    expect(employerView?.submissions[1]?.answers[0]?.answer).toBe("First answer");
  });

  test("evaluation save stores rubric scores and evidence on the matching submission", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createInterviewApplication(t);
    const draft = await asEmployer(t).mutation(api.interviewScenarios.saveDraft, {
      applicationId: bundle.applicationId,
      draft: scenarioDraft,
    });
    await asEmployer(t).mutation(api.interviewScenarios.publish, { scenarioId: draft!._id });
    const submission = await asSeeker(t).mutation(api.interviewScenarios.submit, {
      scenarioId: draft!._id,
      answers: [{ taskIndex: 0, answer: "I would measure order queue time and prep station idle time.", links: [] }],
    });

    await t.mutation(internal.interviewScenarios.saveEvaluationInternal, {
      submissionId: submission!._id,
      evaluation: {
        overallScore: 82,
        criterionScores: [
          {
            criterion: "Diagnosis",
            score: 34,
            maxScore: 40,
            evidence: "Mentions queue and prep station timing as observable signals.",
          },
        ],
        riskNotes: ["Needs more detail on staffing tradeoffs."],
        recommendation: "Strong enough for a follow-up conversation.",
      },
    });

    const employerView = await asEmployer(t).query(api.interviewScenarios.getForApplication, {
      applicationId: bundle.applicationId,
    });
    expect(employerView?.latestSubmission).toMatchObject({
      _id: submission!._id,
      status: "evaluated",
      evaluation: {
        overallScore: 82,
        criterionScores: [
          {
            criterion: "Diagnosis",
            score: 34,
            maxScore: 40,
            evidence: "Mentions queue and prep station timing as observable signals.",
          },
        ],
      },
    });
  });
});
