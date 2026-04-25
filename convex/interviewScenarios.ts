import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./lib/auth";
import {
  assertCanUpdateApplicationStatus,
  assertEmployerOrAdmin,
  assertSeekerOrAdmin,
  isAdmin,
} from "./lib/permissions";
import {
  interviewScenarioAnswerValidator,
  interviewScenarioDraftValidator,
  interviewScenarioEvaluationValidator,
} from "./lib/validators";

const MAX_CONTEXT_CHARS = 6000;
const MAX_TASKS = 8;
const MAX_TASK_CHARS = 2000;
const MAX_CONSTRAINTS = 10;
const MAX_CONSTRAINT_CHARS = 600;
const MAX_RUBRIC_ITEMS = 8;
const MAX_RUBRIC_FIELD_CHARS = 900;
const MAX_ANSWER_CHARS = 12000;
const MAX_LINKS_PER_ANSWER = 5;
const MAX_LINK_CHARS = 600;

type ScenarioDraft = {
  context: string;
  tasks: Array<{ prompt: string }>;
  constraints: string[];
  rubric: Array<{ criterion: string; description: string; maxScore: number }>;
};

function cleanText(value: string, max: number, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ConvexError(`${label} is required`);
  }
  return trimmed.slice(0, max);
}

function normalizeDraft(draft: ScenarioDraft): ScenarioDraft {
  const tasks = draft.tasks
    .slice(0, MAX_TASKS)
    .map((task) => ({ prompt: cleanText(task.prompt, MAX_TASK_CHARS, "Task") }));
  if (!tasks.length) {
    throw new ConvexError("At least one task is required");
  }

  const constraints = draft.constraints
    .slice(0, MAX_CONSTRAINTS)
    .map((constraint) => constraint.trim().slice(0, MAX_CONSTRAINT_CHARS))
    .filter(Boolean);

  const rubric = draft.rubric.slice(0, MAX_RUBRIC_ITEMS).map((criterion) => {
    const maxScore = Math.max(1, Math.min(100, Math.round(criterion.maxScore)));
    return {
      criterion: cleanText(criterion.criterion, MAX_RUBRIC_FIELD_CHARS, "Rubric criterion"),
      description: cleanText(criterion.description, MAX_RUBRIC_FIELD_CHARS, "Rubric description"),
      maxScore,
    };
  });
  if (!rubric.length) {
    throw new ConvexError("At least one rubric criterion is required");
  }

  return {
    context: cleanText(draft.context, MAX_CONTEXT_CHARS, "Context"),
    tasks,
    constraints,
    rubric,
  };
}

function normalizeAnswers(
  answers: Array<{ taskIndex: number; answer: string; links?: string[] }>,
  taskCount: number,
) {
  if (!answers.length) {
    throw new ConvexError("At least one answer is required");
  }
  return answers.map((answer) => {
    if (!Number.isInteger(answer.taskIndex) || answer.taskIndex < 0 || answer.taskIndex >= taskCount) {
      throw new ConvexError("Answer task index is invalid");
    }
    return {
      taskIndex: answer.taskIndex,
      answer: cleanText(answer.answer, MAX_ANSWER_CHARS, "Answer"),
      links: (answer.links ?? [])
        .slice(0, MAX_LINKS_PER_ANSWER)
        .map((link) => link.trim().slice(0, MAX_LINK_CHARS))
        .filter(Boolean),
    };
  });
}

async function getApplicationBundle(ctx: QueryCtx | MutationCtx, applicationId: Id<"applications">) {
  const application = await ctx.db.get(applicationId);
  if (!application) {
    throw new ConvexError("Application not found");
  }
  const vacancy = await ctx.db.get(application.vacancyId);
  if (!vacancy) {
    throw new ConvexError("Vacancy not found");
  }
  const employerUserId = vacancy.ownerUserId;
  if (!employerUserId) {
    throw new ConvexError("Vacancy has no employer owner");
  }
  return { application, vacancy, employerUserId };
}

