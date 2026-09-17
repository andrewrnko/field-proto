/* One motion vocabulary for the whole app.
   Timings follow GOTROT_DESIGN_SYSTEM §7; springs are used only where a gesture
   can be interrupted mid-flight (sheets, cards, the tab pill). */
import type { Transition } from "motion/react";

export const SPRING = {
  /** sheet / page presentation — settles fast, no visible overshoot */
  sheet:  { type: "spring", stiffness: 420, damping: 42, mass: 1 },
  /** gesture follow-through, keeps velocity from the pointer */
  track:  { type: "spring", stiffness: 520, damping: 46, mass: 0.9 },
  /** small controls: pill slide, chips, toggles */
  snap:   { type: "spring", stiffness: 700, damping: 40, mass: 0.7 },
  /** playful but restrained — used once, on confirmation marks */
  pop:    { type: "spring", stiffness: 520, damping: 22, mass: 0.8 },
} satisfies Record<string, Transition>;

export const EASE = [0.2, 0.8, 0.2, 1] as const;

export const FADE = { duration: 0.15, ease: EASE } satisfies Transition;
export const ROW  = { duration: 0.18, ease: EASE } satisfies Transition;

/** iOS-style rubber band: resistance grows the further you pull past a limit. */
export function rubber(overshoot: number, dimension = 852, coefficient = 0.55) {
  const s = Math.sign(overshoot);
  const x = Math.abs(overshoot);
  return s * ((1 - 1 / (x * coefficient / dimension + 1)) * dimension);
}

/** Where a fling would come to rest (UIKit's decelerationRate model). */
export function project(velocity: number, decel = 0.998) {
  return (velocity / 1000) * decel / (1 - decel);
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Nearest detent to a projected landing point, weighted by travel direction. */
export function nearestDetent(landing: number, detents: number[]) {
  return detents.reduce((best, d) =>
    Math.abs(d - landing) < Math.abs(best - landing) ? d : best, detents[0]);
}
