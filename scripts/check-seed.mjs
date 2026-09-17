#!/usr/bin/env node
/* Fixture integrity gate for src/data/seed.ts.
 *
 * A dangling ID in fixture data is a bug that only shows up as a blank screen
 * three features later, so this runs the whole graph before anyone trusts it.
 *
 * Usage:  node scripts/check-seed.mjs
 *
 * seed.ts uses extensionless imports (bundler resolution), which Node's type
 * stripper will not resolve, so we compile the three data files to CommonJS in
 * node_modules/.tmp and require the result. */

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { rmSync, existsSync, writeFileSync, mkdirSync } from "node:fs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "node_modules", ".tmp", "seed-check");

rmSync(outDir, { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    join(root, "node_modules", "typescript", "bin", "tsc"),
    join(root, "src", "data", "seed.ts"),
    "--outDir", outDir,
    "--module", "commonjs",
    "--moduleResolution", "node",
    "--target", "es2022",
    "--skipLibCheck",
    "--ignoreConfig",
    "--ignoreDeprecations", "6.0",
  ],
  { stdio: "inherit", cwd: root },
);

/* the repo is type:module, so mark the compiled output as CommonJS */
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));

const require = createRequire(import.meta.url);
const compiled = join(outDir, "seed.js");
if (!existsSync(compiled)) { console.error("compile produced no seed.js"); process.exit(1); }
const { seed } = require(compiled);
const db = seed();

/* ------------------------------------------------------------------ */

const problems = [];
const fail = (msg) => problems.push(msg);

const idSet = (rows, label) => {
  const s = new Set();
  for (const r of rows) {
    if (r.id === undefined) continue;   // keyed collections (leadResponse) have no id
    if (s.has(r.id)) fail(`duplicate id in ${label}: ${r.id}`);
    s.add(r.id);
  }
  return s;
};

const people = idSet(db.people, "people");
const customers = idSet(db.customers, "customers");
const properties = idSet(db.properties, "properties");
const jobs = idSet(db.jobs, "jobs");
const findings = idSet(db.findings, "findings");
const photos = idSet(db.photos, "photos");
const estimates = idSet(db.estimates, "estimates");
const changeOrders = idSet(db.changeOrders, "changeOrders");
const appointments = idSet(db.appointments, "appointments");
const invoices = idSet(db.invoices, "invoices");
const payments = idSet(db.payments, "payments");
const threads = idSet(db.threads, "threads");
const messages = idSet(db.messages, "messages");
const activity = idSet(db.activity, "activity");

/* every id across the whole database is unique, so no screen can confuse two
   records that happen to share a key */
const seenGlobal = new Map();
for (const [label, rows] of Object.entries(db)) {
  if (!Array.isArray(rows)) continue;
  for (const r of rows) {
    if (r?.id === undefined) continue;   // keyed collections (leadResponse) carry no id
    if (seenGlobal.has(r.id)) fail(`id "${r.id}" used in both ${seenGlobal.get(r.id)} and ${label}`);
    seenGlobal.set(r.id, label);
  }
}

const ref = (set, id, where) => { if (!set.has(id)) fail(`${where} -> missing ${id}`); };
const refN = (set, id, where) => { if (id !== null && id !== undefined) ref(set, id, where); };

/* ---- me ---------------------------------------------------------- */
ref(people, db.me, "db.me");

/* ---- customers <-> properties ------------------------------------ */
for (const c of db.customers) {
  if (!c.propertyIds.length) fail(`customer ${c.id} owns no property`);
  for (const p of c.propertyIds) ref(properties, p, `customer ${c.id}.propertyIds`);
}
for (const p of db.properties) {
  ref(customers, p.customerId, `property ${p.id}.customerId`);
  const owner = db.customers.find((c) => c.id === p.customerId);
  if (owner && !owner.propertyIds.includes(p.id)) fail(`property ${p.id} not listed on customer ${owner.id}`);
}

/* ---- jobs -------------------------------------------------------- */
for (const j of db.jobs) {
  ref(customers, j.customerId, `job ${j.id}.customerId`);
  ref(properties, j.propertyId, `job ${j.id}.propertyId`);
  refN(people, j.ownerId, `job ${j.id}.ownerId`);
  for (const c of j.crewIds) ref(people, c, `job ${j.id}.crewIds`);
  if (j.blocker) refN(people, j.blocker.owner, `job ${j.id}.blocker.owner`);
  if (j.nextAction) refN(people, j.nextAction.ownerId, `job ${j.id}.nextAction.ownerId`);
  const prop = db.properties.find((p) => p.id === j.propertyId);
  if (prop && prop.customerId !== j.customerId) fail(`job ${j.id} property belongs to ${prop.customerId}, job says ${j.customerId}`);
}

