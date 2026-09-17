/* ------------------------------------------------------------------ *
 * The glossy object family.
 *
 * Rendered, not generated: a superelliptical tile with a hue gradient, a
 * specular sweep across the top, a bounce light at the bottom, a fine light
 * rim and a soft contact shadow — the glyph sits on top in white with its own
 * drop shadow. Same light direction (upper left) on every object, so twelve
 * of them read as one family. Being SVG, they stay crisp at 24px and at 96px
 * and they re-tint for dark mode.
 * ------------------------------------------------------------------ */
import { useId } from "react";
import type { IconName } from "./Icon";

export type ObjHue =
  | "blue" | "amber" | "cyan" | "indigo" | "emerald" | "coral"
  | "violet" | "teal" | "yellow" | "pink" | "slate";

/** top colour, bottom colour, glyph shadow colour */
const RAMP: Record<ObjHue, [string, string, string]> = {
  blue:    ["#6FA0FF", "#2452D6", "#12307F"],
  amber:   ["#FFC46B", "#E0821A", "#8A4708"],
  cyan:    ["#6FD9EE", "#1596B4", "#0A5568"],
  indigo:  ["#A49BFF", "#5945D6", "#2C1F7A"],
  emerald: ["#68D79C", "#159159", "#0A5132"],
  coral:   ["#FF9A8E", "#E14A3C", "#82231A"],
  violet:  ["#C79BFF", "#8B41D9", "#4A1C7C"],
  teal:    ["#63D4C4", "#0E9082", "#08544B"],
  yellow:  ["#FFD874", "#DFA415", "#845F06"],
  pink:    ["#FF9CC6", "#DB4B8E", "#7C1F4C"],
  slate:   ["#A9B2C2", "#5C6879", "#2B3340"],
};

/* the glyph drawn on the tile, one per object */
const GLYPH: Record<string, string> = {
  house:     "M6 18.5 24 4l18 14.5V42a2.5 2.5 0 0 1-2.5 2.5h-31A2.5 2.5 0 0 1 6 42zM18.5 44v-12h11v12",
  beam:      "M5 17h38a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4zM14 17v14M24 17v14M34 17v14",
  drop:      "M24 5s13 13.8 13 22.6A13 13 0 1 1 11 27.6C11 18.8 24 5 24 5z",
  clipboard: "M14 8h20v34H14zM19 8V5h10v3M18.5 25.5l4 4 7.5-8",
  coins:     "M24 13c7.7 0 14 2.2 14 5s-6.3 5-14 5-14-2.2-14-5 6.3-5 14-5zM10 18v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8M10 26v8c0 2.8 6.3 5 14 5s14-2.2 14-5v-8",
  calendar:  "M8 13a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v25a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3zM8 19h32M16 5v8M32 5v8",
  bubble:    "M40 23c0 7.7-7.2 14-16 14a19 19 0 0 1-5.2-.7L9 40l2.2-6.2C8.6 31.3 8 27.3 8 23c0-7.7 7.2-14 16-14s16 6.3 16 14z",
  camera:    "M6 18a4 4 0 0 1 4-4h3.6l2.4-4h16l2.4 4H38a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4zM24 32.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z",
  tools:     "M29.5 7.5a9.5 9.5 0 0 0-11.7 12.3L6 31.6 16.4 42l11.8-11.8A9.5 9.5 0 0 0 40.5 18.5L33 26l-4.8-1.2L27 20z",
  van:       "M4 15a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v17H4zM28 20h7l7 7.5V32H28M13 38a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM34 38a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  warning:   "M20.6 8 6.8 31.6A4 4 0 0 0 10.2 38h27.6a4 4 0 0 0 3.4-6.4L27.4 8a4 4 0 0 0-6.8 0zM24 18v9M24 32h.02",
  docs:      "M14 6h13l9 9v25a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM27 6v9h9",
  ruler:     "M7 30 30 7l11 11-23 23zM14 23l4 4M20 17l4 4M26 11l4 4",
  bell:      "M19 38a5 5 0 0 0 10 0M12 38h24l-2.6-4.4V23a9.4 9.4 0 1 0-18.8 0v10.6z",
  check:     "M10 25l9 9L38 15",
  pin:       "M24 43s13-11 13-21a13 13 0 1 0-26 0c0 10 13 21 13 21zM24 26a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  lock:      "M15 21v-5a9 9 0 0 1 18 0v5M12.5 21h23a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 10 36.5v-13A2.5 2.5 0 0 1 12.5 21z",
};

