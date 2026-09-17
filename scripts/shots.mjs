/**
 * Real-browser verification for the prototype.
 *
 *   node scripts/shots.mjs                  # every registered shot, light
 *   node scripts/shots.mjs --dark           # dark theme
 *   node scripts/shots.mjs today jobs       # named shots only
 *
 * Every shot fails loudly on a console error, a page error or a failed
 * request — a screenshot that hides a runtime error proves nothing.
 * Shots are cropped to the device screen at 3x so they read like a real phone
 * screenshot rather than a page of desktop chrome.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.SHOT_URL ?? "http://127.0.0.1:4825";
const argv = process.argv.slice(2);
const dark = argv.includes("--dark");
const only = argv.filter((a) => !a.startsWith("--"));
const OUT = join(process.cwd(), "shots");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** tap through the UI by accessible name, data-shot hook, or visible text */
async function tap(page, text, { nth = 0, settle = 560 } = {}) {
  const handle = await page.evaluateHandle((t, n) => {
    const nodes = [...document.querySelectorAll("button,[role=tab],[role=button],a,[data-shot]")]
      .filter((el) => el.offsetParent !== null && !el.closest("[inert]") && el.getClientRects().length > 0);
    const hits = nodes.filter((el) => {
      const label = (el.dataset.shot || el.getAttribute("aria-label") || el.textContent || "").trim();
      return label === t || label.startsWith(t);
    });
    return hits[n] ?? null;
  }, text, nth);
  const el = handle.asElement();
  if (!el) throw new Error(`tap target not found: ${text}`);
  await el.click();
  await wait(settle);
}

/* Now is the only home; everything else is reached through the Deck, the way a
   person reaches it. */
const deck = (name) => async (p) => { await tap(p, "deck"); await tap(p, name); };

const SHOTS = [
  ["now", async () => {}],
  ["deck", async (p) => tap(p, "deck")],
  ["jobs", deck("Jobs")],
  ["schedule", deck("Schedule")],
  ["money", deck("Money")],
  ["inbox", deck("Inbox")],
  ["people", deck("People")],
  ["media", deck("Media")],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  userDataDir: `/tmp/gotrot-field-shots-${process.pid}`,
  args: ["--no-first-run", "--no-default-browser-check", "--font-render-hinting=none"],
});

mkdirSync(OUT, { recursive: true });
let failures = 0;

for (const [name, drive] of SHOTS) {
  if (only.length && !only.includes(name)) continue;
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 1000, deviceScaleFactor: 3 });
  const problems = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ""}`));
  await page.evaluateOnNewDocument((t) => localStorage.setItem("gr-theme", t), dark ? "dark" : "light");

  const res = await page.goto(BASE, { waitUntil: "networkidle0", timeout: 45000 });
  if (!res || res.status() >= 400) problems.push(`http ${res?.status()}`);
  await wait(700);

  try { await drive(page); } catch (e) { problems.push(`drive: ${e.message}`); }

  const device = await page.$(".screen");
  const file = join(OUT, `${name}${dark ? "--dark" : ""}.png`);
  await (device ?? page).screenshot({ path: file });

  if (problems.length) { failures++; console.error(`x ${name}\n   ${problems.join("\n   ")}`); }
  else console.log(`ok ${name} -> shots/${name}${dark ? "--dark" : ""}.png`);
  await page.close();
}

await browser.close();
if (failures) { console.error(`\n${failures} shot(s) had problems`); process.exit(1); }
console.log("\nall shots clean");
