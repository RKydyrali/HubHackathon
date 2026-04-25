/**
 * Centralized authorization predicates and assertions for public Convex handlers.
 * Frontend IA routes admins to `/admin/*` only, but the backend still allows
 * `role === "admin"` on shared employer- and seeker-shaped endpoints where
 * historically included (see per-helper docs below).
 */
import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import {
  isMutableVacancy,
  isVisibleVacancy,
  vacancyAcceptsInAppApplications,
} from "./domain";

export function isAdmin(user: Doc<"users">): boolean {
  return user.role === "admin";
}

export function assertAdmin(user: Doc<"users">): void {
  if (!isAdmin(user)) {
    throw new ConvexError("Forbidden");
  }
}

export function canActAsSeekerRole(user: Doc<"users">): boolean {
  return user.role === "seeker" || isAdmin(user);
}

export function assertSeekerOrAdmin(user: Doc<"users">): void {
  if (!canActAsSeekerRole(user)) {
    throw new ConvexError("Forbidden");
  }
}

export function assertCanWithdrawApplication(
  user: Doc<"users">,
  application: Doc<"applications">,
): void {
  assertSeekerOrAdmin(user);
  if (!isAdmin(user) && user._id !== application.seekerUserId) {
    throw new ConvexError("Forbidden");
  }
}

export function canActAsEmployerRole(user: Doc<"users">): boolean {
  return user.role === "employer" || isAdmin(user);
}

export function assertEmployerOrAdmin(user: Doc<"users">): void {
  if (!canActAsEmployerRole(user)) {
    throw new ConvexError("Forbidden");
  }
}

/** Seeker, employer, or admin — AI job assistant entry. */
export function canActAsAssistantUser(user: Doc<"users">): boolean {
  return (
    user.role === "seeker" || user.role === "employer" || isAdmin(user)
  );
}

export function assertSeekerEmployerOrAdmin(user: Doc<"users">): void {
  if (!canActAsAssistantUser(user)) {
    throw new ConvexError("Forbidden");
  }
}

export function canUsePublicAiAction(user: Doc<"users">): boolean {
  return canActAsEmployerRole(user) || isAdmin(user);
}

export function assertCanUsePublicAiAction(user: Doc<"users">): void {
  if (!canUsePublicAiAction(user)) {
    throw new ConvexError("Forbidden");
  }
}

export function canActAsVacancyOwnerOrAdmin(
  user: Doc<"users">,
  ownerUserId: Id<"users"> | undefined,
): boolean {
  if (isAdmin(user)) {
    return true;
  }
  if (!ownerUserId) {
    return false;
  }
  return user._id === ownerUserId;
}

export function assertCanActAsVacancyOwnerOrAdmin(
  user: Doc<"users">,
  ownerUserId: Id<"users"> | undefined,
): void {
  if (!canActAsVacancyOwnerOrAdmin(user, ownerUserId)) {
    throw new ConvexError("Forbidden");
  }
}

export function canViewVacancy(
  user: Doc<"users"> | null,
  vacancy: Doc<"vacancies">,
): boolean {
  if (isVisibleVacancy(vacancy.status)) {
    return true;
  }
  if (!user) {
    return false;
  }
  return canActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
}

export function assertCanViewVacancy(user: Doc<"users">, vacancy: Doc<"vacancies">): void {
  if (!canViewVacancy(user, vacancy)) {
    throw new ConvexError("Forbidden");
  }
}

export function assertCanCreateNativeVacancy(user: Doc<"users">): void {
  assertEmployerOrAdmin(user);
}

export function assertCanEditVacancy(user: Doc<"users">, vacancy: Doc<"vacancies">): void {
  assertEmployerOrAdmin(user);
  if (!isMutableVacancy(vacancy.source)) {
    throw new ConvexError("HH vacancies are read-only");
  }
  assertCanActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
}

export function canGenerateScreeningQuestionsForVacancy(
  user: Doc<"users">,
  vacancy: Doc<"vacancies">,
): boolean {
  return canActAsEmployerRole(user) && canActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
}

export function assertCanGenerateScreeningQuestionsForVacancy(
  user: Doc<"users">,
  vacancy: Doc<"vacancies">,
): void {
  if (!canGenerateScreeningQuestionsForVacancy(user, vacancy)) {
    throw new ConvexError("Forbidden");
  }
}

export function assertVacancyAcceptsInAppApplications(vacancy: Doc<"vacancies">): void {
  if (!vacancyAcceptsInAppApplications(vacancy)) {
    throw new ConvexError("This vacancy is not open for in-app applications");
  }
}

export function assertCanApplyToVacancy(
  user: Doc<"users">,
  vacancy: Doc<"vacancies">,
): void {
  assertSeekerOrAdmin(user);
  assertVacancyAcceptsInAppApplications(vacancy);
}

export function assertCanListApplicationsForVacancy(
  user: Doc<"users">,
  vacancy: Doc<"vacancies">,
): void {
  assertEmployerOrAdmin(user);
  assertCanActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
}

export function assertCanUpdateApplicationStatus(
  user: Doc<"users">,
  vacancy: Doc<"vacancies">,
): void {
  assertCanListApplicationsForVacancy(user, vacancy);
}

