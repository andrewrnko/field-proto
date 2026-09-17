/* Domain model.
 *
 * Deliberate separations the design system calls out (§8): stage, next action,
 * blocker, payment state and schedule state are five different fields. One
 * "status" string must never stand in for all of them.
 *
 * Money is always integer cents. Timestamps are ISO strings in the business
 * timezone (America/Los_Angeles). */

export type ID = string;

export type Stage =
  | "new_lead" | "qualifying" | "inspection_booked" | "inspection_done"
  | "estimate_draft" | "estimate_sent" | "approved" | "scheduled"
  | "in_progress" | "punch_list" | "complete" | "warranty" | "lost";

export const STAGE_LABEL: Record<Stage, string> = {
  new_lead: "New lead",
  qualifying: "Qualifying",
  inspection_booked: "Inspection booked",
  inspection_done: "Inspection done",
  estimate_draft: "Estimate draft",
  estimate_sent: "Estimate sent",
  approved: "Approved",
  scheduled: "Scheduled",
  in_progress: "In progress",
  punch_list: "Punch list",
  complete: "Complete",
  warranty: "Warranty",
  lost: "Lost",
};

/** Stages that mean "this is still a sales opportunity", not production work. */
export const LEAD_STAGES: Stage[] = [
  "new_lead", "qualifying", "inspection_booked", "inspection_done",
  "estimate_draft", "estimate_sent",
];

export type BlockerKind =
  | "awaiting_customer" | "awaiting_deposit" | "awaiting_materials"
  | "awaiting_access" | "weather" | "crew_short" | "permit" | "none";

export type Blocker = {
  kind: BlockerKind;
  label: string;
  since: string;
  owner?: ID;
};

export type PaymentState = "none" | "deposit_due" | "deposit_paid" | "invoiced" | "partially_paid" | "paid" | "overdue";
export type ScheduleState = "unscheduled" | "tentative" | "confirmed" | "in_progress" | "done";

export type Person = {
  id: ID;
  name: string;
  role: "owner" | "estimator" | "lead_carpenter" | "carpenter" | "coordinator" | "sub";
  phone?: string;
  avatarTone: number;
  /** crew colour used on the schedule */
  initialsOnly?: boolean;
};

export type Customer = {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  since: string;
  preferredContact: "call" | "text" | "email";
  notes?: string;
  propertyIds: ID[];
};

export type Property = {
  id: ID;
  customerId: ID;
  address: string;
  city: string;
  zip: string;
  yearBuilt?: number;
  accessNotes?: string;
  /** crawl space, deck, siding … the part of the envelope we work on */
  structures: string[];
  photo?: string;
  /** where it actually is — drive times, the board, and the map all read this */
  lat?: number;
  lng?: number;
};

export type Severity = "monitor" | "active" | "structural";

export type Finding = {
  id: ID;
  jobId: ID;
  /** where on the property — "NE crawl space, bay 4" */
  location: string;
  title: string;
  severity: Severity;
  moisturePct?: number;
  /** what the crew measured, free text: "3 joists soft to 14in" */
  measurement?: string;
  note?: string;
  photoIds: ID[];
  discoveredAt: string;
  discoveredBy: ID;
  /** true when the finding was not in the original scope */
  isNewDamage: boolean;
  changeOrderId?: ID;
};

export type Photo = {
  id: ID;
  jobId: ID;
  findingId?: ID;
  /** deterministic generated artwork — see photos.ts */
  seed: string;
  kind: "crawl" | "deck" | "siding" | "framing" | "moisture" | "repair" | "site";
  caption?: string;
  capturedAt: string;
  uploadedAt?: string;
  by: ID;
  /** field reality: a photo can be taken offline and still be queued */
  syncState: "synced" | "queued" | "failed";
  /** flagged for the content team — this business runs on its own jobsite footage */
  forReel?: boolean;
};

export type LineItem = {
  id: ID;
  description: string;   // customer-facing
  internalNote?: string; // never printed on the customer document
  qty: number;
  unit: "ea" | "lf" | "sf" | "hr" | "day" | "ls";
  unitPriceCents: number;
  unitCostCents: number;
  taxable: boolean;
  optional?: boolean;
};

