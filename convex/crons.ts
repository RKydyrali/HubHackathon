import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("sync hh vacancies", { minutes: 30 }, internal.hhSync.syncHHVacancies);

export default crons;
