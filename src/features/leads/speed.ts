/* Speed to lead.
 *
 * A home-services lead that is not reached inside a few minutes is usually
 * already someone else's job. That makes the clock between "the form came in"
 * and "a human got hold of them" the single most valuable number in the sales
 * pipeline — and the only one nobody ever looks at.
 *
 * Everything here is derived from `leadResponse` + `job.createdAt` against the
 * frozen NOW. Nothing is hardcoded, so the scoreboard moves the moment a call
 * is logged. */
import type { DB, Job, LeadResponse } from "../../data/types";
import { NOW } from "../../data/clock";

/** The industry number the whole feature is arguing about. */
export const TARGET_MIN = 5;

export type Attempt = LeadResponse["attempts"][number];

export type LiveLead = {
  job: Job;
  response: LeadResponse | undefined;
  /** minutes since the lead came in — the clock that is running */
  waitMin: number;
  attempts: Attempt[];
};

const minsSince = (iso: string) => Math.max(0, (NOW.getTime() - new Date(iso).getTime()) / 6e4);

/** "4m" · "2h 14m" · "1d 16h" — a stopwatch reading, not a relative date. */
export function fmtWait(min: number) {
  const m = Math.floor(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** The same duration, said out loud. */
export function saidWait(min: number) {
  const m = Math.floor(min);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

export function responseOf(db: DB, jobId: string) {
  return db.leadResponse.find((r) => r.jobId === jobId);
}

/**
 * New leads nobody has actually reached. Ordered by how badly we are losing
 * them: never dialled at all first, then longest waiting.
 */
export function liveLeads(db: DB): LiveLead[] {
  return db.jobs
    .filter((j) => j.stage === "new_lead")
    .map((job) => {
      const response = responseOf(db, job.id);
      return { job, response, waitMin: minsSince(job.createdAt), attempts: response?.attempts ?? [] };
    })
    .filter((l) => !l.response?.firstTouchAt)
    .sort((a, b) => a.attempts.length - b.attempts.length || b.waitMin - a.waitMin);
}

/* ----------------------------- scoreboard ----------------------------- */

export type Sample = {
  job: Job;
  minutes: number;
  /** true while the clock is still running — this is a floor, not a result */
  waiting: boolean;
  outcome?: Attempt["outcome"];
};

export type Scoreboard = {
  samples: Sample[];
  medianMin: number | null;
  fast: Sample[];       // reached inside TARGET_MIN
  slow: Sample[];       // took, or is taking, over an hour
  /** records whose first touch predates the lead — we cannot measure those */
  unusable: number;
};

export function scoreboard(db: DB): Scoreboard {
  const samples: Sample[] = [];
  let unusable = 0;

  for (const r of db.leadResponse) {
    const job = db.jobs.find((j) => j.id === r.jobId);
    if (!job) continue;
    const created = new Date(job.createdAt).getTime();
    if (r.firstTouchAt) {
      const minutes = (new Date(r.firstTouchAt).getTime() - created) / 6e4;
      /* a first touch before the lead existed is a broken record, not a
         zero-second response — counting it would flatter the number */
      if (minutes < 0) { unusable++; continue; }
      samples.push({ job, minutes, waiting: false, outcome: r.attempts.at(-1)?.outcome });
    } else {
      samples.push({ job, minutes: minsSince(job.createdAt), waiting: true });
    }
  }

  samples.sort((a, b) => a.minutes - b.minutes);
  const mid = samples.length
    ? samples.length % 2
      ? samples[(samples.length - 1) / 2].minutes
      : (samples[samples.length / 2 - 1].minutes + samples[samples.length / 2].minutes) / 2
    : null;

  return {
    samples,
    medianMin: mid,
    fast: samples.filter((s) => !s.waiting && s.minutes <= TARGET_MIN),
    slow: samples.filter((s) => s.minutes > 60),
    unusable,
  };
}

export const OUTCOME_LABEL: Record<Attempt["outcome"], string> = {
  answered: "Answered",
  voicemail: "Voicemail",
  no_answer: "No answer",
  booked: "Booked",
};