export type EstimateStatus = "draft" | "sent" | "viewed" | "approved" | "declined" | "expired";

export type Estimate = {
  id: ID;
  jobId: ID;
  number: string;
  version: number;
  status: EstimateStatus;
  items: LineItem[];
  depositPct: number;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  decidedAt?: string;
  decidedVia?: "signature" | "email_reply" | "verbal_logged";
  expiresAt?: string;
  note?: string;
};

export type ChangeOrder = {
  id: ID;
  jobId: ID;
  number: string;
  reason: string;
  findingIds: ID[];
  items: LineItem[];
  status: "draft" | "sent" | "approved" | "declined" | "expired";
  scheduleImpactDays: number;
  createdAt: string;
  sentAt?: string;
  decidedAt?: string;
  approvedVersion?: number;
};

/** What the job actually is. The founders sell four different businesses and
 *  only one of them has to be the one they push. */
export type WorkType = "crawl" | "deck" | "siding" | "water";

export const WORK_LABEL: Record<WorkType, string> = {
  crawl: "Crawl space", deck: "Decks", siding: "Siding & envelope", water: "Water damage",
};

export type Job = {
  id: ID;
  customerId: ID;
  propertyId: ID;
  title: string;
  stage: Stage;
  ownerId: ID | null;           // null renders as "Unassigned", never auto-filled
  blocker: Blocker | null;
  payment: PaymentState;
  schedule: ScheduleState;
  nextAction: { label: string; dueAt: string; ownerId: ID | null } | null;
  scopeSummary: string;
  valueCents: number;
  costToDateCents?: number;
  workType: WorkType;
  source: "referral" | "google" | "repeat" | "yard_sign" | "insurance" | "nextdoor";
  createdAt: string;
  crewIds: ID[];
  tags?: string[];
  warrantyUntil?: string;
};

export type Appointment = {
  id: ID;
  jobId: ID;
  kind: "inspection" | "work" | "walkthrough" | "punch" | "delivery";
  startAt: string;
  endAt: string;
  crewIds: ID[];
  state: ScheduleState;
  travelMinutes?: number;
  note?: string;
};

export type Invoice = {
  id: ID;
  jobId: ID;
  number: string;
  kind: "deposit" | "progress" | "final";
  amountCents: number;
  issuedAt: string;
  dueAt: string;
  paidCents: number;
  state: "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue";
};

export type Payment = {
  id: ID;
  invoiceId: ID;
  jobId: ID;
  amountCents: number;
  method: "card" | "ach" | "check" | "cash";
  at: string;
  reference: string;
  feeCents: number;
  state: "pending" | "settled" | "failed";
};

export type Message = {
  id: ID;
  threadId: ID;
  direction: "in" | "out";
  channel: "sms" | "call" | "email";
  body: string;
  at: string;
  /** for calls: transcript highlights and the ask we detected */
  callSeconds?: number;
  callSummary?: string;
  attachmentPhotoIds?: ID[];
  readAt?: string;
};

export type Thread = {
  id: ID;
  customerId: ID;
  jobId?: ID;
  channel: "sms" | "call" | "email";
  unread: number;
  lastAt: string;
  needsReply: boolean;
};

export type Activity = {
  id: ID;
  jobId: ID;
  at: string;
  actorId: ID | "system" | "customer";
  kind: "stage" | "note" | "photo" | "estimate" | "change_order" | "payment" | "schedule" | "message" | "finding";
  text: string;
  meta?: string;
};

/* ------------------------------------------------------------------ *
 * Operating layer — the things that actually decide whether a rot job
 * makes money. Added after the first build, which modelled the sales
 * pipeline and stopped there.
 * ------------------------------------------------------------------ */

/** Labour, clocked on site. The only honest input to job cost. */
export type TimeEntry = {
  id: ID;
  jobId: ID;
  personId: ID;
  startAt: string;
  endAt: string | null;        // null = still clocked in
  /** what they were on, so a cost overrun can be explained */
  task: "demo" | "framing" | "barrier" | "siding" | "deck" | "punch" | "haul" | "drive";
  note?: string;
  /** captured where the phone was, not where the office assumed */
  onSite: boolean;
};

