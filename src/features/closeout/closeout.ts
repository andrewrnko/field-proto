/* Closing out the day.
 *
 * Between a crew walking off site and the office finding out what happened,
 * three things reliably go missing: the hours, the photos, and the reason
 * tomorrow is about to stall. None of them are hard to capture — they are just
 * never captured at the one moment the crew still remembers. This is that
 * moment, modelled. */
import type { DB, MaterialOrder, TimeEntry } from "../../data/types";
import { hoursOf } from "../../data/types";
import { NOW } from "../../data/clock";

export type OpenShift = {
  jobId: string;
  entryIds: string[];
  /** true when the signed-in user is the one on the clock */
  mine: boolean;
  /** the earliest clock-in across the shift */
  since: string;
  hours: number;
};

/**
 * The shift this user is expected to close.
 *
 * Their own clock-in comes first. Failing that — the founders are usually the
 * ones doing this at 4pm, not the carpenter in the crawl space — it is the open
 * clock on a job they own.
 */
export function openShift(db: DB, personId?: string): OpenShift | null {
  /* a shift left open overnight is a correction, not a close-out; it is
     surfaced on the job record instead, where the real end time gets set */
  const open = db.time.filter((t) => t.endAt === null && hoursOf(t, NOW) <= 14);
  if (open.length === 0) return null;

  const who = personId ?? db.me;
  const mine = open.filter((t) => t.personId === who);
  const owned = open.filter((t) => db.jobs.find((j) => j.id === t.jobId)?.ownerId === who);
  const pool = mine.length ? mine : owned;
  if (pool.length === 0) return null;

  /* one job per close-out: the oldest clock-in decides which */
  const sorted = [...pool].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const jobId = sorted[0].jobId;
  const entries = open.filter((t) => t.jobId === jobId);

  return {
    jobId,
    entryIds: entries.map((t) => t.id),
    mine: mine.length > 0,
    since: sorted[0].startAt,
    hours: entries.reduce((s, t) => s + hoursOf(t, NOW), 0),
  };
}

/** "6h 10m" · "48m" — a shift length, not a relative date. */
export function dur(hours: number) {
  const m = Math.max(0, Math.round(hours * 60));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Decimal hours the way a timesheet says them. */
export function decimalHours(hours: number) {
  return `${(Math.round(hours * 10) / 10).toFixed(1)} h`;
}

export type EndPreset = { key: string; label: string; iso: string; disabled: boolean };

/**
 * Two taps to a defensible end time. Every option is clamped into
 * [clock-in, now] — a timesheet that can run backwards is worse than no
 * timesheet — and an option that clamps all the way back to the clock-in is
 * offered as disabled rather than as a time that would read as a real choice.
 */
export function endPresets(entry: TimeEntry): EndPreset[] {
  const start = new Date(entry.startAt).getTime();
  const now = NOW.getTime();
  const mk = (key: string, label: string, t: number): EndPreset => {
    const ms = Math.min(now, Math.max(start, t));
    return { key, label, iso: new Date(ms).toISOString(), disabled: ms <= start };
  };

  const half = new Date(NOW);
  half.setSeconds(0, 0);
  half.setMinutes(half.getMinutes() < 30 ? 0 : 30);

  return [
    mk("now", "Now", now),
    mk("15", "15 min ago", now - 15 * 6e4),
    mk("half", "Half hour", half.getTime()),
  ];
}

/** Material on this job that has not landed — what "waiting on material" means. */
export function pendingMaterials(db: DB, jobId: string): MaterialOrder[] {
  return db.materials
    .filter((m) => m.jobId === jobId && m.state !== "delivered")
    .sort((a, b) => a.neededBy.localeCompare(b.neededBy));
}