async function getNonArchivedScenarioForApplication(
  ctx: QueryCtx | MutationCtx,
  applicationId: Id<"applications">,
) {
  const published = await ctx.db
    .query("interviewScenarios")
    .withIndex("by_applicationId_and_status", (q) =>
      q.eq("applicationId", applicationId).eq("status", "published"),
    )
    .unique();
  if (published) {
    return published;
  }
  return ctx.db
    .query("interviewScenarios")
    .withIndex("by_applicationId_and_status", (q) =>
      q.eq("applicationId", applicationId).eq("status", "draft"),
    )
    .unique();
}

async function listScenarioSubmissions(ctx: QueryCtx | MutationCtx, scenarioId: Id<"interviewScenarios">) {
  return ctx.db
    .query("interviewScenarioSubmissions")
    .withIndex("by_scenarioId_and_attemptNumber", (q) => q.eq("scenarioId", scenarioId))
    .order("desc")
    .take(20);
}

function assertScenarioEmployer(user: Doc<"users">, scenario: Doc<"interviewScenarios">) {
  assertEmployerOrAdmin(user);
  if (!isAdmin(user) && user._id !== scenario.employerUserId) {
    throw new ConvexError("Forbidden");
  }
}

function assertScenarioSeeker(user: Doc<"users">, scenario: Doc<"interviewScenarios">) {
  assertSeekerOrAdmin(user);
  if (!isAdmin(user) && user._id !== scenario.seekerUserId) {
    throw new ConvexError("Forbidden");
  }
}

export const getForApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const { application, vacancy } = await getApplicationBundle(ctx, args.applicationId);
    assertCanUpdateApplicationStatus(user, vacancy);
    const scenario = await getNonArchivedScenarioForApplication(ctx, args.applicationId);
    if (!scenario) {
      return null;
    }
    const submissions = await listScenarioSubmissions(ctx, scenario._id);
    return {
      scenario,
      application,
      vacancy,
      latestSubmission: submissions[0] ?? null,
      submissions,
    };
  },
});

export const getForSeekerApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertSeekerOrAdmin(user);
    const { application, vacancy } = await getApplicationBundle(ctx, args.applicationId);
    if (!isAdmin(user) && application.seekerUserId !== user._id) {
      throw new ConvexError("Forbidden");
    }
    const scenario = await ctx.db
      .query("interviewScenarios")
      .withIndex("by_applicationId_and_status", (q) =>
        q.eq("applicationId", args.applicationId).eq("status", "published"),
      )
      .unique();
    if (!scenario) {
      return null;
    }
    const submissions = await listScenarioSubmissions(ctx, scenario._id);
    return {
      scenario,
      application,
      vacancy,
      latestSubmission: submissions[0] ?? null,
      submissions,
    };
  },
});

export const saveDraft = mutation({
  args: {
    applicationId: v.id("applications"),
    draft: interviewScenarioDraftValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertEmployerOrAdmin(user);
    const { application, vacancy, employerUserId } = await getApplicationBundle(ctx, args.applicationId);
    assertCanUpdateApplicationStatus(user, vacancy);
    if (application.status !== "interview") {
      throw new ConvexError("Application must be in interview status");
    }
    const draft = normalizeDraft(args.draft);
    const existingPublished = await ctx.db
      .query("interviewScenarios")
      .withIndex("by_applicationId_and_status", (q) =>
        q.eq("applicationId", args.applicationId).eq("status", "published"),
      )
      .unique();
    if (existingPublished) {
      throw new ConvexError("Published scenario cannot be edited");
    }
    const existingDraft = await ctx.db
      .query("interviewScenarios")
      .withIndex("by_applicationId_and_status", (q) =>
        q.eq("applicationId", args.applicationId).eq("status", "draft"),
      )
      .unique();
    const now = Date.now();
    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, { ...draft, updatedAt: now });
      return ctx.db.get(existingDraft._id);
    }
    const scenarioId = await ctx.db.insert("interviewScenarios", {
      applicationId: args.applicationId,
      vacancyId: application.vacancyId,
      employerUserId,
      seekerUserId: application.seekerUserId,
      status: "draft",
      ...draft,
      createdAt: now,
      updatedAt: now,
    });
    return ctx.db.get(scenarioId);
  },
});

