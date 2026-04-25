import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("sync hh vacancies", { minutes: 30 }, internal.hhSync.syncHHVacancies);

crons.interval(
  "purge stale notifications",
  { hours: 24 },
  internal.dataLifecycle.purgeStaleNotifications,
  {},
);

crons.interval(
  "purge idle ai job chats",
  { hours: 24 },
  internal.dataLifecycle.purgeOldAiJobChats,
  {},
);

export default crons;
