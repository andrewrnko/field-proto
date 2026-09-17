/* The moisture log.
 *
 * Rot is a moisture problem: above roughly 20% moisture content wood-decay fungi
 * stay active, below it they go dormant. Every reading the crew takes is plotted
 * against that line, so "is this fixed" stops being an opinion. One series, one
 * hue, the threshold as a recessive rule, only the latest point labelled — and
 * the same numbers listed underneath, because a chart is never the only copy of
 * the data. */
import { useState } from "react";
import { motion } from "motion/react";
import { Pressable } from "../../ui/primitives";
import { Tag } from "../../ui/domain";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { dateLabel, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { CALLBACK_LABEL } from "../../data/types";
import "./moisture.css";

/** the line the trade actually works to */
const DECAY = 20;

type Reading = { at: string; pct: number; where: string; kind: "finding" | "recheck" };

export function MoistureSection({ jobId }: { jobId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const [picked, setPicked] = useState<number | null>(null);

  const readings: Reading[] = [
    ...e.findings(jobId)
      .filter((f) => f.moisturePct != null)
      .map((f) => ({ at: f.discoveredAt, pct: f.moisturePct!, where: f.location, kind: "finding" as const })),
    ...db.callbacks
      .filter((c) => c.jobId === jobId && c.resultPct != null)
      .map((c) => ({ at: c.doneAt ?? c.dueAt, pct: c.resultPct!, where: CALLBACK_LABEL[c.kind], kind: "recheck" as const })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  if (readings.length < 3) return null;

  const pending = db.callbacks.find((c) => c.jobId === jobId && c.kind === "moisture_recheck" && !c.doneAt);
  const latest = readings[readings.length - 1];
  const wet = readings.filter((r) => r.pct >= DECAY).length;

  /* geometry: a 100x40 user-space box, stroked at a fixed width via
     vector-effect so the line stays 2px at any container size */
  const max = Math.max(...readings.map((r) => r.pct), DECAY + 6);
  const min = Math.min(...readings.map((r) => r.pct), DECAY - 6);
  const x = (i: number) => (i / (readings.length - 1)) * 100;
  const y = (p: number) => 40 - ((p - min) / (max - min)) * 40;
  const line = readings.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(r.pct).toFixed(2)}`).join(" ");
  const area = `${line} L100,40 L0,40 Z`;
  const shown = picked != null ? readings[picked] : latest;

  return (
    <section className="rec-sec">
      <h2>Moisture</h2>

      <div className="moist">
        <div className="moist-head">
          <div>
            <p className="moist-now">
              {shown.pct}<span>% MC</span>
            </p>
            <p className="moist-where">
              {shown.where} · {picked != null ? dateLabel(shown.at) : `read ${relative(shown.at, NOW)}`}
            </p>
          </div>
          <Tag hue={latest.pct >= DECAY ? "coral" : "emerald"}>
            {latest.pct >= DECAY ? "Still active" : "Below decay"}
          </Tag>
        </div>

        <div className="moist-plot">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="moistfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--hue-cyan)" stopOpacity="0.26" />
                <stop offset="1" stopColor="var(--hue-cyan)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* the decay threshold: recessive, dashed, never the loudest thing */}
            <line
              x1="0" x2="100" y1={y(DECAY)} y2={y(DECAY)}
              stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <path d={area} fill="url(#moistfill)" />
            <motion.path
              d={line} fill="none" stroke="var(--hue-cyan)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...SPRING.sheet, duration: 0.6 }}
            />
          </svg>
          <span className="moist-rule-label" style={{ top: `${(y(DECAY) / 40) * 100}%` }}>{DECAY}% decay line</span>

          {/* one hit target per reading, bigger than the mark */}
          <div className="moist-hits">
            {readings.map((r, i) => (
              <Pressable
                key={i}
                className={`moist-hit${picked === i ? " is-on" : ""}`}
                style={{ left: `${x(i)}%` }}
                aria-label={`${r.pct}% on ${dateLabel(r.at)}`}
                onClick={() => { haptic("select"); setPicked(picked === i ? null : i); }}
              >
                <span
                  className={`moist-dot${r.pct >= DECAY ? " is-wet" : ""}${i === readings.length - 1 ? " is-last" : ""}`}
                  style={{ top: `${(y(r.pct) / 40) * 100}%` }}
                />
              </Pressable>
            ))}
          </div>
        </div>

        <p className="moist-note">
          {wet} of {readings.length} readings sat at or above {DECAY}%.{" "}
          {latest.pct >= DECAY
            ? "The source is still wet — do not close it up."
            : "Dry enough to close up, provided it stays there."}
        </p>

        {pending && (
          <p className="moist-next">
            Re-check booked {relative(pending.dueAt, NOW)}
            {pending.baselinePct != null && ` against the ${pending.baselinePct}% baseline`}
          </p>
        )}
      </div>
    </section>
  );
}