export type ObjName = keyof typeof GLYPH;

/** which glyphs are drawn as outlines rather than filled shapes */
const STROKED = new Set(["beam", "clipboard", "coins", "calendar", "camera", "van", "warning", "ruler", "check", "house", "bubble", "docs", "bell", "lock", "pin", "tools", "drop"]);

export function Obj({
  name, hue = "blue", size = 44, className = "",
}: { name: ObjName; hue?: ObjHue; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const [top, bottom, deep] = RAMP[hue];
  const stroked = STROKED.has(name);

  return (
    <svg
      className={`obj3d ${className}`}
      width={size} height={size} viewBox="0 0 64 64"
      aria-hidden focusable="false"
      style={{ flex: "none" }}
    >
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="0.3" cy="0.08" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.62" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="1" x2="0" y2="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}s`} x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.6" floodColor={deep} floodOpacity="0.45" />
        </filter>
      </defs>

      {/* the tile: a superellipse, not a rounded rect — it is what makes it read as an app object */}
      <path
        d="M32 2c17.5 0 30 12.5 30 30S49.5 62 32 62 2 49.5 2 32 14.5 2 32 2z"
        style={{ display: "none" }}
      />
      <path
        d="M32 3c8.9 0 14.9 1 19.4 3.5 4.1 2.3 6.8 5 9.1 9.1C63 20.1 64 26.1 64 35s-1 14.9-3.5 19.4c-2.3 4.1-5 6.8-9.1 9.1-4.5 2.5-10.5 3.5-19.4 3.5s-14.9-1-19.4-3.5c-4.1-2.3-6.8-5-9.1-9.1C1 49.9 0 43.9 0 35s1-14.9 3.5-19.4c2.3-4.1 5-6.8 9.1-9.1C17.1 4 23.1 3 32 3z"
        transform="translate(0,-3) scale(1,0.94)"
        fill={`url(#${id}f)`}
      />
      <path
        d="M32 3c8.9 0 14.9 1 19.4 3.5 4.1 2.3 6.8 5 9.1 9.1C63 20.1 64 26.1 64 35s-1 14.9-3.5 19.4c-2.3 4.1-5 6.8-9.1 9.1-4.5 2.5-10.5 3.5-19.4 3.5s-14.9-1-19.4-3.5c-4.1-2.3-6.8-5-9.1-9.1C1 49.9 0 43.9 0 35s1-14.9 3.5-19.4c2.3-4.1 5-6.8 9.1-9.1C17.1 4 23.1 3 32 3z"
        transform="translate(0,-3) scale(1,0.94)"
        fill={`url(#${id}g)`}
      />
      <path
        d="M32 3c8.9 0 14.9 1 19.4 3.5 4.1 2.3 6.8 5 9.1 9.1C63 20.1 64 26.1 64 35s-1 14.9-3.5 19.4c-2.3 4.1-5 6.8-9.1 9.1-4.5 2.5-10.5 3.5-19.4 3.5s-14.9-1-19.4-3.5c-4.1-2.3-6.8-5-9.1-9.1C1 49.9 0 43.9 0 35s1-14.9 3.5-19.4c2.3-4.1 5-6.8 9.1-9.1C17.1 4 23.1 3 32 3z"
        transform="translate(0,-3) scale(1,0.94)"
        fill={`url(#${id}b)`}
      />

      {/* the object itself, one light source, sitting on the tile */}
      <g transform="translate(9.6 9.6) scale(0.7)" filter={`url(#${id}s)`}>
        <path
          d={GLYPH[name]}
          fill={stroked ? "none" : "#fff"}
          stroke="#fff"
          strokeWidth={stroked ? 3.6 : 0}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.97"
        />
      </g>
    </svg>
  );
}

/** the glyph name an Icon uses, mapped to its object — so a row can swap one for the other */
export const ICON_TO_OBJ: Partial<Record<IconName, ObjName>> = {
  home: "house", layers: "beam", drop: "drop", doc: "clipboard", money: "coins",
  schedule: "calendar", today: "calendar", message: "bubble", camera: "camera",
  wrench: "tools", truck: "van", alert: "warning", copy: "docs", ruler: "ruler",
  bell: "bell", check: "check", pin: "pin", lock: "lock",
};
