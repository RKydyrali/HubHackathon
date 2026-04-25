import { ConvexError, v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertAdmin } from "./lib/permissions";
import {
  companyComplaintKindValidator,
  companyComplaintStatusValidator,
} from "./lib/validators";
import {
  buildCompanyTrustContract,
  externalVacancyTrust,
  getCompanyMetrics,
  noCompanyTrust,
  recalculateCompanyTrustMetrics,
} from "./lib/companyTrust";

export const getCompanyTrust = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const metrics = await getCompanyMetrics(ctx, args.companyId);
    return buildCompanyTrustContract(metrics);
  },
});

export const getVacancyTrust = query({
  args: { vacancyId: v.id("vacancies") },
  handler: async (ctx, args) => {
    const vacancy = await ctx.db.get(args.vacancyId);
    if (!vacancy) {
      return noCompanyTrust();
    }
    if (vacancy.source === "hh") {
      return externalVacancyTrust();
    }
    if (!vacancy.companyId) {
      return noCompanyTrust();
    }
    const metrics = await getCompanyMetrics(ctx, vacancy.companyId);
    return buildCompanyTrustContract(metrics);
  },
});

export const listVacancyTrust = query({
  args: { vacancyIds: v.array(v.id("vacancies")) },
  handler: async (ctx, args) => {
    const vacancyIds = args.vacancyIds.slice(0, 50);
    const rows = [];
    for (const vacancyId of vacancyIds) {
      const vacancy = await ctx.db.get(vacancyId);
      if (!vacancy) {
        rows.push({ vacancyId, trust: noCompanyTrust() });
      } else if (vacancy.source === "hh") {
        rows.push({ vacancyId, trust: externalVacancyTrust() });
      } else if (!vacancy.companyId) {
        rows.push({ vacancyId, trust: noCompanyTrust() });
      } else {
        const metrics = await getCompanyMetrics(ctx, vacancy.companyId);
        rows.push({ vacancyId, trust: buildCompanyTrustContract(metrics) });
      }
    }
    return rows;
  },
});

export const createComplaint = mutation({
  args: {
    companyId: v.id("companies"),
    vacancyId: v.optional(v.id("vacancies")),
    applicationId: v.optional(v.id("applications")),
    kind: companyComplaintKindValidator,
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new ConvexError("Company not found");
    }
    const details = args.details.trim();
    if (!details) {
      throw new ConvexError("Complaint details are empty");
    }
    const complaintId = await ctx.db.insert("companyComplaints", {
      companyId: args.companyId,
      authorUserId: user._id,
      vacancyId: args.vacancyId,
      applicationId: args.applicationId,
      kind: args.kind,
      details,
      status: "open",
      createdAt: Date.now(),
    });
    await recalculateCompanyTrustMetrics(ctx, args.companyId);
    return ctx.db.get(complaintId);
  },
});

export const updateComplaintStatus = mutation({
  args: {
    complaintId: v.id("companyComplaints"),
    status: companyComplaintStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    assertAdmin(user);
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new ConvexError("Complaint not found");
    }
    await ctx.db.patch(args.complaintId, { status: args.status });
    await recalculateCompanyTrustMetrics(ctx, complaint.companyId);
    return ctx.db.get(args.complaintId);
  },
});

export const recalculateForCompany = internalMutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    return recalculateCompanyTrustMetrics(ctx, args.companyId);
  },
});

export const backfillCompanyTrustScore = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    const companies = await ctx.db.query("companies").take(1000);
    let patched = 0;
    for (const company of companies) {
      if (patched >= limit) {
        break;
      }
      if (company.companyTrustScore === undefined) {
        await ctx.db.patch(company._id, { companyTrustScore: 0 });
        patched += 1;
      }
    }
    return { patched };
  },
});
