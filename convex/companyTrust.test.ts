/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function createCompanyBundle(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const employerUserId = await ctx.db.insert("users", {
      clerkId: "employer",
      role: "employer",
      isBotLinked: false,
    });
    const seekerUserIds: Id<"users">[] = [];
    for (let i = 0; i < 8; i++) {
      seekerUserIds.push(
        await ctx.db.insert("users", {
          clerkId: `seeker-${i}`,
          role: "seeker",
          isBotLinked: false,
        }),
      );
    }
    const companyId = await ctx.db.insert("companies", {
      slug: "trust-co",
      name: "Trust Co",
      description: "Local employer",
      industry: "Services",
      companyType: "LLP",
      address: "Aktau",
      city: "Aktau",
      logoUrl: "https://example.com/logo.png",
      phone: "+77000000000",
      email: "hr@example.com",
      ownerUserId: employerUserId,
    });
    const vacancyId = await ctx.db.insert("vacancies", {
      ownerUserId: employerUserId,
      companyId,
      source: "native",
      sourceId: "native-trust",
      status: "published",
      title: "Cook",
      description: "Kitchen role",
      city: "Aktau",
    });
    return { employerUserId, seekerUserIds, companyId, vacancyId };
  });
}

async function createApplicationWithTimeline(
  t: ReturnType<typeof convexTest>,
  input: {
    vacancyId: Id<"vacancies">;
    seekerUserId: Id<"users">;
    employerUserId: Id<"users">;
    submittedAt: number;
    responseDelayMs?: number;
    finalStatus?: "reviewing" | "hired" | "submitted";
  },
) {
  return t.run(async (ctx) => {
    const finalStatus = input.finalStatus ?? (input.responseDelayMs === undefined ? "submitted" : "reviewing");
    const applicationId = await ctx.db.insert("applications", {
      vacancyId: input.vacancyId,
      seekerUserId: input.seekerUserId,
      status: finalStatus,
    });
    await ctx.db.insert("applicationStatusEvents", {
      applicationId,
      toStatus: "submitted",
      changedAt: input.submittedAt,
      actorUserId: input.seekerUserId,
    });
    if (input.responseDelayMs !== undefined) {
      await ctx.db.insert("applicationStatusEvents", {
        applicationId,
        fromStatus: "submitted",
        toStatus: finalStatus === "hired" ? "hired" : "reviewing",
        changedAt: input.submittedAt + input.responseDelayMs,
        actorUserId: input.employerUserId,
      });
    }
    return applicationId;
  });
}

describe("company trust", () => {
  test("does not score HH vacancies", async () => {
    const t = convexTest(schema, modules);
    const vacancyId = await t.run(async (ctx) =>
      ctx.db.insert("vacancies", {
        source: "hh",
        sourceId: "hh-1",
        status: "published",
        title: "External role",
        description: "HH vacancy",
        city: "Aktau",
      }),
    );

    const trust = await t.query(api.companyTrust.getVacancyTrust, { vacancyId });

    expect(trust).toMatchObject({
      score: null,
      badgeText: "внешняя вакансия",
      tone: "muted",
      dataSufficiency: "external",
    });
  });

  test("shows low data before five applications", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createCompanyBundle(t);
    await createApplicationWithTimeline(t, {
      vacancyId: bundle.vacancyId,
      seekerUserId: bundle.seekerUserIds[0]!,
      employerUserId: bundle.employerUserId,
      submittedAt: 1_000,
      responseDelayMs: 60 * 60 * 1000,
    });
    await t.mutation(internal.companyTrust.recalculateForCompany, {
      companyId: bundle.companyId,
    });

    const trust = await t.query(api.companyTrust.getCompanyTrust, { companyId: bundle.companyId });

    expect(trust).toMatchObject({
      score: null,
      badgeText: "мало данных",
      tone: "muted",
      dataSufficiency: "low",
    });
  });

  test("scores responsive employers as frequent responders", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createCompanyBundle(t);
    for (let i = 0; i < 5; i++) {
      await createApplicationWithTimeline(t, {
        vacancyId: bundle.vacancyId,
        seekerUserId: bundle.seekerUserIds[i]!,
        employerUserId: bundle.employerUserId,
        submittedAt: 10_000 + i * 1_000,
        responseDelayMs: 2 * 60 * 60 * 1000,
        finalStatus: i === 0 ? "hired" : "reviewing",
      });
    }
    await t.mutation(internal.companyTrust.recalculateForCompany, {
      companyId: bundle.companyId,
    });

    const trust = await t.query(api.companyTrust.getCompanyTrust, { companyId: bundle.companyId });

    expect(trust.badgeText).toBe("часто отвечает");
    expect(trust.dataSufficiency).toBe("sufficient");
    expect(trust.responseRate).toBe(1);
    expect(trust.hiresCount).toBe(1);
    expect(trust.score).toBeGreaterThanOrEqual(70);
  });

  test("scores slow or missing responses as rare responders", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createCompanyBundle(t);
    for (let i = 0; i < 5; i++) {
      await createApplicationWithTimeline(t, {
        vacancyId: bundle.vacancyId,
        seekerUserId: bundle.seekerUserIds[i]!,
        employerUserId: bundle.employerUserId,
        submittedAt: 10_000 + i * 1_000,
        responseDelayMs: i < 2 ? 8 * 24 * 60 * 60 * 1000 : undefined,
      });
    }
    await t.mutation(internal.companyTrust.recalculateForCompany, {
      companyId: bundle.companyId,
    });

    const trust = await t.query(api.companyTrust.getCompanyTrust, { companyId: bundle.companyId });

    expect(trust.badgeText).toBe("редко отвечает");
    expect(trust.score).toBeLessThan(70);
  });

  test("valid complaints reduce score while rejected complaints do not", async () => {
    const t = convexTest(schema, modules);
    const bundle = await createCompanyBundle(t);
    const applicationIds: Id<"applications">[] = [];
    for (let i = 0; i < 6; i++) {
      applicationIds.push(
        await createApplicationWithTimeline(t, {
          vacancyId: bundle.vacancyId,
          seekerUserId: bundle.seekerUserIds[i]!,
          employerUserId: bundle.employerUserId,
          submittedAt: 10_000 + i * 1_000,
          responseDelayMs: 2 * 60 * 60 * 1000,
          finalStatus: i === 0 ? "hired" : "reviewing",
        }),
      );
    }
    await t.run(async (ctx) => {
      await ctx.db.insert("companyComplaints", {
        companyId: bundle.companyId,
        authorUserId: bundle.seekerUserIds[0]!,
        vacancyId: bundle.vacancyId,
        applicationId: applicationIds[0],
        kind: "no_response",
        details: "No reply after interview",
        status: "valid",
        createdAt: 20_000,
      });
      await ctx.db.insert("companyComplaints", {
        companyId: bundle.companyId,
        authorUserId: bundle.seekerUserIds[1]!,
        vacancyId: bundle.vacancyId,
        applicationId: applicationIds[1],
        kind: "other",
        details: "Rejected by moderation",
        status: "rejected",
        createdAt: 21_000,
      });
    });
    await t.mutation(internal.companyTrust.recalculateForCompany, {
      companyId: bundle.companyId,
    });

    const trust = await t.query(api.companyTrust.getCompanyTrust, { companyId: bundle.companyId });

    expect(trust.complaintsCount).toBe(1);
    expect(trust.score).toBeLessThan(100);
  });
});
