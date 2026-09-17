/* ------------------------------------------------------------------ *
 * The component kit, rebuilt against the reference board.
 *
 * What the references actually are: dense white cards on light grey, small
 * type, and a vocabulary of measured objects — a semicircular gauge, a donut
 * ring, a vertical stepper, segmented ticks, status pills with a dot. Nothing
 * here is decorative; each one answers a different shape of question.
 * ------------------------------------------------------------------ */
import { type ReactNode } from "react";
import { motion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import { SPRING } from "../lib/motion";
import "./kit.css";

/* ----------------------------- the card ---------------------------- */

export function Card({
  children, title, action, pad = true, className = "",
}: { children: ReactNode; title?: string; action?: ReactNode; pad?: boolean; className?: string }) {
  return (
    <section className={`k-card${pad ? " is-pad" : ""} ${className}`}>
      {(title || action) && (
        <header className="k-card-head">
          {title && <h3 className="k-card-title">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* --------------------------- the gauge ----------------------------- *
 * A 220° arc with a graded track — the credit-score device. Use it for one
 * number that has good and bad ends. */
export function Gauge({
  value, min = 0, max = 100, label, caption, band, size = 168,
}: {
  value: number; min?: number; max?: number;
  label: string; caption?: string;
  /** which end is good — flips the ramp */
  band?: "higher-better" | "lower-better";
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const SWEEP = 240, START = 150;
  const r = 52, cx = 60, cy = 60;
  const pol = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const arc = (from: number, to: number) => {
    const [x1, y1] = pol(from), [x2, y2] = pol(to);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${to - from > 180 ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };
  const end = START + SWEEP * pct;
  const flip = band === "lower-better";

  return (
    <div className="k-gauge" style={{ width: size }}>
      <svg viewBox="0 0 120 108" width={size} height={size * 0.9}>
        <defs>
          <linearGradient id="gaugeramp" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={flip ? "var(--hue-emerald)" : "var(--hue-coral)"} />
            <stop offset="0.5" stopColor="var(--hue-amber)" />
            <stop offset="1" stopColor={flip ? "var(--hue-coral)" : "var(--hue-emerald)"} />
          </linearGradient>
        </defs>
        <path d={arc(START, START + SWEEP)} fill="none" stroke="var(--surface-sunken)" strokeWidth="11" strokeLinecap="round" />
        <motion.path
          d={arc(START, START + SWEEP)} fill="none" stroke="url(#gaugeramp)" strokeWidth="11" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: pct }} transition={{ ...SPRING.sheet, duration: 0.8 }}
        />
        <motion.circle
          cx={pol(end)[0]} cy={pol(end)[1]} r="7"
          fill="var(--surface)" stroke="var(--text)" strokeWidth="3"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ ...SPRING.pop, delay: 0.3 }}
          style={{ transformOrigin: `${pol(end)[0]}px ${pol(end)[1]}px` }}
        />
      </svg>
      <div className="k-gauge-mid">
        <span className="k-gauge-value">{Math.round(value)}<em>%</em></span>
        <span className="k-gauge-label">{label}</span>
      </div>
      {caption && <p className="k-gauge-caption">{caption}</p>}
    </div>
  );
}

/* ---------------------------- the ring ----------------------------- *
 * The Wiza credit device: a small donut beside a number and a label. */
export function Ring({
  pct, size = 34, hue = "blue", thickness = 5,
}: { pct: number; size?: number; hue?: "blue" | "emerald" | "amber" | "coral" | "violet"; thickness?: number }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg className={`k-ring k-ring-${hue}`} viewBox="0 0 40 40" width={size} height={size}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={thickness} />
      <motion.circle
        cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth={thickness} strokeLinecap="round"
        strokeDasharray={c} transform="rotate(-90 20 20)"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, pct))) }}
        transition={{ ...SPRING.sheet, duration: 0.7 }}
      />
    </svg>
  );
}

export function RingStat({
  pct, value, label, hue = "blue",
}: { pct: number; value: string; label: string; hue?: "blue" | "emerald" | "amber" | "coral" | "violet" }) {
  return (
    <div className="k-ringstat">
      <Ring pct={pct} hue={hue} size={36} />
      <div>
        <p className="k-ringstat-value">{value}</p>
        <p className="k-ringstat-label">{label}</p>
      </div>
    </div>
  );
}

/* -------------------------- status pill ---------------------------- */

export function Pill({
  children, hue = "neutral", dot, icon,
}: { children: ReactNode; hue?: "neutral" | "blue" | "emerald" | "amber" | "coral" | "violet" | "teal"; dot?: boolean; icon?: IconName }) {
  return (
    <span className={`k-pill k-pill-${hue}`}>
      {dot && <i className="k-pill-dot" />}
      {icon && <Icon name={icon} size={12} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

/* ------------------------- segmented ticks ------------------------- *
 * The hydration device: discrete progress you can count. */
export function Ticks({ done, total, hue = "blue" }: { done: number; total: number; hue?: string }) {
  return (
    <span className="k-ticks" style={{ ["--tick" as string]: `var(--hue-${hue})` }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.i
          key={i} className={i < done ? "is-on" : ""}
          initial={{ scaleY: 0.4, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }}
          transition={{ ...SPRING.snap, delay: i * 0.02 }}
        />
      ))}
    </span>
  );
}

/* --------------------------- the stepper --------------------------- *
 * The transaction-detail device: a vertical spine with states. */
export type Step = { at: string; title: string; note?: string; state: "done" | "live" | "todo"; pill?: { text: string; hue: "amber" | "emerald" | "coral" | "blue" } };

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="k-step">
      {steps.map((s, i) => (
        <li key={i} className={`k-step-row is-${s.state}`}>
          <span className="k-step-when">{s.at}</span>
          <span className="k-step-spine" aria-hidden>
            <i className="k-step-dot" />
            {i < steps.length - 1 && <i className="k-step-line" />}
          </span>
          <span className="k-step-body">
            <span className="k-step-title">{s.title}</span>
            {s.note && <span className="k-step-note">{s.note}</span>}
            {s.pill && <Pill hue={s.pill.hue}>{s.pill.text}</Pill>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------- chip navigation ------------------------- */

export function Chips<T extends string>({
  options, value, onChange,
}: { options: Array<{ value: T; label: string; icon?: IconName }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="k-chips">
      {options.map((o) => (
        <button
          key={o.value}
          className={`k-chip${o.value === value ? " is-on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <Icon name={o.icon} size={15} strokeWidth={2} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------- the metric ---------------------------- */

export function Metric({
  value, label, delta, hue,
}: { value: ReactNode; label: string; delta?: { text: string; dir: "up" | "down" }; hue?: "emerald" | "coral" | "amber" }) {
  return (
    <div className="k-metric">
      <p className={`k-metric-value${hue ? ` tone-${hue}` : ""}`}>{value}</p>
      <p className="k-metric-label">{label}</p>
      {delta && (
        <span className={`k-delta is-${delta.dir}`}>
          <Icon name={delta.dir === "up" ? "trend" : "arrowDown"} size={12} strokeWidth={2.4} />
          {delta.text}
        </span>
      )}
    </div>
  );
}
