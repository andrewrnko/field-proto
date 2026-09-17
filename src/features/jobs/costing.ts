/* Job costing.
 *
 * The estimate says what the job should cost. Labour clocked on site says what
 * it is costing. The gap between them, while the job is still open, is the only
 * number that lets a founder do anything about it — which is why it lives on
 * the record and not in a month-end report. */
import type { DB, Job, TimeEntry } from "../../data/types";
import { LABOR_RATE_CENTS, estimateTotals, hoursOf } from "../../data/types";
import { NOW } from "../../data/clock";

/** A shift left open overnight is a data error, not 18 hours of labour. */
export const STALE_HOURS = 14;

export type JobCost = {
  hours: number;
  laborCents: number;
  materialCents: number;
  spentCents: number;
  /** what the estimate set aside for labour + materials */
  budgetCents: number;
  estimatedHours: number;
  /** >1 means the job is over what was priced */
  burn: number;
  marginNow: number;
  marginPriced: number;
  onSiteNow: Array<{ entry: TimeEntry; personId: string; since: string }>;
  /** open entries that ran past a plausible shift — excluded from the hours
   *  above so they cannot silently inflate the job's cost */
  unclosed: TimeEntry[];
};

export function jobCost(db: DB, job: Job): JobCost {
  const entries = db.time.filter((t) => t.jobId === job.id);
  const unclosed = entries.filter((t) => t.endAt === null && hoursOf(t, NOW) > STALE_HOURS);
  const counted = entries.filter((t) => !unclosed.includes(t));
  const hours = counted.reduce((s, t) => s + hoursOf(t, NOW), 0);
  const laborCents = Math.round(hours * LABOR_RATE_CENTS);
  const materialCents = db.materials
    .filter((m) => m.jobId === job.id && m.state !== "needed")
    .reduce((s, m) => s + m.costCents, 0);

  const est = db.estimates.filter((e) => e.jobId === job.id).at(-1);
  const t = est ? estimateTotals(est) : null;
  const budgetCents = t?.cost ?? 0;
  /* the estimate prices labour in hours on the hr lines; everything else is material */
  const estimatedHours = est
    ? est.items.filter((i) => i.unit === "hr").reduce((s, i) => s + i.qty, 0)
    : 0;

  const spentCents = laborCents + materialCents;
  const value = job.valueCents;

  return {
    hours,
    laborCents,
    materialCents,
    spentCents,
    budgetCents,
    estimatedHours,
    burn: budgetCents > 0 ? spentCents / budgetCents : 0,
    marginNow: value > 0 ? (value - spentCents) / value : 0,
    marginPriced: t && value > 0 ? (value - t.cost) / value : 0,
    onSiteNow: counted
      .filter((t2) => t2.endAt === null)
      .map((t2) => ({ entry: t2, personId: t2.personId, since: t2.startAt })),
    unclosed,
  };
}

/** Hours by person, for the labour sheet. */
export function hoursByPerson(db: DB, jobId: string) {
  const map = new Map<string, { hours: number; open: boolean }>();
  for (const t of db.time.filter((x) => x.jobId === jobId && !(x.endAt === null && hoursOf(x, NOW) > STALE_HOURS))) {
    const cur = map.get(t.personId) ?? { hours: 0, open: false };
    cur.hours += hoursOf(t, NOW);
    cur.open = cur.open || t.endAt === null;
    map.set(t.personId, cur);
  }
  return [...map.entries()].map(([personId, v]) => ({ personId, ...v }))
    .sort((a, b) => b.hours - a.hours);
}

/** Hours by task — where a day actually went. */
export function hoursByTask(db: DB, jobId: string) {
  const map = new Map<TimeEntry["task"], number>();
  for (const t of db.time.filter((x) => x.jobId === jobId && !(x.endAt === null && hoursOf(x, NOW) > STALE_HOURS))) {
    map.set(t.task, (map.get(t.task) ?? 0) + hoursOf(t, NOW));
  }
  return [...map.entries()].map(([task, hours]) => ({ task, hours }))
    .sort((a, b) => b.hours - a.hours);
}

/** Anything that will stop a crew: material not on site by the day it is needed. */
export function blockingMaterials(db: DB, jobId?: string) {
  return db.materials
    .filter((m) => (jobId ? m.jobId === jobId : true))
    .filter((m) => m.state !== "delivered")
    .filter((m) => new Date(m.neededBy) <= new Date(NOW.getTime() + 2 * 864e5))
    .sort((a, b) => a.neededBy.localeCompare(b.neededBy));
}

/** Callbacks that are due, soonest first. */
export function dueCallbacks(db: DB, withinDays = 14) {
  const limit = new Date(NOW.getTime() + withinDays * 864e5);
  return db.callbacks
    .filter((c) => !c.doneAt && new Date(c.dueAt) <= limit)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
