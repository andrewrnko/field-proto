/* One conversation.
 *
 * A text is a bubble. A call is not — it is a record with a duration, a
 * summary and an ask, and the only thing that matters about it is whether the
 * ask became work. So calls render as a card with "Turn into a task", which
 * writes a real next action onto the job.
 *
 * The screen stays mounted while the photo viewer or the job record is on top
 * of it, so scroll position comes back exactly where it was. */
import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Button, Pressable, useToast } from "../../ui/primitives";
import { StageChip, useConfirm } from "../../ui/domain";
import { PhotoViewer } from "../../ui/PhotoViewer";
import { useSheets } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW, dayOffsetOf, onDay } from "../../data/clock";
import { dateLabel, dayName, phone, time } from "../../lib/format";
import { SPRING, FADE } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { Message, Photo } from "../../data/types";
import { JobDetail } from "../jobs/JobDetail";
import {
  CHANNEL_LABEL, askFromMessage, askForThread, duration, quickReplies,
  queuedMessageId, taskLabelFor, threadMessages,
} from "./threads";
import { nextMessageId, queueMessage, unqueueMessage, useOutbox } from "./outbox";
import { TemplatesSheet } from "./TemplatesSheet";
import "./inbox.css";

type Delivery = "sending" | "delivered" | "queued" | "read";
type Entry =
  | { kind: "call"; id: string; msg: Message }
  | { kind: "run"; id: string; direction: "in" | "out"; msgs: Message[] };
type DayGroup = { key: string; iso: string; entries: Entry[] };

