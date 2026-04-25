export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offer_sent"
  | "rejected"
  | "hired"
  | "withdrawn";

export type ApplicationActionRole = "seeker" | "employer" | "admin";

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["reviewing", "withdrawn"],
  reviewing: ["shortlisted", "interview", "rejected", "withdrawn"],
  shortlisted: ["interview", "rejected", "withdrawn"],
  interview: ["offer_sent", "hired", "rejected"],
  offer_sent: ["hired", "rejected"],
  rejected: [],
  hired: [],
  withdrawn: [],
};

export const EMPLOYER_APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["reviewing"],
  reviewing: ["shortlisted", "interview", "rejected"],
  shortlisted: ["interview", "rejected"],
  interview: ["offer_sent", "hired", "rejected"],
  offer_sent: ["hired", "rejected"],
  rejected: [],
  hired: [],
  withdrawn: [],
};

export const SEEKER_WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "shortlisted",
];

/** Backward-compatible employer action table used by review surfaces. */
export const ALLOWED_TRANSITIONS = EMPLOYER_APPLICATION_TRANSITIONS;

export function getAllowedApplicationActions(status: ApplicationStatus) {
  return ALLOWED_TRANSITIONS[status];
}

export function canWithdrawApplicationStatus(status: ApplicationStatus) {
  return SEEKER_WITHDRAWABLE_STATUSES.includes(status);
}

export function getAllowedApplicationActionsForRole(
  role: ApplicationActionRole,
  status: ApplicationStatus,
) {
  if (role === "seeker") {
    return canWithdrawApplicationStatus(status) ? (["withdrawn"] satisfies ApplicationStatus[]) : [];
  }
  if (role === "admin") {
    return APPLICATION_TRANSITIONS[status];
  }
  return EMPLOYER_APPLICATION_TRANSITIONS[status];
}

export function canMoveApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
) {
  return APPLICATION_TRANSITIONS[from].includes(to);
}