/** A material that has to arrive before work can continue. */
export type MaterialOrder = {
  id: ID;
  jobId: ID;
  item: string;
  qty: string;                 // "1 pc", "40 lf" — supplier language, kept verbatim
  supplier: string;
  state: "needed" | "ordered" | "will_call" | "delivered" | "backordered";
  neededBy: string;
  promisedAt?: string;
  pickedUpBy?: ID;
  costCents: number;
  note?: string;
};

/** A reason to come back: warranty, moisture re-check, or a review ask. */
export type Callback = {
  id: ID;
  jobId: ID;
  kind: "warranty" | "moisture_recheck" | "review_ask" | "punch";
  dueAt: string;
  doneAt?: string;
  note: string;
  /** moisture re-checks carry the reading they are measured against */
  baselinePct?: number;
  resultPct?: number;
};

/** Speed to lead: the clock a home-services business actually lives on. */
export type LeadResponse = {
  jobId: ID;
  firstTouchAt?: string;       // when someone actually reached the customer
  attempts: Array<{ at: string; by: ID; channel: "call" | "text"; outcome: "answered" | "voicemail" | "no_answer" | "booked" }>;
};

export const TASK_LABEL: Record<TimeEntry["task"], string> = {
  demo: "Demo", framing: "Framing", barrier: "Vapor barrier", siding: "Siding",
  deck: "Deck", punch: "Punch list", haul: "Haul-off", drive: "Drive time",
};

export const MATERIAL_STATE_LABEL: Record<MaterialOrder["state"], string> = {
  needed: "Not ordered", ordered: "Ordered", will_call: "Will call",
  delivered: "On site", backordered: "Backordered",
};

export const CALLBACK_LABEL: Record<Callback["kind"], string> = {
  warranty: "Warranty visit", moisture_recheck: "Moisture re-check",
  review_ask: "Ask for a review", punch: "Punch list",
};

/** Burned labour cost at a fixed blended rate — the number a founder can act on. */
export const LABOR_RATE_CENTS = 6800; // $68/hr fully burdened, fixture assumption

export function hoursOf(entry: TimeEntry, now: Date) {
  const end = entry.endAt ? new Date(entry.endAt) : now;
  return Math.max(0, (end.getTime() - new Date(entry.startAt).getTime()) / 36e5);
}

/** A published reel. Got Rot's pipeline runs on its own jobsite footage, so a
 *  reel is a business object: it came from a job, and it brings work back. */
export type Reel = {
  id: ID;
  title: string;
  format: string;
  jobId?: ID;
  photoSeed: string;
  publishedAt: string;
  views: number;
  saves: number;
  /** leads the office could actually attribute to it */
  leads: number;
  bookedCents: number;
};

export type DB = {
  now: string;
  me: ID;
  people: Person[];
  customers: Customer[];
  properties: Property[];
  jobs: Job[];
  findings: Finding[];
  photos: Photo[];
  estimates: Estimate[];
  changeOrders: ChangeOrder[];
  appointments: Appointment[];
  invoices: Invoice[];
  payments: Payment[];
  threads: Thread[];
  messages: Message[];
  activity: Activity[];
  time: TimeEntry[];
  materials: MaterialOrder[];
  callbacks: Callback[];
  leadResponse: LeadResponse[];
  reels: Reel[];
};

/* ---- derived helpers used across features ---- */

export function itemTotal(i: LineItem) { return Math.round(i.qty * i.unitPriceCents); }
export function itemCost(i: LineItem) { return Math.round(i.qty * i.unitCostCents); }

export function estimateTotals(e: { items: LineItem[]; depositPct?: number }) {
  const included = e.items.filter((i) => !i.optional);
  const subtotal = included.reduce((s, i) => s + itemTotal(i), 0);
  const cost = included.reduce((s, i) => s + itemCost(i), 0);
  const optional = e.items.filter((i) => i.optional).reduce((s, i) => s + itemTotal(i), 0);
  const margin = subtotal === 0 ? 0 : (subtotal - cost) / subtotal;
  const deposit = Math.round(subtotal * ((e.depositPct ?? 0) / 100));
  return { subtotal, cost, optional, margin, deposit };
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  monitor: "Monitor",
  active: "Active rot",
  structural: "Structural",
};
