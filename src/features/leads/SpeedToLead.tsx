/* Speed to lead — the clock at the top of Today.
 *
 * This is the only object on the screen allowed to sit above the hero, and it
 * earns that by being the only one that is actively losing money while it is
 * on screen. It shows one lead, one number and one action. The moment someone
 * reaches the customer it writes `firstTouchAt` and disappears for good. */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "../../ui/Icon";
import { Button, Pressable, Segmented, Skeleton, useToast } from "../../ui/primitives";
import { SheetHead, Tag } from "../../ui/domain";
import { Obj, type ObjName } from "../../ui/Obj";
import type { ObjHue } from "../../ui/Obj";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { SAVE_LABEL, useDB, useEntities, useSaver } from "../../data/store";
import { NOW, at } from "../../data/clock";
import { phone, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { Activity, DB } from "../../data/types";
import {
  OUTCOME_LABEL, TARGET_MIN, type Attempt, type LiveLead,
  fmtWait, liveLeads, responseOf, saidWait, scoreboard,
} from "./speed";
import "./leads.css";

/* ------------------------------ the clock ------------------------------ */

export function SpeedToLead() {
  const { db } = useDB();
  const leads = useMemo(() => liveLeads(db), [db]);
  if (leads.length === 0) return null;
  const [first, ...rest] = leads;
  return <LeadClock lead={first} rest={rest} />;
}

function LeadClock({ lead, rest }: { lead: LiveLead; rest: LiveLead[] }) {
  const e = useEntities();
  const { present } = useSheets();
  const customer = e.customer(lead.job.customerId);
  const property = e.property(lead.job.propertyId);
  const tries = lead.attempts.length;
  const lastTry = tries > 0 ? relative(lead.attempts[tries - 1].at, NOW) : "";

  const call = (l: LiveLead) =>
    present((api) => <CallSheet api={api} jobId={l.job.id} />, { detents: ["auto"] });

  return (
    <motion.section
      className="stl"
      data-shot="speed-lead"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.sheet}
      aria-label="Lead waiting for a first call"
    >
      <div className="stl-head">
        <span className="stl-live">
          <i aria-hidden />
          <span className="truncate">{tries === 0 ? "Not called yet" : `${tries} tries, no answer`}</span>
        </span>
        <Pressable
          className="stl-score" data-shot="speed-scoreboard"
          onClick={() => present((api) => <ScoreboardSheet api={api} />, { detents: ["auto", 0.92] })}
        >
          Response times
          <Icon name="chevron" size={15} strokeWidth={2.1} />
        </Pressable>
      </div>

      <p className="stl-clock t-num">
        {fmtWait(lead.waitMin)}
        <em>waiting</em>
      </p>

      <p className="stl-who">{customer.name} · {property.city}</p>
      <p className="stl-said">“{lead.job.scopeSummary}”</p>

      <Button size="lg" full icon="phone" data-shot="call-now" onClick={() => { haptic("medium"); call(lead); }}>
        Call now
      </Button>
      <p className="stl-target">
        {tries === 0
          ? `Came in ${relative(lead.job.createdAt, NOW)}. The target is a first call inside ${TARGET_MIN} minutes.`
          : `${lastTry === "now" ? "Just tried them" : `Last try ${lastTry}`}. The third attempt is where these get won.`}
      </p>

      {rest.map((l) => <OtherLead key={l.job.id} lead={l} onCall={() => call(l)} />)}
    </motion.section>
  );
}

function OtherLead({ lead, onCall }: { lead: LiveLead; onCall: () => void }) {
  const e = useEntities();
  const customer = e.customer(lead.job.customerId);
  return (
    <Pressable className="stl-other" onClick={onCall} scale={0.99}>
      <span className="grow">
        <b>{customer.name}</b> · {fmtWait(lead.waitMin)}
        {lead.attempts.length > 0 ? ` · ${lead.attempts.length} tries` : " · never dialled"}
      </span>
      <span className="stl-other-act">Call</span>
      <Icon name="chevron" size={16} className="dimmer" />
    </Pressable>
  );
}

