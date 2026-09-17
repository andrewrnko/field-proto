/* Inbox derivations.
 *
 * The domain model carries a boolean (`Thread.needsReply`) and free text. A
 * founder standing on a porch needs the *sentence*: what is this person
 * actually asking for. Everything below turns fixture text into that sentence,
 * by rule — never by hardcoding a thread id, so new fixtures read correctly on
 * their own.
 *
 * Nothing here calls Date.now() or Math.random(): every label is a pure
 * function of the message text and the frozen clock. */
import type { DB, Message, Thread } from "../../data/types";
import type { IconName } from "../../ui/Icon";

export type AskKind =
  | "reschedule" | "eta" | "estimate" | "payment" | "change_order" | "trade"
  | "access" | "approval" | "warranty" | "photos" | "question" | "reply";

export type Ask = { kind: AskKind; label: string; quote: string | null; subject?: string };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TRADES = ["plumber", "electrician", "subcontractor", "inspector", "framer", "painter", "roofer"];

function tradeIn(text: string) {
  return TRADES.find((t) => new RegExp(`\\b${t}`, "i").test(text)) ?? null;
}

function weekdayIn(text: string) {
  return DAYS.find((d) => new RegExp(`\\b${d}`, "i").test(text)) ?? null;
}

/** the day a founder would counter-offer with: the one after the day they named */
function nextDay(day: string | null) {
  if (!day) return "Friday";
  const i = DAYS.indexOf(day);
  return DAYS[(i + 1) % 7] === "Sunday" ? "Monday" : DAYS[(i + 1) % 7];
}

type Rule = { kind: AskKind; test: RegExp; label: (text: string) => string };

/* Order is the priority order: a message about moving a change-order signing
   is a change order question first, a scheduling question second. */