/* ---- findings / photos ------------------------------------------- */
const peopleOrCustomers = new Set([...people, ...customers]);
for (const f of db.findings) {
  ref(jobs, f.jobId, `finding ${f.id}.jobId`);
  ref(people, f.discoveredBy, `finding ${f.id}.discoveredBy`);
  for (const ph of f.photoIds) ref(photos, ph, `finding ${f.id}.photoIds`);
  refN(changeOrders, f.changeOrderId, `finding ${f.id}.changeOrderId`);
  if (f.moisturePct !== undefined && (f.moisturePct < 5 || f.moisturePct > 60)) fail(`finding ${f.id} moisturePct out of range`);
}
for (const p of db.photos) {
  ref(jobs, p.jobId, `photo ${p.id}.jobId`);
  refN(findings, p.findingId, `photo ${p.id}.findingId`);
  ref(peopleOrCustomers, p.by, `photo ${p.id}.by`);
  if (!/^gr-(0[1-9]|1[0-9]|2[0-6])$/.test(p.seed)) fail(`photo ${p.id} seed "${p.seed}" outside gr-01..gr-26`);
  if (p.syncState === "synced" && !p.uploadedAt) fail(`photo ${p.id} is synced with no uploadedAt`);
  if (p.syncState !== "synced" && p.uploadedAt) fail(`photo ${p.id} is ${p.syncState} but has uploadedAt`);
  /* a finding and its photo must agree in both directions */
  if (p.findingId) {
    const f = db.findings.find((x) => x.id === p.findingId);
    if (f && !f.photoIds.includes(p.id)) fail(`photo ${p.id} points at finding ${f.id} which does not list it`);
    if (f && f.jobId !== p.jobId) fail(`photo ${p.id} and finding ${f.id} are on different jobs`);
  }
}

/* ---- estimates / change orders ----------------------------------- */
const itemTotal = (i) => Math.round(i.qty * i.unitPriceCents);
const itemCost = (i) => Math.round(i.qty * i.unitCostCents);
const totals = (items, depositPct = 0) => {
  const inc = items.filter((i) => !i.optional);
  const subtotal = inc.reduce((s, i) => s + itemTotal(i), 0);
  const cost = inc.reduce((s, i) => s + itemCost(i), 0);
  const optional = items.filter((i) => i.optional).reduce((s, i) => s + itemTotal(i), 0);
  return { subtotal, cost, optional, margin: subtotal ? (subtotal - cost) / subtotal : 0, deposit: Math.round(subtotal * depositPct / 100) };
};
const lineIds = new Set();
for (const e of db.estimates) {
  ref(jobs, e.jobId, `estimate ${e.id}.jobId`);
  if (e.items.length < 4) fail(`estimate ${e.id} has fewer than 4 line items`);
  for (const i of e.items) {
    if (lineIds.has(i.id)) fail(`duplicate line item id ${i.id}`);
    lineIds.add(i.id);
    if (i.unitPriceCents <= 0 || i.unitCostCents <= 0) fail(`line ${i.id} has a non-positive price or cost`);
    if (i.unitCostCents >= i.unitPriceCents) fail(`line ${i.id} sells at or below cost`);
  }
  const job = db.jobs.find((j) => j.id === e.jobId);
  const t = totals(e.items, e.depositPct);
  if (job && job.valueCents !== t.subtotal) fail(`job ${job.id} value ${job.valueCents} != estimate ${e.id} subtotal ${t.subtotal}`);
  if (e.status !== "draft" && !e.sentAt) fail(`estimate ${e.id} is ${e.status} with no sentAt`);
  if ((e.status === "approved" || e.status === "declined") && !e.decidedAt) fail(`estimate ${e.id} is ${e.status} with no decidedAt`);
}
for (const co of db.changeOrders) {
  ref(jobs, co.jobId, `changeOrder ${co.id}.jobId`);
  for (const f of co.findingIds) {
    ref(findings, f, `changeOrder ${co.id}.findingIds`);
    const finding = db.findings.find((x) => x.id === f);
    if (finding && finding.changeOrderId !== co.id) fail(`finding ${f} does not point back at ${co.id}`);
    if (finding && finding.jobId !== co.jobId) fail(`finding ${f} is on a different job than ${co.id}`);
  }
  for (const i of co.items) {
    if (lineIds.has(i.id)) fail(`duplicate line item id ${i.id}`);
    lineIds.add(i.id);
  }
  if (co.status !== "draft" && !co.sentAt) fail(`changeOrder ${co.id} is ${co.status} with no sentAt`);
}