/* ------------------------------- calling ------------------------------- */

function CallSheet({ api, jobId }: { api: SheetApi; jobId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const response = responseOf(db, jobId);
  const waitMin = (NOW.getTime() - new Date(job.createdAt).getTime()) / 6e4;

  const toOutcome = () => api.push((a) => <OutcomeStep api={a} jobId={jobId} />, { detents: ["auto"] });

  return (
    <>
      <SheetHead api={api} title={customer.name} subtitle={`New lead · waiting ${fmtWait(waitMin)}`} avatar={customer.name} />
      <div className="sheet-body">
        <div className="stl-dial">
          <Obj name="bell" hue="coral" size={44} />
          <span className="grow">
            <span className="stl-dial-num t-num">{phone(customer.phone)}</span>
            <span className="t-meta truncate">{property.address}, {property.city}</span>
          </span>
        </div>

        <div className="stl-ask">
          <p className="t-meta">What they asked for</p>
          <p className="t-body">{job.scopeSummary}</p>
          <p className="t-meta">
            Came in {relative(job.createdAt, NOW)} from {SOURCE_LABEL[job.source]} · prefers {customer.preferredContact}
          </p>
        </div>

        {response && response.attempts.length > 0 && (
          <div className="stl-tries">
            <p className="t-meta">Already tried</p>
            {response.attempts.map((a, i) => (
              <div key={i} className="stl-try">
                <span className="grow t-body">{OUTCOME_LABEL[a.outcome]} · {a.channel}</span>
                <span className="t-meta">{relative(a.at, NOW)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="sheet-foot">
        <Button size="lg" full icon="phone" data-shot="dial" onClick={() => { haptic("medium"); toOutcome(); }}>
          Call {phone(customer.phone)}
        </Button>
        <Button variant="quiet" full onClick={toOutcome} data-shot="log-call">Log a call I already made</Button>
      </div>
    </>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  referral: "a referral", google: "the website form", repeat: "a repeat customer",
  yard_sign: "a yard sign", insurance: "an insurance referral", nextdoor: "Nextdoor",
};

const OUTCOMES: Array<{
  value: Attempt["outcome"]; title: string; note: string; obj: ObjName; hue: ObjHue;
}> = [
  { value: "answered", title: "Answered", note: "The clock stops here.", obj: "check", hue: "emerald" },
  { value: "voicemail", title: "Voicemail", note: "Try again in 20 minutes.", obj: "bubble", hue: "violet" },
  { value: "no_answer", title: "No answer", note: "Try again in 20 minutes.", obj: "bell", hue: "slate" },
  { value: "booked", title: "Booked an inspection", note: "Moves the job forward.", obj: "calendar", hue: "coral" },
];

function OutcomeStep({ api, jobId }: { api: SheetApi; jobId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const saver = useSaver();
  const [chosen, setChosen] = useState<Attempt["outcome"] | null>(null);
  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const waitMin = (NOW.getTime() - new Date(job.createdAt).getTime()) / 6e4;

  const choose = async (outcome: Attempt["outcome"]) => {
    setChosen(outcome);
    haptic("medium");
    const ok = await saver.run(commit((d) => logOutcome(d, jobId, outcome, db.me, waitMin), { latencyMs: 520 }));
    if (!ok) { haptic("warning"); return; }
    haptic("success");
    toast({
      text: outcome === "booked"
        ? `Inspection booked for ${customer.name.split(" ")[0]}`
        : outcome === "answered"
          ? `Reached ${customer.name.split(" ")[0]} — clock stopped at ${fmtWait(waitMin)}`
          : `Logged. Trying ${customer.name.split(" ")[0]} again in 20 minutes.`,
      tone: "success",
    });
    api.close();
  };

  return (
    <>
      <SheetHead api={api} title="How did it go?" subtitle={`${customer.name} · waiting ${fmtWait(waitMin)}`} />
      <div className="sheet-body">
        <div className="stl-outcomes">
          {OUTCOMES.map((o) => (
            <Pressable
              key={o.value}
              className={`stl-outcome${chosen === o.value ? " is-on" : ""}`}
              disabled={saver.state === "saving"}
              data-shot={`outcome-${o.value}`}
              onClick={() => choose(o.value)}
            >
              <Obj name={o.obj} hue={o.hue} size={42} />
              <span className="grow">
                <span className="t-row block">{o.title}</span>
                <span className="t-meta block">{o.note}</span>
              </span>
              {chosen === o.value && saver.state === "saved" && <Icon name="check" size={20} strokeWidth={2.4} />}
            </Pressable>
          ))}
        </div>
      </div>
      <div className="sheet-foot">
        {saver.state === "error" ? (
          <Button full size="lg" variant="secondary" icon="refresh" onClick={() => chosen && choose(chosen)}>
            Couldn't save. Retry.
          </Button>
        ) : (
          <p className={`t-meta stl-save save-${saver.state}`}>
            {saver.state === "idle" ? "Nothing is logged until you pick one." : SAVE_LABEL[saver.state]}
          </p>
        )}
      </div>
    </>
  );
}

/** The one place lead state is written. Pure on the draft — no side effects. */
function logOutcome(d: DB, jobId: string, outcome: Attempt["outcome"], by: string, waitMin: number) {
  const job = d.jobs.find((j) => j.id === jobId);
  if (!job) return d;
  const customer = d.customers.find((c) => c.id === job.customerId);
  const first = customer?.name.split(" ")[0] ?? "them";
  const stamp = NOW.toISOString();

  let lr = d.leadResponse.find((r) => r.jobId === jobId);
  if (!lr) { lr = { jobId, attempts: [] }; d.leadResponse.push(lr); }
  lr.attempts.push({ at: stamp, by, channel: "call", outcome });
  const n = lr.attempts.length;

  const log = (kind: Activity["kind"], text: string, meta?: string) =>
    d.activity.push({ id: `act-lead-${jobId}-${n}`, jobId, at: stamp, actorId: by, kind, text, meta });

  if (outcome === "answered" || outcome === "booked") {
    lr.firstTouchAt ??= stamp;
  }

  if (outcome === "booked") {
    job.stage = "inspection_booked";
    job.schedule = "tentative";
    job.nextAction = { label: `Put ${first}'s inspection on the board`, dueAt: at({ h: 2 }), ownerId: by };
    log("stage", `Reached ${first} and booked an inspection`, `first contact after ${saidWait(waitMin)}`);
  } else if (outcome === "answered") {
    job.nextAction = { label: `Book ${first}'s inspection`, dueAt: at({ h: 4 }), ownerId: by };
    log("message", `Reached ${first} on the phone`, `first contact after ${saidWait(waitMin)}`);
  } else {
    job.nextAction = { label: `Try ${first} again`, dueAt: at({ m: 20 }), ownerId: by };
    log("message",
      outcome === "voicemail" ? `Left ${first} a voicemail` : `No answer from ${first}`,
      `attempt ${n} · retry in 20 minutes`);
  }
  return d;
}

/* ----------------------------- scoreboard ----------------------------- */

type Load = "loading" | "ready" | "error";
type Lens = "all" | "slow" | "waiting";

function ScoreboardSheet({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const e = useEntities();
  const s = useMemo(() => scoreboard(db), [db]);
  const [load, setLoad] = useState<Load>("loading");
  const [lens, setLens] = useState<Lens>("all");

  useEffect(() => {
    const t = window.setTimeout(() => setLoad(navigator.onLine === false ? "error" : "ready"), 420);
    return () => window.clearTimeout(t);
  }, []);

  const reload = () => {
    setLoad("loading");
    window.setTimeout(() => setLoad(navigator.onLine === false ? "error" : "ready"), 420);
  };

  const rows = lens === "slow" ? s.slow
    : lens === "waiting" ? s.samples.filter((x) => x.waiting)
      : s.samples;

  return (
    <>
      <SheetHead api={api} title="How fast we answer" subtitle={`${s.samples.length} leads we can measure`} />
      <div className="sheet-body scroll" data-sheet-scroll style={{ maxHeight: 560 }}>
        <div className="stl-board">
          <p className="t-figure">{s.medianMin == null ? "—" : fmtWait(s.medianMin)}</p>
          <p className="t-body dim">
            {s.medianMin == null
              ? "No lead has a usable first-contact time yet."
              : `Half of these leads waited longer than this before anyone reached them. The industry number that converts is ${TARGET_MIN} minutes.`}
          </p>
        </div>

        <div className="stl-stats">
          <div className="stl-stat">
            <p className="t-figure stl-stat-v">{s.fast.length}</p>
            <p className="t-meta">answered inside {TARGET_MIN} minutes</p>
          </div>
          <div className="stl-stat">
            <p className={`t-figure stl-stat-v${s.slow.length ? " tone-danger" : ""}`}>{s.slow.length}</p>
            <p className="t-meta">took over an hour</p>
          </div>
        </div>

        <div className="stl-lens">
          <Segmented
            size="sm"
            value={lens}
            onChange={setLens}
            options={[
              { value: "all", label: "All", count: s.samples.length },
              { value: "slow", label: "Over an hour", count: s.slow.length },
              { value: "waiting", label: "Still waiting", count: s.samples.filter((x) => x.waiting).length },
            ]}
          />
        </div>

        {load === "loading" ? (
          <div className="stl-rows">
            {[0, 1, 2].map((i) => (
              <div key={i} className="stl-row">
                <span className="grow stack gap-1">
                  <Skeleton w={140} h={16} />
                  <Skeleton w={96} h={12} />
                </span>
                <Skeleton w={54} h={16} />
              </div>
            ))}
          </div>
        ) : load === "error" ? (
          <div className="empty">
            <p className="t-section">Couldn't load response times</p>
            <p className="t-body dim">They're calculated on this device from the lead records. Try again.</p>
            <Button variant="secondary" icon="refresh" onClick={reload}>Retry</Button>
          </div>
        ) : s.samples.length === 0 ? (
          <div className="empty">
            <p className="t-section">No leads to measure yet</p>
            <p className="t-body dim">The first time someone logs a call, this starts keeping score.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <p className="t-section">No leads match this filter</p>
            <p className="t-body dim">
              {lens === "slow" ? "Nothing took over an hour." : "Every lead has been reached."}
            </p>
            <Button variant="secondary" onClick={() => { haptic("select"); setLens("all"); }}>Clear filters</Button>
          </div>
        ) : (
          <div className="stl-rows">
            {rows.map((row) => {
              const customer = e.customer(row.job.customerId);
              return (
                <div key={row.job.id} className="stl-row">
                  <span className="grow">
                    <span className="t-row block truncate">{customer.name}</span>
                    <span className="t-meta block truncate">
                      {row.waiting ? "still nobody has called" : `reached · ${OUTCOME_LABEL[row.outcome ?? "answered"].toLowerCase()}`}
                    </span>
                  </span>
                  {row.minutes <= TARGET_MIN
                    ? <Tag hue="emerald">{fmtWait(row.minutes)}</Tag>
                    : <span className={`stl-row-v t-num${row.minutes > 60 ? " tone-danger" : ""}`}>{fmtWait(row.minutes)}</span>}
                </div>
              );
            })}
          </div>
        )}

        {s.unusable > 0 && load === "ready" && (
          <p className="t-meta stl-note">
            {s.unusable} older lead{s.unusable === 1 ? " is" : "s are"} left out — the logged call is stamped before the
            lead itself, so there is no honest number to take from {s.unusable === 1 ? "it" : "them"}.
          </p>
        )}
      </div>
    </>
  );
}
