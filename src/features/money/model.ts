/* Money — derivations.
 *
 * Everything in here is integer cents and reads from the frozen fixtures. No
 * rate, fee or total is invented: the processing fees below were recovered
 * from the settled payments in seed.ts (every card payment is exactly
 * 2.9% + 30¢, every ACH is a flat $3.00, checks and cash are free), and the
 * card on file for a customer is recovered from that customer's own failed
 * payment when there is one.
 *
 * Nothing here formats money — that is `money()` in lib/format. */
import { NOW, dayOffsetOf } from "../../data/clock";
import { estimateTotals } from "../../data/types";
import type { DB, Estimate, Invoice, Job, Payment } from "../../data/types";
import type { IconName } from "../../ui/Icon";

/* ----------------------------- methods ----------------------------- */

export type Method = "card" | "ach" | "check" | "cash";

export const METHODS: Method[] = ["card", "ach", "check", "cash"];

export const METHOD_LABEL: Record<Method, string> = {
  card: "Card on file",
  ach: "Bank transfer",
  check: "Check",
  cash: "Cash",
};

export const METHOD_ICON: Record<Method, IconName> = {
  card: "copy",
  ach: "layers",
  check: "doc",
  cash: "money",
};

export const METHOD_SETTLE: Record<Method, string> = {
  card: "Settled to your account in 1–2 days",
  ach: "Settled to your account in 2–3 days",
  check: "Recorded now — deposit the check yourself",
  cash: "Recorded now — nothing to deposit",
};

/** Processing fee in cents. Derived from the fixtures, not guessed:
 *  pay1 522780 → 15191, pay6 1236000 → 35874, pay10 500000 → 14530 are all
 *  round(amount × 2.9%) + 30¢. pay2 and pay8 are a flat 300. */
export function feeFor(method: Method, cents: number) {
  if (method === "card") return Math.round((cents * 29) / 1000) + 30;
  if (method === "ach") return 300;
  return 0;
}

/* --------------------------- card on file --------------------------- */

export type CardOnFile = {
  brand: string;
  last4: string;
  /** true when this customer's card has already been declined on a real
   *  payment in the ledger — taking a payment on it fails again. */
  declines: boolean;
  declineReason?: string;
  failedAt?: string;
};

/** Four digits that never change between runs. Only used for customers whose
 *  card has never been charged in the fixtures — the moment a real payment
 *  exists we read the digits off it instead. */
function stableDigits(seed: string) {
  let h = 7;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 10000;
  return String(h).padStart(4, "0");
}

export function cardOnFile(db: DB, customerId: string): CardOnFile {
  const jobIds = db.jobs.filter((j) => j.customerId === customerId).map((j) => j.id);
  const failed = db.payments.find(
    (p) => p.method === "card" && p.state === "failed" && jobIds.includes(p.jobId),
  );
  if (failed) {
    const m = /ending (\d{4})/.exec(failed.reference);
    return {
      brand: "Visa",
      last4: m ? m[1] : stableDigits(customerId),
      declines: true,
      declineReason: "do not honor",
      failedAt: failed.at,
    };
  }
  const digits = stableDigits(customerId);
  return { brand: Number(digits[0]) % 2 === 0 ? "Visa" : "Mastercard", last4: digits, declines: false };
}

/* ----------------------------- invoices ----------------------------- */

export const KIND_LABEL: Record<Invoice["kind"], string> = {
  deposit: "Deposit",
  progress: "Progress",
  final: "Final",
};

export const STATE_LABEL: Record<Invoice["state"], string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  partial: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
};

export function stateTone(state: Invoice["state"]) {
  if (state === "overdue") return "danger" as const;
  if (state === "paid") return "success" as const;
  if (state === "partial") return "warning" as const;
  if (state === "viewed") return "info" as const;
  return "neutral" as const;
}

export function outstandingOf(i: Invoice) {
  return i.amountCents - i.paidCents;
}

export function isOpen(i: Invoice) {
  return i.state !== "paid" && outstandingOf(i) > 0;
}

/** Whole days past the due date, measured on calendar days like a human
 *  reads a statement — not on fractional hours. */
export function daysOverdue(i: Invoice) {
  return Math.max(0, -dayOffsetOf(i.dueAt));
}

export function daysUntilDue(i: Invoice) {
  return dayOffsetOf(i.dueAt);
}