const RULES: Rule[] = [
  {
    kind: "change_order",
    test: /\b(change order|extra work|additional (work|damage)|more damage|new damage|out of scope)\b/i,
    label: () => "Asking about the change order",
  },
  {
    kind: "reschedule",
    test: /\b(reschedul\w*|move (it|the|that|thursday|friday|monday|tuesday|wednesday)|push (it|this|the)|another day|different day|later in the week|start a day|come (out )?(on )?(a )?(different|another))\b/i,
    label: (t) => {
      const d = weekdayIn(t);
      return d ? `Asking to move ${d}'s start` : "Asking to move the schedule";
    },
  },
  {
    kind: "trade",
    test: /\b(plumber|electrician|subcontractor|inspector|framer|painter|roofer)\b/i,
    label: (t) => `Asking about the ${tradeIn(t) ?? "sub"}`,
  },
  {
    kind: "eta",
    test: /\b(what time|when (are|will|do|does|is)|eta|on your way|how long|still coming|running late|be here|come by|stop by|swing by|coming (by|out))\b/i,
    label: (t) => (/\b(come by|stop by|swing by|coming (by|out))\b/i.test(t)
      ? "Asking if you're still coming by"
      : "Asking when the crew arrives"),
  },
  {
    kind: "estimate",
    test: /\b(estimate|quote|bid|proposal|how much|ballpark|price|pricing|cost)\b/i,
    label: () => "Asking about the estimate",
  },
  {
    kind: "payment",
    test: /\b(deposit|invoice|pay|paid|payment|card|check|balance|bill|financ\w*)\b/i,
    label: () => "Asking about payment",
  },
  {
    kind: "access",
    test: /\b(gate|key|lockbox|lock|door code|access|tenant|crawl hatch|be home|won'?t be home|dogs?)\b/i,
    label: () => "Asking about getting in",
  },
  {
    kind: "approval",
    test: /\b(go ahead|approved?|sign|proceed|book it|let'?s do it|green light|ready to start)\b/i,
    label: () => "Ready to go ahead",
  },
  {
    kind: "warranty",
    test: /\b(warranty|still covered|came back|happening again|same spot)\b/i,
    label: () => "Asking if this is under warranty",
  },
  {
    kind: "photos",
    test: /\b(photos?|pictures?|pics?|attached|sending you|sent you)\b/i,
    label: () => "Sent photos to look at",
  },
];

function sentences(text: string) {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

/** The one sentence that carries the ask — what we pull out and quote. */
function askSentence(text: string): string | null {
  const ss = sentences(text);
  for (const r of RULES) {
    const hit = ss.find((s) => r.test.test(s));
    if (hit) return hit;
  }
  return ss.length ? ss[ss.length - 1] : null;
}

/** Plain-language read of one message: "Asking to move Thursday's start". */
export function askFromMessage(m: Message): Ask {
  const source = m.channel === "call" ? (m.callSummary ?? m.body) : m.body;
  for (const r of RULES) {
    if (r.test.test(source)) {
      return {
        kind: r.kind, label: r.label(source), quote: askSentence(source),
        subject: tradeIn(source) ?? undefined,
      };
    }
  }
  if (m.attachmentPhotoIds?.length) {
    return { kind: "photos", label: "Sent photos to look at", quote: askSentence(source) };
  }
  if (/\?\s*$/.test(source.trim()) || /\?/.test(source)) {
    return { kind: "question", label: "Waiting on an answer", quote: askSentence(source) };
  }
  return { kind: "reply", label: "Waiting on a reply", quote: askSentence(source) };
}

/** The ask that makes a thread need a reply: the newest inbound message.
 *
 * "One question about the subfloor line, I will call you" names no subject on
 * its own. When the message alone is mute, the subject is whatever this thread
 * has been about — but the sentence we quote back is always the customer's
 * latest, never an older one. */
export function askForThread(msgs: Message[]): Ask | null {
  const inbound = [...msgs].reverse().find((m) => m.direction === "in");
  if (!inbound) return null;
  const direct = askFromMessage(inbound);
  if (direct.kind !== "question" && direct.kind !== "reply") return direct;

  const context = msgs.map((m) => `${m.body} ${m.callSummary ?? ""}`).join(" ");
  for (const r of RULES) {
    if (r.test.test(context)) {
      return {
        kind: r.kind, label: r.label(context), quote: direct.quote,
        subject: tradeIn(context) ?? undefined,
      };
    }
  }
  return direct;
}

/* ------------------------- quick replies ------------------------- *
 * Three, derived from what was actually asked. They fill the composer;
 * nothing is ever sent from a chip. */
export function quickReplies(ask: Ask | null, firstName: string): string[] {
  const kind = ask?.kind ?? "reply";
  const alt = nextDay(ask ? weekdayIn(ask.quote ?? ask.label) : null);
  switch (kind) {
    case "reschedule":
      return [`${alt} works — I'll move the crew`, `Can we do ${alt} instead?`, "Let me check and call you back"];
    case "eta":
      return ["On our way", "Crew is 30 minutes out", "I can swing by this morning"];
    case "estimate":
      return ["Sending the estimate today", "Want me to walk you through it?", "That price holds 30 days"];
    case "payment":
      return ["Sending the deposit link now", "I'll email the invoice today", "Check or card both work"];
    case "change_order":
      return ["Sending the change order to sign", "Nothing moves until you approve", "It adds two days"];
    case "trade": {
      const trade = ask?.subject ?? "sub";
      return [`The ${trade} is booked`, `Calling the ${trade} now`, "I'll confirm and text you"];
    }
    case "access":
      return ["We'll use the side gate", "Text me the code", "Nobody needs to be home"];
    case "approval":
      return ["Great — getting you scheduled", "Sending the deposit link now", "I'll confirm the start date"];
    case "warranty":
      return ["That's covered — we'll look", "Someone can come this week", "Can you send a photo?"];
    case "photos":
      return ["Got the photos, thanks", "That's what I expected", "I'll price it and send it"];
    default:
      return [`Thanks ${firstName}`, "I'll call you in 10", "Sending that over today"];
  }
}

/** The next action a call turns into, phrased the way a founder would write it. */
export function taskLabelFor(ask: Ask | null, firstName: string) {
  switch (ask?.kind) {
    case "reschedule": return `Confirm the new start date with ${firstName}`;
    case "eta": return `Confirm arrival time with ${firstName}`;
    case "estimate": return `Send ${firstName} the estimate`;
    case "payment": return `Sort out payment with ${firstName}`;
    case "change_order": return `Get the change order approved by ${firstName}`;
    case "trade": return `Chase the ${ask?.subject ?? "sub"} for ${firstName}`;
    case "access": return `Confirm access with ${firstName}`;
    case "approval": return `Get ${firstName} on the schedule`;
    case "warranty": return `Book a warranty look for ${firstName}`;
    case "photos": return `Review the photos ${firstName} sent`;
    default: return `Call ${firstName} back`;
  }
}

/* --------------------------- messages ---------------------------- */

export function threadMessages(db: DB, threadId: string) {
  return db.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.at.localeCompare(b.at));
}

export function lastMessage(db: DB, threadId: string): Message | null {
  const m = threadMessages(db, threadId);
  return m.length ? m[m.length - 1] : null;
}

/** One line for a list row. Outbound is prefixed so you can see who spoke last. */
export function previewOf(m: Message | null): string {
  if (!m) return "No messages yet";
  if (m.channel === "call") {
    const who = m.direction === "in" ? "Incoming call" : "Outgoing call";
    const secs = m.callSeconds ?? 0;
    return `${who} · ${duration(secs)}${m.callSummary ? ` · ${m.callSummary}` : ""}`;
  }
  const body = m.body.replace(/\s+/g, " ").trim();
  const photos = m.attachmentPhotoIds?.length ?? 0;
  const text = body || (photos ? `${photos} photo${photos > 1 ? "s" : ""}` : "");
  return m.direction === "out" ? `You: ${text}` : text;
}

export function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export const CHANNEL_ICON: Record<Message["channel"], IconName> = {
  sms: "message",
  call: "phone",
  email: "inbox",
};

export const CHANNEL_LABEL: Record<Message["channel"], string> = {
  sms: "Text",
  call: "Call",
  email: "Email",
};

/* --------------------------- delivery ---------------------------- *
 * The model has no delivery column, and inventing one in the fixtures is not
 * ours to do. What the fixtures *do* carry is proof of a dead cell: photos
 * captured on this phone that are still sitting on it, unsynced. If the device
 * could not push a photo at 6:52 this morning, it did not push a text at 6:50
 * either — so an outbound message sent inside that window, with no read
 * receipt, is still queued. Anything the customer has already read obviously
 * arrived, and is never shown as queued. */
function noSignalWindow(db: DB): [number, number] | null {
  const stuck = db.photos.filter((p) => p.syncState !== "synced");
  if (!stuck.length) return null;
  const ts = stuck.map((p) => new Date(p.capturedAt).getTime());
  return [Math.min(...ts), Math.max(...ts)];
}

export function queuedMessageId(db: DB, thread: Thread): string | null {
  const window = noSignalWindow(db);
  if (!window) return null;
  const msgs = threadMessages(db, thread.id);
  const last = msgs[msgs.length - 1];
  if (!last || last.direction !== "out" || last.channel === "call" || last.readAt) return null;
  const sent = new Date(last.at).getTime();
  return sent >= window[0] && sent <= window[1] ? last.id : null;
}

/** The newest call in a thread — what the Calls lens shows instead of a text. */
export function lastCall(db: DB, threadId: string): Message | null {
  const calls = threadMessages(db, threadId).filter((m) => m.channel === "call");
  return calls.length ? calls[calls.length - 1] : null;
}

/* ---------------------------- sorting ---------------------------- */

/** Needs-reply first, then newest. Used for every lens so counts and order agree. */
export function sortThreads(a: Thread, b: Thread) {
  if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1;
  return b.lastAt.localeCompare(a.lastAt);
}

export function hasCall(db: DB, threadId: string) {
  return db.messages.some((m) => m.threadId === threadId && m.channel === "call");
}
