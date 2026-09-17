/* Frozen clock. Every relative label ("in 40m", "2d overdue") and every seeded
   fixture is computed from this instant, so a screenshot taken now and one
   taken next week look identical. */
export const NOW_ISO = "2026-09-17T07:12:00-07:00";
export const NOW = new Date(NOW_ISO);

/** minutes/hours/days from NOW, as an ISO string */
export function at(offset: { d?: number; h?: number; m?: number }) {
  const t = new Date(NOW);
  if (offset.d) t.setDate(t.getDate() + offset.d);
  if (offset.h) t.setHours(t.getHours() + offset.h);
  if (offset.m) t.setMinutes(t.getMinutes() + offset.m);
  return t.toISOString();
}

/** an absolute clock time on a day relative to today, in business time */
export function onDay(dayOffset: number, hh: number, mm = 0) {
  const t = new Date(NOW);
  t.setDate(t.getDate() + dayOffset);
  t.setHours(hh, mm, 0, 0);
  return t.toISOString();
}

export function startOfDay(d: Date) {
  const t = new Date(d); t.setHours(0, 0, 0, 0); return t;
}

export function sameDay(a: string | Date, b: string | Date) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function dayOffsetOf(iso: string) {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(NOW).getTime()) / 86400000);
}
