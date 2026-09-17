/* Haptic + micro-audio feedback.
   navigator.vibrate is a no-op on iOS Safari, so we pair it with a very short
   WebAudio transient that reads as a "tick" on a phone speaker. Both are
   suppressed under prefers-reduced-motion and can be muted from Settings. */

type Kind = "light" | "medium" | "heavy" | "select" | "success" | "warning" | "error";

const PATTERN: Record<Kind, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 24,
  select: 5,
  success: [10, 40, 18],
  warning: [16, 50, 16],
  error: [22, 40, 22, 40, 30],
};

const TONE: Record<Kind, { f: number; d: number; g: number }> = {
  light:   { f: 1800, d: 0.012, g: 0.030 },
  medium:  { f: 1400, d: 0.018, g: 0.045 },
  heavy:   { f: 900,  d: 0.028, g: 0.060 },
  select:  { f: 2400, d: 0.008, g: 0.022 },
  success: { f: 1600, d: 0.030, g: 0.050 },
  warning: { f: 700,  d: 0.040, g: 0.050 },
  error:   { f: 420,  d: 0.060, g: 0.060 },
};

let ctx: AudioContext | null = null;
let enabled = true;
let audible = false;

export function setHaptics(on: boolean) { enabled = on; }
export function setHapticAudio(on: boolean) { audible = on; }

function reduced() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function haptic(kind: Kind = "light") {
  if (!enabled || reduced()) return;
  try { navigator.vibrate?.(PATTERN[kind]); } catch { /* unsupported */ }
  if (!audible) return;
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    const { f, d, g } = TONE[kind];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    gain.gain.setValueAtTime(g, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + d);
  } catch { /* audio unavailable */ }
}
