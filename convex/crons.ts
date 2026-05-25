import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** 09:00 UTC ≈ 12:00 Minsk — after NBRB publishes daily rates. */
crons.cron(
  "sync nbrb exchange rates",
  "0 9 * * *",
  internal.exchangeRatesSync.syncTodayInternal,
  {},
);

export default crons;