/* ---- appointments ------------------------------------------------ */
for (const a of db.appointments) {
  ref(jobs, a.jobId, `appointment ${a.id}.jobId`);
  if (!a.crewIds.length) fail(`appointment ${a.id} has no crew`);
  for (const c of a.crewIds) ref(people, c, `appointment ${a.id}.crewIds`);
  if (new Date(a.endAt) <= new Date(a.startAt)) fail(`appointment ${a.id} ends before it starts`);
}

/* ---- invoices / payments ----------------------------------------- */
for (const i of db.invoices) {
  ref(jobs, i.jobId, `invoice ${i.id}.jobId`);
  if (i.paidCents > i.amountCents) fail(`invoice ${i.id} overpaid`);
  const settled = db.payments.filter((p) => p.invoiceId === i.id && p.state === "settled")
    .reduce((s, p) => s + p.amountCents, 0);
  if (settled !== i.paidCents) fail(`invoice ${i.id} paidCents ${i.paidCents} != settled payments ${settled}`);
  if (i.state === "paid" && i.paidCents !== i.amountCents) fail(`invoice ${i.id} marked paid but is short`);
}
for (const p of db.payments) {
  ref(invoices, p.invoiceId, `payment ${p.id}.invoiceId`);
  ref(jobs, p.jobId, `payment ${p.id}.jobId`);
  const inv = db.invoices.find((i) => i.id === p.invoiceId);
  if (inv && inv.jobId !== p.jobId) fail(`payment ${p.id} job does not match invoice ${inv.id}`);
}

/* ---- threads / messages ------------------------------------------ */
for (const t of db.threads) {
  ref(customers, t.customerId, `thread ${t.id}.customerId`);
  refN(jobs, t.jobId, `thread ${t.id}.jobId`);
  const msgs = db.messages.filter((m) => m.threadId === t.id);
  if (!msgs.length) fail(`thread ${t.id} has no messages`);
  const last = msgs.map((m) => m.at).sort().at(-1);
  if (last !== t.lastAt) fail(`thread ${t.id} lastAt ${t.lastAt} != newest message ${last}`);
  const unread = msgs.filter((m) => m.direction === "in" && !m.readAt).length;
  if (unread !== t.unread) fail(`thread ${t.id} unread ${t.unread} != ${unread} unread inbound`);
}
for (const m of db.messages) {
  ref(threads, m.threadId, `message ${m.id}.threadId`);
  for (const ph of m.attachmentPhotoIds ?? []) ref(photos, ph, `message ${m.id}.attachmentPhotoIds`);
  if (m.channel === "call" && !m.callSummary) fail(`message ${m.id} is a call with no summary`);
}

/* ---- activity ---------------------------------------------------- */
for (const a of db.activity) {
  ref(jobs, a.jobId, `activity ${a.id}.jobId`);
  if (a.actorId !== "system" && a.actorId !== "customer") ref(people, a.actorId, `activity ${a.id}.actorId`);
}

/* ---- the rules the UI actually leans on -------------------------- */
for (const j of db.jobs.filter((x) => x.stage === "in_progress")) {
  const ap = db.appointments.filter((a) => a.jobId === j.id).length;
  const fi = db.findings.filter((f) => f.jobId === j.id).length;
  const ph = db.photos.filter((p) => p.jobId === j.id).length;
  const ac = db.activity.filter((a) => a.jobId === j.id).length;
  if (ap < 1) fail(`in_progress job ${j.id} has no appointments`);
  if (fi < 3) fail(`in_progress job ${j.id} has ${fi} findings, needs 3`);
  if (ph < 4) fail(`in_progress job ${j.id} has ${ph} photos, needs 4`);
  if (ac < 1) fail(`in_progress job ${j.id} has no activity`);
}
for (const j of db.jobs.filter((x) => x.payment !== "none")) {
  if (!db.invoices.some((i) => i.jobId === j.id)) fail(`job ${j.id} payment=${j.payment} with no invoice`);
}
for (const j of db.jobs.filter((x) => x.payment === "none")) {
  if (db.invoices.some((i) => i.jobId === j.id)) fail(`job ${j.id} payment=none but has an invoice`);
}

