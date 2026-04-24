import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { UserRole } from "./constants";

type DbCtx = GenericQueryCtx<any> | GenericMutationCtx<any>;
type ClerkIdentity = { subject: string; tokenIdentifier?: string };

export async function requireClerkIdentity(ctx: {
  auth: { getUserIdentity: () => Promise<ClerkIdentity | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  return identity;
}

export function clerkIdentityKey(identity: ClerkIdentity): string {
  return identity.tokenIdentifier ?? identity.subject;
}

export async function getUserByClerkId(
  ctx: DbCtx,
  clerkId: string,
): Promise<Doc<"users"> | null> {
  return ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

export async function getUserByIdentity(
  ctx: DbCtx,
  identity: ClerkIdentity,
): Promise<Doc<"users"> | null> {
  const preferred = await getUserByClerkId(ctx, clerkIdentityKey(identity));
  if (preferred || !identity.tokenIdentifier || identity.tokenIdentifier === identity.subject) {
    return preferred;
  }
  return getUserByClerkId(ctx, identity.subject);
}

export async function requireCurrentUser(
  ctx: DbCtx & { auth: { getUserIdentity: () => Promise<ClerkIdentity | null> } },
): Promise<Doc<"users">> {
  const identity = await requireClerkIdentity(ctx);
  const user = await getUserByIdentity(ctx, identity);
  if (!user) {
    throw new ConvexError("User is not initialized");
  }
  return user;
}

export function assertRole(
  user: Doc<"users">,
  allowed: UserRole[],
): void {
  if (!user.role || !allowed.includes(user.role)) {
    throw new ConvexError("Forbidden");
  }
}

export function assertOwnershipOrAdmin(
  user: Doc<"users">,
  ownerUserId: Id<"users"> | undefined,
): void {
  if (user.role === "admin") {
    return;
  }
  if (!ownerUserId || user._id !== ownerUserId) {
    throw new ConvexError("Forbidden");
  }
}
