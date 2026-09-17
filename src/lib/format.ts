/* Money is integer cents. Dates are business-timezone (America/Los_Angeles)
   and are formatted from the frozen NOW in src/data/clock.ts — never Date.now(),
   so screenshots and fixtures stay deterministic. */

export function money(cents: number, opts: { cents?: boolean; sign?: boolean } = {}) {
  const showCents = opts.cents ?? cents % 100 !== 0;
  const s = (Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
  const sign = cents < 0 ? "−" : opts.sign ? "+" : "";
  return `${sign}$${s}`;
}

export function compactMoney(cents: number) {
  const v = cents / 100;
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
}

const TZ = "America/Los_Angeles";

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: TZ,
  }).replace(" AM", " am").replace(" PM", " pm");
}

export function dayName(iso: string, len: "short" | "long" = "short") {
  return new Date(iso).toLocaleDateString("en-US", { weekday: len, timeZone: TZ });
}

export function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
}

export function relative(iso: string, now: Date) {
  const ms = new Date(iso).getTime() - now.getTime();
  const min = Math.round(ms / 60000);
  const abs = Math.abs(min);
  if (abs < 1) return "now";
  if (abs < 60) return ms > 0 ? `in ${abs}m` : `${abs}m ago`;
  const hr = Math.round(abs / 60);
  if (hr < 24) return ms > 0 ? `in ${hr}h` : `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d === 1) return ms > 0 ? "tomorrow" : "yesterday";
  if (d < 7) return ms > 0 ? `in ${d}d` : `${d}d ago`;
  return dateLabel(iso);
}

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export function phone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw;
}
