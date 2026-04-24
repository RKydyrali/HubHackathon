export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "interview"
  | "rejected"
  | "hired";

export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ["reviewing"],
  reviewing: ["interview", "rejected"],
  interview: ["hired", "rejected"],
  rejected: [],
  hired: [],
};

export function getAllowedApplicationActions(status: ApplicationStatus) {
  return ALLOWED_TRANSITIONS[status];
}

export function canMoveApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