/* ---- deliberate fixture properties ------------------------------- */
const NOW = new Date(db.now);
const dayOffset = (iso) => {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  const b = new Date(NOW); b.setHours(0, 0, 0, 0);
  return Math.round((a - b) / 86400000);
};
const expect = (label, actual, wanted) => {
  if (actual !== wanted) fail(`${label}: expected ${wanted}, got ${actual}`);
};

expect("jobs with no owner", db.jobs.filter((j) => j.ownerId === null).length, 2);
expect("blocked jobs", db.jobs.filter((j) => j.blocker !== null).length, 6);
expect("overdue next actions", db.jobs.filter((j) => j.nextAction && new Date(j.nextAction.dueAt) < NOW).length, 4);
expect("queued photos", db.photos.filter((p) => p.syncState === "queued").length, 3);
expect("failed photos", db.photos.filter((p) => p.syncState === "failed").length, 1);
expect("threads needing a reply", db.threads.filter((t) => t.needsReply).length, 3);
expect("new damage findings", db.findings.filter((f) => f.isNewDamage).length, 6);
expect("findings on a change order", db.findings.filter((f) => f.changeOrderId).length, 2);
expect("customers with two properties", db.customers.filter((c) => c.propertyIds.length === 2).length, 2);
expect("pending payments", db.payments.filter((p) => p.state === "pending").length, 1);
expect("failed payments", db.payments.filter((p) => p.state === "failed").length, 1);
expect("estimates with optional items", db.estimates.filter((e) => e.items.some((i) => i.optional)).length, 1);
expect("stages represented", new Set(db.jobs.map((j) => j.stage)).size, 13);

/* one crew double-booking, on day +2, and nowhere else */
const overlaps = [];
for (let i = 0; i < db.appointments.length; i++) {
  for (let k = i + 1; k < db.appointments.length; k++) {
    const a = db.appointments[i], b = db.appointments[k];
    const shared = a.crewIds.filter((c) => b.crewIds.includes(c));
    if (!shared.length) continue;
    if (new Date(a.startAt) < new Date(b.endAt) && new Date(b.startAt) < new Date(a.endAt)) {
      overlaps.push({ a: a.id, b: b.id, crew: shared, day: dayOffset(a.startAt) });
    }
  }
}
expect("crew conflicts", overlaps.length, 1);
if (overlaps.length === 1 && overlaps[0].day !== 2) fail(`the crew conflict should sit on day +2, found day ${overlaps[0].day}`);

/* ------------------------------------------------------------------ */

const pad = (s, n) => String(s).padEnd(n);
console.log("\nseed() entity counts");
for (const [k, v] of Object.entries(db)) {
  if (Array.isArray(v)) console.log("  " + pad(k, 14) + String(v.length).padStart(4));
}

console.log("\nestimate margins");
for (const e of db.estimates) {
  const t = totals(e.items, e.depositPct);
  console.log(
    `  ${pad(e.id + " " + e.number, 18)} ${pad(e.status, 9)} ` +
    `subtotal ${(t.subtotal / 100).toFixed(2).padStart(10)}  ` +
    `margin ${(t.margin * 100).toFixed(1).padStart(5)}%  ` +
    `deposit ${(t.deposit / 100).toFixed(2).padStart(9)}` +
    (t.optional ? `  optional ${(t.optional / 100).toFixed(2)}` : ""),
  );
}

console.log("\nstage spread");
const byStage = {};
for (const j of db.jobs) byStage[j.stage] = (byStage[j.stage] ?? 0) + 1;
for (const [s, n] of Object.entries(byStage)) console.log("  " + pad(s, 20) + n);

if (overlaps.length) {
  console.log("\nintentional schedule conflict");
  for (const o of overlaps) console.log(`  day +${o.day}: ${o.a} and ${o.b} both booked on ${o.crew.join(", ")}`);
}

console.log("");
if (problems.length) {
  console.error(`FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("OK — every reference resolves, no duplicate ids, all fixture invariants hold.\n");
