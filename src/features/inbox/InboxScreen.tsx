/* Inbox — every customer conversation, tied to the job it belongs to.
 *
 * The lens that matters is "Needs reply", so it is the default and it opens
 * with the *ask* spelled out — "Asking to move Thursday's start" — not a blue
 * dot. A founder reading this in a truck should be able to decide whether to
 * stop driving without opening anything.
 *
 * Counts on the segmented control are computed from the same predicate that
 * builds the list, search included, so the number and the rows can never
 * disagree. */
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import {
  Button, EmptyState, Pressable, Segmented, Skeleton, SwipeRow, Toggle, useToast,
} from "../../ui/primitives";
import { SheetHead, Tag } from "../../ui/domain";
import { Obj } from "../../ui/Obj";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { phone, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import type { Thread } from "../../data/types";
import {
  askForThread, hasCall, lastCall, lastMessage, previewOf,
  queuedMessageId, sortThreads, threadMessages,
} from "./threads";
import { setOffline, useOutbox } from "./outbox";
import { ThreadScreen } from "./ThreadScreen";
import "./inbox.css";

type Lens = "needs" | "all" | "calls";
type Status = "ready" | "loading" | "failed";

export function InboxScreen() {
  const { db, commit } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const { present } = useSheets();
  const toast = useToast();
  const outbox = useOutbox();

  const [lens, setLens] = useState<Lens>("needs");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<Status>("ready");
  const inputRef = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query);

  /* one predicate, used for both the rows and the counts */
  const searched = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    if (!q) return db.threads;
    return db.threads.filter((t) => {
      const customer = e.customer(t.customerId);
      const job = t.jobId ? e.job(t.jobId) : null;
      const bodies = threadMessages(db, t.id).map((m) => `${m.body} ${m.callSummary ?? ""}`).join(" ");
      return [customer.name, job?.title ?? "", bodies].join(" ").toLowerCase().includes(q);
    });
  }, [db, deferred, e]);

  const buckets = useMemo(() => ({
    needs: searched.filter((t) => t.needsReply),
    all: searched,
    calls: searched.filter((t) => hasCall(db, t.id)),
  }), [searched, db]);

  const rows = useMemo(() => [...buckets[lens]].sort(sortThreads), [buckets, lens]);

  const queuedCount = useMemo(
    () => db.threads.filter((t) => queuedMessageId(db, t)).length + outbox.queued.length,
    [db, outbox.queued.length],
  );

  const openThread = (t: Thread) =>
    push(`thread-${t.id}`, () => <ThreadScreen threadId={t.id} />);

  const markRead = (t: Thread) =>
    commit((d) => {
      const th = d.threads.find((x) => x.id === t.id);
      if (th) th.unread = 0;
      d.messages.forEach((m) => {
        if (m.threadId === t.id && m.direction === "in" && !m.readAt) m.readAt = NOW.toISOString();
      });
      return d;
    }, { latencyMs: 240 });

  const refresh = async () => {
    setStatus("loading");
    await new Promise((r) => setTimeout(r, 850));
    setStatus(outbox.offline ? "failed" : "ready");
  };

  const filtering = deferred.trim().length > 0;
  const unread = db.threads.reduce((n, t) => n + t.unread, 0);

  return (
    <Screen
      title="Inbox"
      onRefresh={refresh}
      subtitle={
        buckets.needs.length > 0
          ? `${buckets.needs.length} waiting on you · ${unread} unread`
          : `Nothing waiting on you · ${unread} unread`
      }
      actions={
        <>
          <Pressable
            className="round round-plain" style={{ width: 36, height: 36 }}
            aria-label="Search conversations" data-shot="search-inbox"
            onClick={() => { setSearching((s) => !s); setTimeout(() => inputRef.current?.focus(), 60); }}
          >
            <Icon name="search" size={21} />
          </Pressable>
          <Pressable
            className="round round-plain" style={{ width: 36, height: 36 }}
            aria-label="Inbox actions" data-shot="inbox-actions"
            onClick={() => present((api) => (
              <InboxActions api={api} onMarkAll={async () => {
                await commit((d) => {
                  d.threads.forEach((t) => { t.unread = 0; });
                  d.messages.forEach((m) => { if (m.direction === "in" && !m.readAt) m.readAt = NOW.toISOString(); });
                  return d;
                });
                toast({ text: "All conversations marked read", tone: "success" });
              }} />
            ), { detents: ["auto"] })}
          >
            <Icon name="moreVert" size={20} />
            {outbox.offline && <span className="dot-mark" aria-hidden />}
          </Pressable>
        </>
      }
      headerExtra={
        <div className="stack gap-2">
          <AnimatePresence initial={false}>
            {searching && (
              <motion.div
                className="searchbar"
                initial={{ height: 0, opacity: 0 }} animate={{ height: 40, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={SPRING.sheet}
              >
                <Icon name="search" size={17} className="dimmer" />
                <input
                  ref={inputRef} value={query} placeholder="Customer, job, what was said"
                  onChange={(ev) => setQuery(ev.target.value)}
                  aria-label="Search conversations"
                />
                {query && (
                  <Pressable className="round round-plain" style={{ width: 26, height: 26 }} aria-label="Clear search" onClick={() => setQuery("")}>
                    <Icon name="close" size={14} strokeWidth={2.4} />
                  </Pressable>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <Segmented
            value={lens} onChange={setLens}
            options={[
              { value: "needs", label: "Needs reply", count: buckets.needs.length },
              { value: "all", label: "All", count: buckets.all.length },
              { value: "calls", label: "Calls", count: buckets.calls.length },
            ]}
          />
        </div>
      }
    >
      {outbox.offline && (
        <div className="notice inbox-offline">
          <Icon name="alert" size={17} />
          <span className="grow t-body">
            Working offline.{" "}
            {queuedCount === 0
              ? "Nothing is waiting to send."
              : `${queuedCount} message${queuedCount > 1 ? "s" : ""} waiting to send.`}
          </span>
          <Button size="sm" variant="secondary" onClick={() => { setOffline(false); setStatus("ready"); toast({ text: "Back online", tone: "success" }); }}>
            Go online
          </Button>
        </div>
      )}

      {status === "loading" ? (
        <ThreadSkeleton />
      ) : status === "failed" ? (
        <div className="card">
          <EmptyState
            icon={<span className="inbox-glyph is-bad"><Icon name="alert" size={22} /></span>}
            title="Couldn't load messages"
            body="This phone has no connection right now. Nothing new can land here until it does."
            action={<Button variant="secondary" icon="refresh" onClick={refresh}>Retry</Button>}
          />
        </div>
      ) : rows.length === 0 ? (
        filtering ? (
          <div className="card">
            <EmptyState
              title="No conversations match this search"
              body={`Nothing in this lens mentions "${deferred.trim()}".`}
              action={<Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
            />
          </div>
        ) : lens === "needs" ? (
          <div className="card">
            <EmptyState
              icon={
                <motion.span className="inbox-glyph is-good" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={SPRING.pop}>
                  <Icon name="check" size={22} strokeWidth={2.2} />
                </motion.span>
              }
              title="No threads need a reply"
              body="Every customer who asked you something has an answer from someone here."
              action={<Button variant="secondary" onClick={() => setLens("all")}>See all conversations</Button>}
            />
          </div>
        ) : lens === "calls" ? (
          <div className="card">
            <EmptyState
              icon={<span className="inbox-glyph"><Icon name="phone" size={22} /></span>}
              title="No calls yet"
              body="Calls logged from this phone show up here with the summary and what was asked."
            />
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<span className="inbox-glyph"><Icon name="inbox" size={22} /></span>}
              title="No messages yet"
              body="Texts, calls and email from customers land here against the job they belong to."
              action={<Button icon="message" onClick={() => toast({ text: "Start a thread from the job record" })}>Start a thread</Button>}
            />
          </div>
        )
      ) : (
        <div className="thr-list">
          {rows.map((t) => (
            <ThreadRow
              key={t.id}
              thread={t}
              lens={lens}
              onOpen={() => openThread(t)}
              onMarkRead={() => { markRead(t); toast({ text: `${e.customer(t.customerId).name} marked read` }); }}
              onCall={() => toast({ text: `Calling ${phone(e.customer(t.customerId).phone)}` })}
            />
          ))}
        </div>
      )}

      {status === "ready" && rows.length > 0 && (
        <p className="t-meta updated">
          {rows.length} of {db.threads.length} conversations · {queuedCount > 0 ? `${queuedCount} waiting to send` : "everything sent"}
        </p>
      )}
    </Screen>
  );
}

/* ------------------------------- row ------------------------------- */

function ThreadRow({
  thread, lens, onOpen, onMarkRead, onCall,
}: { thread: Thread; lens: Lens; onOpen: () => void; onMarkRead: () => void; onCall: () => void }) {
  const { db } = useDB();
  const e = useEntities();
  const customer = e.customer(thread.customerId);
  const job = thread.jobId ? e.job(thread.jobId) : null;
  const msgs = threadMessages(db, thread.id);
  const last = lastMessage(db, thread.id);
  /* the Calls lens is a call log: it shows the call, not the text that followed it */
  const shown = (lens === "calls" ? lastCall(db, thread.id) : null) ?? last;
  const ask = thread.needsReply ? askForThread(msgs) : null;
  const queued = queuedMessageId(db, thread) !== null;

  return (
    <SwipeRow
      actions={[
        { label: "Mark read", icon: "check", onAction: onMarkRead },
        { label: "Call back", icon: "phone", tone: "success", onAction: onCall },
      ]}
    >
      <Pressable className="thr-row" onClick={onOpen} data-shot={thread.needsReply ? "thread-needs-reply" : "thread-open"}>
        <Obj
          name={(shown?.channel ?? thread.channel) === "call" ? "tools" : (shown?.channel ?? thread.channel) === "email" ? "docs" : "bubble"}
          hue={(shown?.channel ?? thread.channel) === "call" ? "blue" : (shown?.channel ?? thread.channel) === "email" ? "pink" : "violet"}
          size={44}
        />
        <span className="grow thr-body">
          <span className="thr-top">
            {thread.unread > 0 && <span className="thr-dot" aria-hidden />}
            <span className="thr-name truncate grow">{customer.name}</span>
            <span className="thr-time">{relative(thread.lastAt, NOW)}</span>
          </span>
          <span className="thr-preview">
            {(shown?.channel ?? thread.channel) === "call" && <Icon name="phone" size={15} strokeWidth={2} />}
            <span className="truncate">{previewOf(shown)}</span>
          </span>
          {ask
            ? <span className="thr-tag"><Tag hue="amber" icon="message">{ask.label}</Tag></span>
            : <span className="thr-job truncate">{job ? job.title : "Not linked to a job"}</span>}
          {queued && (
            <span className="thr-queued">
              <Icon name="refresh" size={14} strokeWidth={2.1} /> Queued — no signal
            </span>
          )}
        </span>
      </Pressable>
    </SwipeRow>
  );
}

/* ---------------------------- skeleton ----------------------------- */

function ThreadSkeleton() {
  return (
    <div className="thr-list" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="thr-row">
          <Skeleton w={34} h={34} r={12} />
          <span className="grow thr-body">
            <span className="hrow"><Skeleton w={132} h={15} /><span className="grow" /><Skeleton w={34} h={11} /></span>
            <Skeleton w={96} h={11} />
            <Skeleton w="88%" h={13} />
          </span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- action sheet -------------------------- */

function InboxActions({ api, onMarkAll }: { api: SheetApi; onMarkAll: () => Promise<void> }) {
  const outbox = useOutbox();
  return (
    <>
      <SheetHead api={api} title="Inbox" subtitle="Everything customers sent you" icon="inbox" />
      <div className="sheet-body stack gap-3">
        <div className="list">
          <Pressable className="row" onClick={() => { void onMarkAll(); api.close(); }}>
            <span className="row-lead action-icon"><Icon name="check" size={19} /></span>
            <span className="row-body">
              <span className="t-row">Mark everything read</span>
              <span className="t-meta">Clears the badge. It does not answer anyone.</span>
            </span>
          </Pressable>
          <div className="row">
            <span className="row-lead action-icon"><Icon name="alert" size={19} /></span>
            <span className="row-body">
              <span className="t-row">Work offline</span>
              <span className="t-meta">
                {outbox.offline
                  ? "Sends are held on this phone until signal comes back."
                  : "Turn on in a crawl space. Sends queue instead of failing."}
              </span>
            </span>
            <Toggle checked={outbox.offline} onChange={setOffline} label="Work offline" />
          </div>
        </div>
        {outbox.offline && (
          <div className="notice">
            <Icon name="refresh" size={17} />
            <span className="grow t-body">Anything you send now says “Queued — no signal” until you go back online.</span>
          </div>
        )}
      </div>
    </>
  );
}
