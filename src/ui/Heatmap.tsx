/* Five weeks of work, at a glance.
 *
 * One cell per day, one hue, five steps — the question is "when do we actually
 * work", and a grid answers it faster than any line chart. The scale is stated,
 * the days are labelled, and every cell is tappable for its real number, so the
 * colour is never the only copy of the data. */
import { useState } from "react";
import { motion } from "motion/react";
import { SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";
import "./heatmap.css";

export type Cell = { date: Date; value: number; label: string };

export function Heatmap({
  cells, unit = "h", weeks = 5, hue = "blue",
}: { cells: Cell[]; unit?: string; weeks?: number; hue?: "blue" | "emerald" | "violet" }) {
  const [picked, setPicked] = useState<number | null>(null);
  const peak = Math.max(...cells.map((c) => c.value), 1);
  const step = (v: number) => (v <= 0 ? 0 : v / peak > 0.75 ? 4 : v / peak > 0.5 ? 3 : v / peak > 0.25 ? 2 : 1);
  const shown = picked != null ? cells[picked] : null;

  return (
    <div className={`heat heat-${hue}`}>
      <div className="heat-head">
        <span className="heat-when">
          {shown ? shown.label : `Last ${weeks} weeks`}
        </span>
        <span className="heat-val">
          {shown ? `${shown.value.toFixed(shown.value < 10 ? 1 : 0)} ${unit}` : "tap a day"}
        </span>
      </div>
      <div className="heat-grid">
        {cells.map((c, i) => (
          <motion.button
            key={i}
            className={`heat-cell s${step(c.value)}${picked === i ? " is-on" : ""}`}
            aria-label={`${c.label}: ${c.value.toFixed(1)} ${unit}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING.snap, delay: Math.min(i, 24) * 0.006 }}
            onClick={() => { haptic("select"); setPicked(picked === i ? null : i); }}
          />
        ))}
      </div>
      <div className="heat-scale">
        <span>Less</span>
        <i className="s0" /><i className="s1" /><i className="s2" /><i className="s3" /><i className="s4" />
        <span>More</span>
      </div>
    </div>
  );
}