export function canAnalyzeScreeningApplication(
  user: Doc<"users">,
  application: Doc<"applications">,
  vacancy: Doc<"vacancies">,
): boolean {
  return isAdmin(user) || user._id === application.seekerUserId || user._id === vacancy.ownerUserId;
}

export function assertCanAnalyzeScreeningApplication(
  user: Doc<"users">,
  application: Doc<"applications">,
  vacancy: Doc<"vacancies">,
): void {
  if (!canAnalyzeScreeningApplication(user, application, vacancy)) {
    throw new ConvexError("Forbidden");
  }
}

export function canViewVacanciesForAiDiscussion(
  user: Doc<"users">,
  vacancies: Doc<"vacancies">[],
): boolean {
  return vacancies.every((vacancy) => canViewVacancy(user, vacancy));
}

export function assertCanViewVacanciesForAiDiscussion(
  user: Doc<"users">,
  vacancies: Doc<"vacancies">[],
): void {
  if (!canViewVacanciesForAiDiscussion(user, vacancies)) {
    throw new ConvexError("Forbidden");
  }
}

export function assertCanAdminRecoverApplicationStatus(user: Doc<"users">): void {
  assertAdmin(user);
}

export function assertCanScheduleInterviewForApplication(
  user: Doc<"users">,
  application: { status: string },
  vacancy: Doc<"vacancies">,
): void {
  assertEmployerOrAdmin(user);
  if (application.status !== "interview") {
    throw new ConvexError("Application must be in interview status");
  }
  assertCanActAsVacancyOwnerOrAdmin(user, vacancy.ownerUserId);
}

export function assertCanUpdateInterviewAsEmployer(
  user: Doc<"users">,
  interview: { employerUserId: Id<"users"> },
): void {
  assertEmployerOrAdmin(user);
  assertCanActAsVacancyOwnerOrAdmin(user, interview.employerUserId);
}

export function canViewInterviewsForApplication(
  user: Doc<"users">,
  application: { seekerUserId: Id<"users"> },
  vacancy: Doc<"vacancies">,
): boolean {
  return (
    isAdmin(user) ||
    user._id === application.seekerUserId ||
    user._id === vacancy.ownerUserId
  );
}

export function assertCanViewInterviewsForApplication(
  user: Doc<"users">,
  application: { seekerUserId: Id<"users"> },
  vacancy: Doc<"vacancies">,
): void {
  if (!canViewInterviewsForApplication(user, application, vacancy)) {
    throw new ConvexError("Forbidden");
  }
}

export function canAccessAiJobChat(
  user: Doc<"users">,
  chat: { userId?: Id<"users"> | undefined },
): boolean {
  if (isAdmin(user)) {
    return true;
  }
  if (!chat.userId || chat.userId !== user._id) {
    return false;
  }
  return true;
}

export function assertCanAccessAiJobChat(
  user: Doc<"users">,
  chat: { userId?: Id<"users"> | undefined },
): void {
  if (!canAccessAiJobChat(user, chat)) {
    throw new ConvexError("Forbidden");
  }
}

export function canRunNativeVacancySeekerMatching(
  user: Doc<"users">,
  vacancy: { source: "native" | "hh"; ownerUserId: Id<"users"> | undefined },
): boolean {
  if (vacancy.source !== "native") {
    return false;
  }
  if (isAdmin(user)) {
    return true;
  }
  return vacancy.ownerUserId === user._id;
}

export function assertCanRunNativeVacancySeekerMatching(
  user: Doc<"users">,
  vacancy: { source: "native" | "hh"; ownerUserId: Id<"users"> | undefined },
): void {
  if (!canRunNativeVacancySeekerMatching(user, vacancy)) {
    throw new ConvexError("Forbidden");
  }
}

export function canSubmitReview(input: {
  author: Doc<"users">;
  application: { seekerUserId: Id<"users"> };
  vacancy: { ownerUserId?: Id<"users"> | undefined };
  targetUserId: Id<"users">;
}): boolean {
  const { author, application, vacancy, targetUserId } = input;
  const isAllowedReviewer =
    author._id === application.seekerUserId || author._id === vacancy.ownerUserId;
  const targetIsCounterparty =
    targetUserId === application.seekerUserId || targetUserId === vacancy.ownerUserId;
  if (!isAllowedReviewer || !targetIsCounterparty || targetUserId === author._id) {
    return false;
  }
  return true;
}

export function assertCanSubmitReview(input: {
  author: Doc<"users">;
  application: { seekerUserId: Id<"users"> };
  vacancy: { ownerUserId?: Id<"users"> | undefined };
  targetUserId: Id<"users">;
}): void {
  if (!canSubmitReview(input)) {
    throw new ConvexError("Forbidden");
  }
}

export function canReadReviewsAboutUser(
  viewer: Doc<"users">,
  targetUserId: Id<"users">,
): boolean {
  return isAdmin(viewer) || viewer._id === targetUserId;
}

export function assertCanReadReviewsAboutUser(
  viewer: Doc<"users">,
  targetUserId: Id<"users">,
): void {
  if (!canReadReviewsAboutUser(viewer, targetUserId)) {
    throw new ConvexError("Forbidden");
  }
}

export function assertNotificationRecipient(
  user: Doc<"users">,
  notification: { userId: Id<"users"> },
): void {
  if (notification.userId !== user._id) {
    throw new ConvexError("Notification not found");
  }
}