export const publish = mutation({
  args: { scenarioId: v.id("interviewScenarios") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) {
      throw new ConvexError("Scenario not found");
    }
    assertScenarioEmployer(user, scenario);
    if (scenario.status !== "draft") {
      throw new ConvexError("Only draft scenarios can be published");
    }
    const application = await ctx.db.get(scenario.applicationId);
    if (!application || application.status !== "interview") {
      throw new ConvexError("Application must be in interview status");
    }
    const now = Date.now();
    await ctx.db.patch(args.scenarioId, {
      status: "published",
      publishedAt: now,
      updatedAt: now,
    });
    return ctx.db.get(args.scenarioId);
  },
});

export const archive = mutation({
  args: { scenarioId: v.id("interviewScenarios") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) {
      throw new ConvexError("Scenario not found");
    }
    assertScenarioEmployer(user, scenario);
    const now = Date.now();
    await ctx.db.patch(args.scenarioId, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });
    return ctx.db.get(args.scenarioId);
  },
});

export const submit = mutation({
  args: {
    scenarioId: v.id("interviewScenarios"),
    answers: v.array(interviewScenarioAnswerValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario) {
      throw new ConvexError("Scenario not found");
    }
    assertScenarioSeeker(user, scenario);
    if (scenario.status !== "published") {
      throw new ConvexError("Scenario is not published");
    }
    const application = await ctx.db.get(scenario.applicationId);
    if (!application || application.status !== "interview") {
      throw new ConvexError("Application must be in interview status");
    }

    const previous = await listScenarioSubmissions(ctx, args.scenarioId);
    const attemptNumber = (previous[0]?.attemptNumber ?? 0) + 1;
    const now = Date.now();
    const submissionId = await ctx.db.insert("interviewScenarioSubmissions", {
      scenarioId: args.scenarioId,
      applicationId: scenario.applicationId,
      vacancyId: scenario.vacancyId,
      employerUserId: scenario.employerUserId,
      seekerUserId: scenario.seekerUserId,
      attemptNumber,
      status: "evaluating",
      answers: normalizeAnswers(args.answers, scenario.tasks.length),
      submittedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      (internal.ai as any).evaluateInterviewScenarioSubmissionInternal,
      {
        submissionId,
      },
    );
    return ctx.db.get(submissionId);
  },
});

export const getGenerationContextInternal = internalQuery({
  args: {
    applicationId: v.id("applications"),
    callerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.callerUserId);
    if (!user) {
      throw new ConvexError("User not found");
    }
    const { application, vacancy } = await getApplicationBundle(ctx, args.applicationId);
    assertCanUpdateApplicationStatus(user, vacancy);
    if (application.status !== "interview") {
      throw new ConvexError("Application must be in interview status");
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", application.seekerUserId))
      .unique();
    return { application, vacancy, profile };
  },
});

export const getEvaluationContextInternal = internalQuery({
  args: { submissionId: v.id("interviewScenarioSubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new ConvexError("Submission not found");
    }
    const scenario = await ctx.db.get(submission.scenarioId);
    if (!scenario) {
      throw new ConvexError("Scenario not found");
    }
    const application = await ctx.db.get(submission.applicationId);
    if (!application) {
      throw new ConvexError("Application not found");
    }
    const vacancy = await ctx.db.get(submission.vacancyId);
    if (!vacancy) {
      throw new ConvexError("Vacancy not found");
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", submission.seekerUserId))
      .unique();
    return { submission, scenario, application, vacancy, profile };
  },
});

export const saveEvaluationInternal = internalMutation({
  args: {
    submissionId: v.id("interviewScenarioSubmissions"),
    evaluation: interviewScenarioEvaluationValidator,
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new ConvexError("Submission not found");
    }
    await ctx.db.patch(args.submissionId, {
      status: "evaluated",
      evaluation: args.evaluation,
      evaluatedAt: Date.now(),
      evaluationError: undefined,
    });
    return ctx.db.get(args.submissionId);
  },
});

export const markEvaluationFailedInternal = internalMutation({
  args: {
    submissionId: v.id("interviewScenarioSubmissions"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new ConvexError("Submission not found");
    }
    await ctx.db.patch(args.submissionId, {
      status: "evaluation_failed",
      evaluationError: args.error.slice(0, 1000),
    });
    return ctx.db.get(args.submissionId);
  },
});
