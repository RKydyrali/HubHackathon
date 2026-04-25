import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type DemoAnalyticsKind = Doc<"demoAnalyticsEvents">["kind"];

export async function recordDemoAnalyticsEvent(
  ctx: MutationCtx,
  args: {
    kind: DemoAnalyticsKind;
    vacancyId?: Id<"vacancies">;
    userId?: Id<"users">;
    surface?: string;
    metadata?: Record<string, string>;
  },
): Promise<void> {
  await ctx.db.insert("demoAnalyticsEvents", {
    kind: args.kind,
    vacancyId: args.vacancyId,
    userId: args.userId,
    surface: args.surface,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}
