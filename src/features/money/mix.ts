/* What is actually worth selling.
 *
 * A rot business quietly runs four businesses — crawl spaces, decks, siding and
 * water damage — and they do not earn the same. This is the only view that
 * answers "what should we push", and it is computed from the estimates and the
 * hours actually clocked, not from a feeling about which jobs are fun. */
import type { DB, WorkType } from "../../data/types";
import { LEAD_STAGES, estimateTotals, hoursOf } from "../../data/types";
import { NOW } from "../../data/clock";

export type MixRow = {
  type: WorkType;
  won: number;
  openLeads: number;
  lost: number;
  valueCents: number;
  avgValueCents: number;
  /** margin the estimates priced */
  pricedMargin: number;
  /** hours clocked against hours priced, on the jobs that have both. Over 1
   *  means this kind of work eats more labour than it is sold with. */
  hourBurn: number | null;
  /** how long these take to get a yes, in days */
  avgDecisionDays: number | null;
  winRate: number | null;
};

export function salesMix(db: DB): MixRow[] {
  const types: WorkType[] = ["crawl", "deck", "siding", "water"];

  return types.map((type) => {
    const jobs = db.jobs.filter((j) => j.workType === type);
    const won = jobs.filter((j) => !LEAD_STAGES.includes(j.stage) && j.stage !== "lost");
    const lost = jobs.filter((j) => j.stage === "lost");
    const openLeads = jobs.filter((j) => LEAD_STAGES.includes(j.stage));

    const valueCents = won.reduce((s, j) => s + j.valueCents, 0);

    let priced = 0, pricedCost = 0;
    let clockedHours = 0, pricedHours = 0;
    const decisionDays: number[] = [];

    for (const j of jobs) {
      const est = db.estimates.filter((e) => e.jobId === j.id).at(-1);
      if (est) {
        const t = estimateTotals(est);
        if (won.includes(j)) { priced += t.subtotal; pricedCost += t.cost; }
        if (est.sentAt && est.decidedAt) {
          decisionDays.push((new Date(est.decidedAt).getTime() - new Date(est.sentAt).getTime()) / 864e5);
        }
      }
      const hours = db.time.filter((t2) => t2.jobId === j.id).reduce((s, t2) => s + hoursOf(t2, NOW), 0);
      const priceHrs = est ? est.items.filter((i) => i.unit === "hr").reduce((s, i) => s + i.qty, 0) : 0;
      if (hours > 0 && priceHrs > 0) { clockedHours += hours; pricedHours += priceHrs; }
    }

    const decided = won.length + lost.length;

    return {
      type,
      won: won.length,
      openLeads: openLeads.length,
      lost: lost.length,
      valueCents,
      avgValueCents: won.length ? Math.round(valueCents / won.length) : 0,
      pricedMargin: priced > 0 ? (priced - pricedCost) / priced : 0,
      hourBurn: pricedHours > 0 ? clockedHours / pricedHours : null,
      avgDecisionDays: decisionDays.length
        ? decisionDays.reduce((s, d) => s + d, 0) / decisionDays.length
        : null,
      winRate: decided > 0 ? won.length / decided : null,
    };
  }).sort((a, b) => b.valueCents - a.valueCents);
}
