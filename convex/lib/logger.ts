/**
 * Small structured logger for Convex functions. Emits one JSON line per call
 * so logs are easy to parse in the Convex dashboard.
 */
const LOG_PREFIX = "[convex]";

function formatError(e: string | Error | undefined): string | undefined {
  if (e === undefined) {
    return undefined;
  }
  return typeof e === "string" ? e : e.message;
}

/**
 * Base fields supported by success and error lines.
 * - `userId` is optional when the call is not tied to a user document yet
 * - `status` is a short machine-readable code (e.g. "ok", "validation_error")
 * - `message` is a human-readable summary
 */
export type ConvexLogFields = {
  functionName: string;
  userId?: string;
  status: string;
  message: string;
};

export function logSuccess(fields: ConvexLogFields): void {
  console.log(LOG_PREFIX, JSON.stringify({ level: "success", ...fields }));
}

export function logError(
  fields: ConvexLogFields & { error: string | Error },
): void {
  const { error, ...rest } = fields;
  const errText = formatError(error);
  console.error(
    LOG_PREFIX,
    JSON.stringify({ level: "error", ...rest, error: errText }),
  );
}