export function ThreadScreen({ threadId }: { threadId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const { present } = useSheets();
  const toast = useToast();
  const confirm = useConfirm();
  const outbox = useOutbox();

  const thread = db.threads.find((t) => t.id === threadId)!;
  const customer = e.customer(thread.customerId);
  const job = thread.jobId ? e.job(thread.jobId) : null;
  const property = job ? e.property(job.propertyId) : e.property(customer.propertyIds[0]);
  const msgs = useMemo(() => threadMessages(db, threadId), [db, threadId]);
  const firstName = customer.name.split(/\s+/)[0];

  const [draft, setDraft] = useState("");
  const [delivery, setDelivery] = useState<Record<string, Delivery>>({});
  const [fresh, setFresh] = useState<string[]>([]);
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [taskBusy, setTaskBusy] = useState<string | null>(null);

  const paneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const marked = useRef(false);

  const scroller = useCallback(
    () => (paneRef.current?.closest(".screen-scroll") as HTMLElement | null),
    [],
  );
  const toBottom = useCallback((smooth = true) => {
    const s = scroller();
    if (!s) return;
    requestAnimationFrame(() => s.scrollTo({ top: s.scrollHeight, behavior: smooth ? "smooth" : "auto" }));
  }, [scroller]);

  /* open on the newest message, the way every messaging app does */
  useLayoutEffect(() => {
    const s = scroller();
    if (s) s.scrollTop = s.scrollHeight;
  }, [scroller]);

  /* reading a thread is what marks it read — once, on open */
  useEffect(() => {
    if (marked.current || thread.unread === 0) return;
    marked.current = true;
    void commit((d) => {
      const t = d.threads.find((x) => x.id === threadId);
      if (t) t.unread = 0;
      d.messages.forEach((m) => {
        if (m.threadId === threadId && m.direction === "in" && !m.readAt) m.readAt = NOW.toISOString();
      });
      return d;
    }, { latencyMs: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fixtureQueued = queuedMessageId(db, thread);
  const lastOutbound = [...msgs].reverse().find((m) => m.direction === "out" && m.channel !== "call");

  const deliveryOf = (m: Message): Delivery => {
    const local = delivery[m.id];
    if (local) return local;
    if (m.id === fixtureQueued) return "queued";
    return m.readAt ? "read" : "delivered";
  };

  const days = useMemo(() => groupByDay(msgs), [msgs]);
  const attachments = useMemo(
    () => msgs.flatMap((m) => (m.attachmentPhotoIds ?? []))
      .map((id) => db.photos.find((p) => p.id === id))
      .filter((p): p is Photo => Boolean(p)),
    [msgs, db.photos],
  );

  const ask = askForThread(msgs);
  const replies = quickReplies(ask, firstName);

  /* ------------------------------ send ----------------------------- */

  const send = useCallback(async (text: string) => {
    const body = text.trim();
    if (!body) return;
    const id = nextMessageId(threadId);
    const atIso = NOW.toISOString();
    haptic("light");
    setDraft("");
    setFresh((f) => [...f, id]);
    setDelivery((d) => ({ ...d, [id]: "sending" }));
    toBottom();

    const ok = await commit((d) => {
      d.messages.push({
        id, threadId, direction: "out",
        channel: thread.channel === "call" ? "sms" : thread.channel,
        body, at: atIso,
      });
      const t = d.threads.find((x) => x.id === threadId);
      if (t) { t.lastAt = atIso; t.unread = 0; t.needsReply = false; }
      return d;
    }, { latencyMs: outbox.offline ? 320 : 620 });

    if (!ok) {
      toast({ text: "Couldn't send. Retry.", tone: "danger" });
      return;
    }
    if (outbox.offline) {
      queueMessage(id);
      setDelivery((d) => ({ ...d, [id]: "queued" }));
    } else {
      setDelivery((d) => ({ ...d, [id]: "delivered" }));
      haptic("success");
    }
    toBottom();
  }, [commit, outbox.offline, thread.channel, threadId, toast, toBottom]);

  const retry = async (m: Message) => {
    if (outbox.offline) {
      toast({ text: "Still no signal. It goes out the moment you have one." });
      return;
    }
    setDelivery((d) => ({ ...d, [m.id]: "sending" }));
    const ok = await commit((d) => {
      const t = d.threads.find((x) => x.id === threadId);
      if (t) t.lastAt = m.at;
      return d;
    }, { latencyMs: 560 });
    if (!ok) { setDelivery((d) => ({ ...d, [m.id]: "queued" })); return; }
    unqueueMessage(m.id);
    setDelivery((d) => ({ ...d, [m.id]: "delivered" }));
    haptic("success");
  };

  /* --------------------------- call → task ------------------------- */

  const makeTask = async (m: Message) => {
    if (!job) { toast({ text: "Link this thread to a job first" }); return; }
    const label = taskLabelFor(askFromMessage(m), firstName);
    const apply = async () => {
      setTaskBusy(m.id);
      const ok = await commit((d) => {
        const j = d.jobs.find((x) => x.id === job.id);
        if (j) j.nextAction = { label, dueAt: onDay(0, 17, 0), ownerId: d.me };
        d.activity.push({
          id: `act-call-${m.id}`, jobId: job.id, at: NOW.toISOString(), actorId: d.me,
          kind: "note", text: `Next action from a call with ${customer.name}: ${label}`,
          meta: `Call · ${duration(m.callSeconds ?? 0)}`,
        });
        return d;
      });
      setTaskBusy(null);
      toast(ok
        ? { text: `Task added to ${firstName}'s job`, tone: "success" }
        : { text: "Couldn't save. Retry.", tone: "danger" });
    };
    if (job.nextAction) {
      confirm({
        title: "Replace the next action?",
        body: `${job.title} already has “${job.nextAction.label}”. Making a task from this call replaces it with “${label}”.`,
        confirmLabel: "Replace it",
        icon: "alert",
        onConfirm: apply,
      });
    } else {
      await apply();
    }
  };

  const openJob = () => { if (job) push(`job-${job.id}`, () => <JobDetail jobId={job.id} />); };

  return (
    <Screen
      title={customer.name}
      subtitle={`${CHANNEL_LABEL[thread.channel]} · ${phone(customer.phone)}`}
      back
      backLabel="Inbox"
      actions={
        <Pressable
          className="round round-plain" style={{ width: 36, height: 36 }}
          aria-label={`Call ${customer.name}`}
          onClick={() => toast({ text: `Calling ${phone(customer.phone)}` })}
        >
          <Icon name="phone" size={20} />
        </Pressable>
      }
      headerExtra={
        <div className="thr-context">
          <div className="thr-context-top">
            <span className="t-row truncate grow">{job ? job.title : "Not linked to a job"}</span>
            {job && <StageChip stage={job.stage} />}
          </div>
          <div className="thr-context-bot">
            <span className="t-meta truncate grow">
              {property ? `${property.address}, ${property.city}` : customer.name}
            </span>
            {job && (
              <Button size="sm" variant="secondary" iconAfter="chevron" onClick={openJob} data-shot="open-job">
                Open job
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="thread-pane" ref={paneRef}>
        <div className="thread-log">
          {msgs.length === 0 && (
            <p className="t-body dim thread-none">No messages in this thread yet.</p>
          )}
          {days.map((day) => (
            <div className="thread-day" key={day.key}>
              <div className="day-divider"><span className="t-meta">{dayLabel(day.iso)}</span></div>
              {day.entries.map((entry) => entry.kind === "call" ? (
                <CallCard
                  key={entry.id}
                  msg={entry.msg}
                  canTask={Boolean(job)}
                  busy={taskBusy === entry.msg.id}
                  onTask={() => void makeTask(entry.msg)}
                />
              ) : (
                <Run
                  key={entry.id}
                  entry={entry}
                  fresh={fresh}
                  photosFor={(m) => (m.attachmentPhotoIds ?? [])
                    .map((id) => db.photos.find((p) => p.id === id))
                    .filter((p): p is Photo => Boolean(p))}
                  onPhoto={(p) => setViewer({ photos: attachments, index: Math.max(0, attachments.findIndex((x) => x.id === p.id)) })}
                  meta={(m) => {
                    const stamp = time(m.at);
                    if (m.direction === "in" || m.id !== lastOutbound?.id) return stamp;
                    const state = deliveryOf(m);
                    if (state === "sending") return "Sending…";
                    if (state === "queued") return `Queued — no signal · ${stamp}`;
                    if (state === "read") return `Read ${stamp}`;
                    return `Delivered ${stamp}`;
                  }}
                  retryFor={(m) =>
                    m.direction === "out" && deliveryOf(m) === "queued"
                      ? () => void retry(m)
                      : null}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="composer">
          <AnimatePresence initial={false}>
            {!draft.trim() && (
              <motion.div
                className="quick-row"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 38, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={FADE}
              >
                {replies.map((r) => (
                  <button
                    key={r} className="chip quick-chip"
                    onClick={() => { haptic("select"); setDraft(r); inputRef.current?.focus(); }}
                  >
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="composer-bar">
            <Pressable
              className="round round-tinted composer-round"
              aria-label="Templates and attachments" data-shot="templates"
              onClick={() => present((api) => (
                <TemplatesSheet
                  api={api}
                  threadId={threadId}
                  onInsert={(text) => { setDraft(text); setTimeout(() => inputRef.current?.focus(), 80); }}
                  onSend={send}
                />
              ), { detents: ["auto"] })}
            >
              <Icon name="plus" size={20} />
            </Pressable>

            <div className="composer-input">
              <Growing
                ref={inputRef}
                value={draft}
                onChange={setDraft}
                onGrow={() => toBottom(false)}
                placeholder={`Message ${firstName}`}
              />
            </div>

            <Pressable
              className="composer-round composer-send"
              aria-label="Send message" data-shot="send"
              disabled={!draft.trim()}
              feedback={null}
              onClick={() => void send(draft)}
            >
              <Icon name="send" size={19} />
            </Pressable>
          </div>
          {outbox.offline && (
            <p className="t-meta composer-note">No signal. Anything you send waits on this phone.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {viewer && (
          <PhotoViewer
            photos={viewer.photos} index={viewer.index}
            by={(id) => e.person(id)}
            onClose={() => setViewer(null)}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}

/* ------------------------------ runs ------------------------------ */

function Run({
  entry, fresh, photosFor, onPhoto, meta, retryFor,
}: {
  entry: Extract<Entry, { kind: "run" }>;
  fresh: string[];
  photosFor: (m: Message) => Photo[];
  onPhoto: (p: Photo) => void;
  meta: (m: Message) => string;
  retryFor: (m: Message) => (() => void) | null;
}) {
  const last = entry.msgs[entry.msgs.length - 1];
  const retry = retryFor(last);
  return (
    <div className={`msg-run is-${entry.direction}${retry ? " is-waiting" : ""}`}>
      {entry.msgs.map((m) => {
        const photos = photosFor(m);
        const isNew = fresh.includes(m.id);
        return (
          <motion.div
            key={m.id}
            className="msg-line"
            initial={isNew ? { opacity: 0, scale: 0.9, y: 10 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={SPRING.pop}
          >
            {photos.length > 0 && (
              <div className="bubble-photos">
                {photos.map((p) => (
                  <Pressable
                    key={p.id} className="msg-photo" aria-label={p.caption ?? "Photo"}
                    onClick={() => onPhoto(p)}
                  >
                    <img src={`${import.meta.env.BASE_URL}photos/${p.seed}.jpg`} alt={p.caption ?? ""} width={132} height={132} loading="lazy" />
                  </Pressable>
                ))}
              </div>
            )}
            {m.body.trim().length > 0 && <div className="bubble">{m.body}</div>}
          </motion.div>
        );
      })}
      <span className={`msg-meta${retry ? " is-queued" : ""}`}>
        {meta(last)}
        {retry && <button className="msg-retry" onClick={retry}>Retry</button>}
      </span>
    </div>
  );
}

/* ------------------------------ call ------------------------------ */

function CallCard({
  msg, canTask, busy, onTask,
}: { msg: Message; canTask: boolean; busy: boolean; onTask: () => void }) {
  const ask = askFromMessage(msg);
  const incoming = msg.direction === "in";
  return (
    <div className="call-card">
      <div className="call-head">
        <span className={`call-glyph${incoming ? " is-in" : ""}`} aria-hidden>
          <Icon name="phone" size={18} />
        </span>
        <span className="grow">
          <span className="t-row block">{incoming ? "Incoming call" : "Outgoing call"}</span>
          <span className="t-meta">{duration(msg.callSeconds ?? 0)} · {time(msg.at)}</span>
        </span>
      </div>
      {msg.callSummary && <p className="t-body call-summary">{msg.callSummary}</p>}
      {ask.quote && (
        <blockquote className="call-ask">
          <span className="t-meta block">{ask.label}</span>
          <span className="t-body">“{ask.quote}”</span>
        </blockquote>
      )}
      <Button
        size="sm" variant="secondary" icon="plus" full
        pending={busy} disabled={!canTask}
        onClick={onTask} data-shot="call-task"
      >
        {canTask ? "Turn into a task" : "No job linked"}
      </Button>
    </div>
  );
}

/* ---------------------------- composer ---------------------------- */

const MAX_LINES = 5;
const LINE = 21;

function Growing({
  ref, value, onChange, onGrow, placeholder,
}: {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
  onGrow: () => void;
  placeholder: string;
}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const before = el.style.height;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE)}px`;
    /* the field eats the bottom of the log as it grows — follow it down so the
       newest message never disappears behind the composer */
    if (before !== el.style.height) onGrow();
  }, [value, ref, onGrow]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className="composer-text"
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(ev) => onChange(ev.target.value)}
    />
  );
}

/* ---------------------------- grouping ---------------------------- */

function groupByDay(msgs: Message[]): DayGroup[] {
  const out: DayGroup[] = [];
  let group: DayGroup | null = null;
  let run: Extract<Entry, { kind: "run" }> | null = null;

  for (const m of msgs) {
    const key = new Date(m.at).toDateString();
    if (!group || group.key !== key) {
      group = { key, iso: m.at, entries: [] };
      out.push(group);
      run = null;
    }
    if (m.channel === "call") {
      group.entries.push({ kind: "call", id: m.id, msg: m });
      run = null;
      continue;
    }
    const prev = run?.msgs[run.msgs.length - 1];
    const gap = prev ? new Date(m.at).getTime() - new Date(prev.at).getTime() : Infinity;
    if (!run || run.direction !== m.direction || gap > 20 * 60000) {
      run = { kind: "run", id: m.id, direction: m.direction, msgs: [m] };
      group.entries.push(run);
    } else {
      run.msgs.push(m);
    }
  }
  return out;
}

function dayLabel(iso: string) {
  const off = dayOffsetOf(iso);
  if (off === 0) return "Today";
  if (off === -1) return "Yesterday";
  if (off > -7) return dayName(iso, "long");
  return `${dayName(iso)}, ${dateLabel(iso)}`;
}