/* ------------------------------ groups ------------------------------ */

export type Group = { key: string; title: string; note?: string; invoices: Invoice[] };

/** Outstanding money, grouped by the state that decides what you do about it. */
export function openGroups(invoices: Invoice[]): Group[] {
  const open = invoices.filter(isOpen);
  const overdue = open.filter((i) => i.state === "overdue" || daysOverdue(i) > 0);
  const rest = open.filter((i) => !overdue.includes(i));
  const soon = rest.filter((i) => i.state !== "draft" && daysUntilDue(i) <= 7);
  const later = rest.filter((i) => i.state !== "draft" && daysUntilDue(i) > 7);
  const draft = rest.filter((i) => i.state === "draft");
  const by = (a: Invoice, b: Invoice) => a.dueAt.localeCompare(b.dueAt);
  return [
    { key: "overdue", title: "Overdue", note: "Past the date on the invoice", invoices: overdue.sort(by) },
    { key: "soon", title: "Due this week", invoices: soon.sort(by) },
    { key: "later", title: "Open", invoices: later.sort(by) },
    { key: "draft", title: "Not sent yet", note: "Drafts — the customer has never seen these", invoices: draft.sort(by) },
  ].filter((g) => g.invoices.length > 0);
}

/** Collected money, newest month first. */
export function paidGroups(db: DB): Group[] {
  const paid = db.invoices.filter((i) => i.state === "paid" || outstandingOf(i) <= 0);
  const buckets = new Map<string, Invoice[]>();
  for (const i of paid) {
    const at = lastPaymentAt(db, i) ?? i.issuedAt;
    const d = new Date(at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = buckets.get(key) ?? [];
    list.push(i);
    buckets.set(key, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => {
      const d = new Date(`${key}-02T12:00:00Z`);
      return {
        key,
        title: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
        note: undefined,
        invoices: list.sort((a, b) => (lastPaymentAt(db, b) ?? "").localeCompare(lastPaymentAt(db, a) ?? "")),
      };
    });
}

export function lastPaymentAt(db: DB, invoice: Invoice) {
  const settled = db.payments
    .filter((p) => p.invoiceId === invoice.id && p.state === "settled")
    .sort((a, b) => a.at.localeCompare(b.at));
  return settled[settled.length - 1]?.at ?? null;
}

export function paymentsFor(db: DB, invoiceId: string): Payment[] {
  return db.payments
    .filter((p) => p.invoiceId === invoiceId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/* ---------------------------- the headline ---------------------------- */

export type Headline = {
  outstanding: number;
  openCount: number;
  overdueCents: number;
  overdueCount: number;
  collectedThisMonth: number;
  collectedCount: number;
  avgDaysToCollect: number | null;
  collectedSample: number;
  inFlight: number;
};

export function headline(db: DB): Headline {
  const open = db.invoices.filter(isOpen);
  const overdue = open.filter((i) => daysOverdue(i) > 0);
  const monthStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const settled = db.payments.filter((p) => p.state === "settled");
  const thisMonth = settled.filter((p) => new Date(p.at) >= monthStart);

  /* how long invoices actually take to get paid: issue date → the day the
     last settled payment landed, on the invoices that are fully collected */
  const spans: number[] = [];
  for (const i of db.invoices) {
    if (i.paidCents < i.amountCents) continue;
    const at = lastPaymentAt(db, i);
    if (!at) continue;
    spans.push(Math.max(0, dayOffsetOf(at) - dayOffsetOf(i.issuedAt)));
  }

  return {
    outstanding: open.reduce((s, i) => s + outstandingOf(i), 0),
    openCount: open.length,
    overdueCents: overdue.reduce((s, i) => s + outstandingOf(i), 0),
    overdueCount: overdue.length,
    collectedThisMonth: thisMonth.reduce((s, p) => s + p.amountCents, 0),
    collectedCount: thisMonth.length,
    avgDaysToCollect: spans.length ? Math.round(spans.reduce((s, n) => s + n, 0) / spans.length) : null,
    collectedSample: spans.length,
    inFlight: db.payments.filter((p) => p.state === "pending").reduce((s, p) => s + p.amountCents, 0),
  };
}

/* ---------------------------- attention ---------------------------- */

export type Attention = {
  key: string;
  invoice: Invoice;
  job: Job;
  kind: "failed" | "overdue" | "deposit";
  headlineText: string;
  reason: string;
  /** what this is costing on the ground, when it is costing something */
  consequence?: string;
};

/** One entry per invoice — the same $6,513.90 never appears twice under two
 *  different headings. The reason is whichever fact is most actionable, and
 *  the consequence carries the rest. */
export function attention(db: DB): Attention[] {
  const out: Attention[] = [];
  const seen = new Set<string>();

  const blockedStart = (jobId: string) =>
    db.appointments
      .filter((a) => a.jobId === jobId && new Date(a.startAt) > NOW && a.state !== "confirmed")
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0] ?? null;

  const push = (inv: Invoice, kind: Attention["kind"], headlineText: string, reason: string, consequence?: string) => {
    if (seen.has(inv.id)) return;
    seen.add(inv.id);
    const job = db.jobs.find((j) => j.id === inv.jobId)!;
    out.push({ key: inv.id, invoice: inv, job, kind, headlineText, reason, consequence });
  };

  /* 1 — a payment that was attempted and did not go through */
  for (const p of db.payments) {
    if (p.state !== "failed") continue;
    const inv = db.invoices.find((i) => i.id === p.invoiceId);
    if (!inv || !isOpen(inv)) continue;
    const appt = blockedStart(inv.jobId);
    push(
      inv,
      "failed",
      `${KIND_LABEL[inv.kind]} payment failed`,
      p.reference,
      appt
        ? `Crew pencilled in ${new Date(appt.startAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/Los_Angeles" })} — the start does not go firm until this clears`
        : undefined,
    );
  }

  /* 2 — past the date on the invoice */
  for (const inv of db.invoices) {
    if (!isOpen(inv)) continue;
    const d = daysOverdue(inv);
    if (d <= 0) continue;
    push(inv, "overdue", `${d} days overdue`, `Due ${new Date(inv.dueAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Los_Angeles" })} · sent ${-dayOffsetOf(inv.issuedAt)} days ago`);
  }

  /* 3 — a deposit that is holding a booked crew */
  for (const inv of db.invoices) {
    if (!isOpen(inv) || inv.kind !== "deposit") continue;
    const appt = blockedStart(inv.jobId);
    if (!appt) continue;
    push(
      inv,
      "deposit",
      "Deposit due before the start",
      `Due ${new Date(inv.dueAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Los_Angeles" })}`,
      `Crew pencilled in ${new Date(appt.startAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/Los_Angeles" })}`,
    );
  }

  const rank: Record<Attention["kind"], number> = { failed: 0, deposit: 1, overdue: 2 };
  return out.sort(
    (a, b) => rank[a.kind] - rank[b.kind] || outstandingOf(b.invoice) - outstandingOf(a.invoice),
  );
}

/* ----------------------------- estimates ----------------------------- */

export type Waiting = {
  estimate: Estimate;
  job: Job;
  sentDays: number;
  viewedDays: number | null;
  expiresDays: number | null;
  valueCents: number;
};

/** Estimates a customer has and has not decided on, longest wait first.
 *  This is the leak: nothing is wrong with these, they are just sitting. */
export function waitingEstimates(db: DB): Waiting[] {
  return db.estimates
    .filter((e) => e.status === "sent" || e.status === "viewed")
    .map((e) => ({
      estimate: e,
      job: db.jobs.find((j) => j.id === e.jobId)!,
      sentDays: -dayOffsetOf(e.sentAt ?? e.createdAt),
      viewedDays: e.viewedAt ? -dayOffsetOf(e.viewedAt) : null,
      expiresDays: e.expiresAt ? dayOffsetOf(e.expiresAt) : null,
      valueCents: estimateTotals(e).subtotal,
    }))
    .sort((a, b) => b.sentDays - a.sentDays);
}

/* ---------------------------- writes ---------------------------- */

export type PaymentSpec = {
  invoiceId: string;
  amountCents: number;
  method: Method;
  reference: string;
  feeCents: number;
  /** card and bank money is authorised now and lands in a day or two; a
   *  check or cash already in your hand has settled. */
  state: Payment["state"];
};

/** The one place money is applied to the ledger. Used by the take-payment
 *  flow and by the "Mark paid" swipe, so both leave the database in exactly
 *  the same shape. Mutates the draft copy `commit()` hands us. */
export function recordPayment(d: DB, spec: PaymentSpec) {
  const inv = d.invoices.find((i) => i.id === spec.invoiceId)!;
  inv.paidCents += spec.amountCents;
  inv.state = inv.paidCents >= inv.amountCents ? "paid" : "partial";

  d.payments.push({
    id: `pay-${d.payments.length + 1}`,
    invoiceId: inv.id,
    jobId: inv.jobId,
    amountCents: spec.amountCents,
    method: spec.method,
    at: NOW.toISOString(),
    reference: spec.reference,
    feeCents: spec.feeCents,
    state: spec.state,
  });

  const job = d.jobs.find((x) => x.id === inv.jobId)!;
  const jobInvoices = d.invoices.filter((i) => i.jobId === job.id);
  const billed = jobInvoices.reduce((s, i) => s + i.amountCents, 0);
  const collected = jobInvoices.reduce((s, i) => s + i.paidCents, 0);
  job.payment = collected >= billed ? "paid"
    : inv.kind === "deposit" && inv.paidCents >= inv.amountCents ? "deposit_paid"
      : "partially_paid";

  /* a deposit that has cleared stops holding the crew */
  if (job.blocker?.kind === "awaiting_deposit") {
    const customer = d.customers.find((c) => c.id === job.customerId);
    job.blocker = null;
    job.nextAction = {
      label: `Confirm the start date with ${customer?.name.split(" ")[0] ?? "the customer"}`,
      dueAt: NOW.toISOString(),
      ownerId: job.ownerId,
    };
  }
  return inv;
}

/* --------------------------- the document --------------------------- */

export type DocLine = { label: string; note?: string; cents: number };

export type InvoiceDoc = {
  lines: DocLine[];
  subtotal: number;
  taxCents: number;
  total: number;
  paidCents: number;
  balance: number;
  contractCents: number;
  billedCents: number;
  estimate: Estimate | null;
  scope: DocLine[];
  scopeMore: number;
};

/** Snohomish County WA combined sales tax, in basis points. Contract prices
 *  are quoted tax-inclusive, so tax is extracted from the invoiced total
 *  rather than added to it — which is why the document always foots. */
const TAX_BP = 1040;

export function buildDoc(db: DB, invoice: Invoice): InvoiceDoc {
  const job = db.jobs.find((j) => j.id === invoice.jobId)!;
  const estimate = db.estimates.filter((e) => e.jobId === job.id).slice(-1)[0] ?? null;
  const taxCents = Math.round((invoice.amountCents * TAX_BP) / (10000 + TAX_BP));
  const subtotal = invoice.amountCents - taxCents;

  const issued = new Date(invoice.issuedAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", timeZone: "America/Los_Angeles",
  });

  const lines: DocLine[] = [];
  if (invoice.kind === "deposit") {
    const pct = estimate ? estimate.depositPct : Math.round((invoice.amountCents * 100) / job.valueCents);
    lines.push({
      label: `Deposit at signing — ${pct}% of contract`,
      note: estimate ? `Accepted ${estimate.number} v${estimate.version}` : job.scopeSummary,
      cents: subtotal,
    });
  } else if (invoice.kind === "progress") {
    lines.push({
      label: `Work completed through ${issued}`,
      note: job.scopeSummary,
      cents: subtotal,
    });
  } else {
    lines.push({
      label: "Final balance — contract complete",
      note: job.scopeSummary,
      cents: subtotal,
    });
  }

  const scope: DocLine[] = estimate
    ? estimate.items
      .filter((i) => !i.optional)
      .slice(0, 3)
      .map((i) => ({
        label: i.description,
        note: `${i.qty.toLocaleString("en-US")} ${i.unit}`,
        cents: Math.round(i.qty * i.unitPriceCents),
      }))
    : [];

  return {
    lines,
    subtotal,
    taxCents,
    total: invoice.amountCents,
    paidCents: invoice.paidCents,
    balance: outstandingOf(invoice),
    contractCents: job.valueCents,
    billedCents: db.invoices.filter((i) => i.jobId === job.id).reduce((s, i) => s + i.amountCents, 0),
    estimate,
    scope,
    scopeMore: estimate ? Math.max(0, estimate.items.filter((i) => !i.optional).length - scope.length) : 0,
  };
}
