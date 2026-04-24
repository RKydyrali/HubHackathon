import { ALLOWED_TRANSITIONS, type ApplicationStatus } from "@/lib/status";

export function useApplicationActions(status: ApplicationStatus) {
  return ALLOWED_TRANSITIONS[status];
}
