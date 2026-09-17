/* Now — the board.
 *
 * Rebuilt against the reference set: dense white cards on light grey, small
 * type, and measured objects rather than paragraphs. A founder gets the state
 * of the business in one screen — margin, money, who is on the ground, what is
 * stuck — and every card is a door. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "../../ui/Icon";
import { Avatar, Button, Pressable } from "../../ui/primitives";
import { BLOCKER_SHORT, photoSrc } from "../../ui/domain";
import { Obj, type ObjHue, type ObjName } from "../../ui/Obj";
import { Card, Chips, Gauge, Metric, Pill, Ring, RingStat, Stepper, Ticks, type Step } from "../../ui/kit";
import { SuccessMark } from "../../ui/Success";
import { useSheets } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { CONDITIONS } from "../../data/conditions";
import { compactMoney, money, relative, time } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { LABOR_RATE_CENTS, TASK_LABEL, estimateTotals, hoursOf, type Job } from "../../data/types";
import { useLens, LENS } from "../../shell/roles";
import { STALE_HOURS, blockingMaterials, dueCallbacks, jobCost } from "../jobs/costing";
import { JobDetail } from "../jobs/JobDetail";
import { PersonScreen } from "../people/PersonScreen";
import { MoneyScreen } from "../money/MoneyScreen";
import { MediaScreen } from "../media/MediaScreen";
import { SpeedToLead } from "../leads/SpeedToLead";
import { CloseOutLine } from "../closeout/CloseOutLine";
import { SettingsSheet } from "../settings/SettingsSheet";
import "./now.css";

type Focus = "today" | "money" | "crew" | "media";

export function NowScreen() {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const { present } = useSheets();
  const { lens, person } = useLens();
  const [focus, setFocus] = useState<Focus>(lens === "crew" ? "today" : lens === "media" ? "media" : "today");

  const hour = NOW.getHours();
  const sky = hour < 10 ? "dawn" : hour < 16 ? "day" : "dusk";
  const openJob = (j: Job) => push(`job-${j.id}`, () => <JobDetail jobId={j.id} />);

  /* ------------------------------ the numbers ------------------------------ */
  const board = useMemo(
    () => db.appointments
      .filter((a) => new Date(a.startAt).toDateString() === NOW.toDateString())
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [db.appointments],
  );
  const onClock = db.time.filter((t) => t.endAt === null && hoursOf(t, NOW) <= STALE_HOURS);
  const stale = db.time.filter((t) => t.endAt === null && hoursOf(t, NOW) > STALE_HOURS);

  const live = useMemo(() => db.jobs.filter((j) => j.stage === "in_progress" || j.stage === "punch_list"), [db.jobs]);
  const margin = useMemo(() => {
    let value = 0, spent = 0, priced = 0;
    for (const j of live) {
      const c = jobCost(db, j);
      value += j.valueCents;
      spent += c.spentCents;
      priced += c.budgetCents;
    }
    return {
      running: value > 0 ? Math.round(((value - spent) / value) * 100) : 0,
      pricedPct: value > 0 ? Math.round(((value - priced) / value) * 100) : 0,
      value, spent, priced,
    };
  }, [db, live]);

  const open = db.invoices.filter((i) => i.state !== "paid" && i.state !== "draft");
  const outstanding = open.reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
  const overdue = open.filter((i) => i.state === "overdue").reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
  const billed = db.invoices.reduce((s, i) => s + i.amountCents, 0);
  const collected = db.invoices.reduce((s, i) => s + i.paidCents, 0);
  const monthIn = db.payments
    .filter((p) => p.state === "settled" && new Date(p.at).getMonth() === NOW.getMonth())
    .reduce((s, p) => s + p.amountCents, 0);

  /* ------------------------------ the queue ------------------------------- */
  type Sig = { key: string; title: string; line: string; when?: string; obj: ObjName; hue: ObjHue; pill?: { text: string; hue: "amber" | "coral" | "blue" | "emerald" }; open: () => void };
  const signals: Sig[] = useMemo(() => {
    const out: Sig[] = [];
    for (const j of db.jobs) {
      if (j.nextAction && new Date(j.nextAction.dueAt) < NOW) {
        out.push({
          key: `l-${j.id}`, title: e.customer(j.customerId).name, line: j.nextAction.label,
          when: relative(j.nextAction.dueAt, NOW), obj: "bubble", hue: "coral",
          pill: { text: "Overdue", hue: "coral" }, open: () => openJob(j),
        });
      } else if (j.blocker) {
        out.push({
          key: `b-${j.id}`, title: e.customer(j.customerId).name, line: j.blocker.label,
          when: relative(j.blocker.since, NOW),
          obj: j.blocker.kind === "awaiting_deposit" ? "coins" : j.blocker.kind === "awaiting_materials" ? "beam" : "warning",
          hue: j.blocker.kind === "awaiting_deposit" ? "emerald" : "amber",
          pill: { text: BLOCKER_SHORT[j.blocker.kind] ?? "Blocked", hue: "amber" }, open: () => openJob(j),
        });
      }
    }
    for (const t of stale) {
      const who = e.person(t.personId);
      out.push({
        key: `s-${t.id}`, title: `${who?.name.split(" ")[0]} never clocked out`,
        line: `Open since ${time(t.startAt)} yesterday`, obj: "tools", hue: "slate",
        pill: { text: "Fix", hue: "amber" },
        open: () => push(`person-${t.personId}`, () => <PersonScreen personId={t.personId} />),
      });
    }
    for (const m of blockingMaterials(db).slice(0, 2)) {
      const j = e.job(m.jobId);
      out.push({
        key: `m-${m.id}`, title: m.item, line: `${e.customer(j.customerId).name.split(" ")[0]} · ${m.supplier.split(",")[0]}`,
        when: relative(m.neededBy, NOW), obj: "beam", hue: "amber",
        pill: { text: "Will call", hue: "amber" }, open: () => openJob(j),
      });
    }
    for (const c of dueCallbacks(db, 2)) {
      const j = e.job(c.jobId);
      out.push({
        key: `c-${c.id}`, title: e.customer(j.customerId).name, line: c.note,
        when: relative(c.dueAt, NOW),
        obj: c.kind === "moisture_recheck" ? "drop" : "bubble",
        hue: c.kind === "moisture_recheck" ? "cyan" : "violet",
        open: () => openJob(j),
      });
    }
    return out;
  }, [db, stale, e]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --------------------------- the live job today -------------------------- */
  const hot = useMemo(() => {
    if (lens === "crew") {
      const mine = board.find((a) => a.crewIds.includes(person.id));
      return mine ? e.job(mine.jobId) : null;
    }
    const scored = db.jobs.map((j) => {
      let s = 0;
      if (j.blocker?.kind === "awaiting_deposit") s += 900;
      if (j.nextAction && new Date(j.nextAction.dueAt) < NOW) s += 700;
      if (j.blocker) s += 400;
      return { j, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    return scored[0]?.j ?? null;
  }, [db.jobs, board, lens, person.id, e]);

  const daySteps: Step[] = useMemo(() => {
    const a = board[0];
    if (!a) return [];
    const rows: Step[] = board.map((ap) => {
      const j = e.job(ap.jobId);
      const started = new Date(ap.startAt) <= NOW;
      const ended = new Date(ap.endAt) < NOW;
      const here = onClock.some((t) => t.jobId === j.id);
      return {
        at: time(ap.startAt).replace(/\s?(am|pm)/, ""),
        title: e.customer(j.customerId).name,
        note: `${e.property(j.propertyId).city} · ${ap.crewIds.map((id) => e.person(id)?.name.split(" ")[0]).filter(Boolean).join(", ") || "unassigned"}`,
        state: ended ? "done" : here || started ? "live" : "todo",
        pill: here ? { text: "On site", hue: "emerald" as const } : ap.state === "tentative" ? { text: "Tentative", hue: "amber" as const } : undefined,
      };
    });
    return rows;
  }, [board, onClock, e]);

  const crewRows = useMemo(() => db.people
    .filter((p) => p.role !== "coordinator")
    .map((p) => {
      const openEntry = onClock.find((t) => t.personId === p.id);
      const today = db.time
        .filter((t) => t.personId === p.id && new Date(t.startAt).toDateString() === NOW.toDateString())
        .filter((t) => hoursOf(t, NOW) <= STALE_HOURS)
        .reduce((s, t) => s + hoursOf(t, NOW), 0);
      return { p, openEntry, today };
    })
    .sort((a, b) => (b.openEntry ? 1 : 0) - (a.openEntry ? 1 : 0) || b.today - a.today), [db.people, db.time, onClock]);

  const marked = db.photos.filter((p) => p.forReel).length;
  const topReel = [...db.reels].sort((a, b) => b.leads - a.leads)[0];

  return (
    <div className="now" style={{ ["--sky-now" as string]: `var(--sky-${sky})` }}>
      <div className="scroll now-scroll">
        {/* ------------------------------- header ------------------------------ */}
        <header className="nb-top">
          <Pressable
            className="nb-me" aria-label="You and your settings" data-shot="account"
            onClick={() => present((api) => <SettingsSheet api={api} />, { detents: ["auto"] })}
          >
            <Avatar name={person.name} size={38} tone={person.avatarTone} />
            <span>
              <span className="nb-hello">{hour < 11 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"}, {person.name.split(" ")[0]}</span>
              <span className="nb-date">
                {NOW.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles" })} · {time(NOW.toISOString())} · {CONDITIONS.tempF}°
              </span>
            </span>
          </Pressable>
        </header>

        <div className="nb-chips">
          <Chips
            value={focus} onChange={(v) => { haptic("select"); setFocus(v); }}
            options={[
              { value: "today", label: "Today", icon: "today" },
              { value: "money", label: "Money", icon: "money" },
              { value: "crew", label: "Crew", icon: "users" },
              { value: "media", label: "Media", icon: "camera" },
            ]}
          />
        </div>

        {(lens === "estimator" || lens === "coordinator") && <SpeedToLead />}

        {/* ------------------------------- today ------------------------------- */}
        {focus === "today" && (
          <div className="nb-stack">
            {hot ? <HotCard job={hot} onOpen={() => openJob(hot)} lens={lens} /> : (
              <Card className="nb-clear">
                <SuccessMark size={72} />
                <p className="nb-clear-title">Nothing is stuck</p>
                <p className="nb-clear-note">No overdue follow-up, no blocked crew.</p>
              </Card>
            )}

            <Card title="The day" action={<Pill hue="blue">{board.length} stops</Pill>}>
              {daySteps.length > 0
                ? <Stepper steps={daySteps} />
                : <p className="nb-empty">Nothing booked today.</p>}
              <div className="nb-weather">
                <Icon name="weather" size={15} />
                {CONDITIONS.summary} · {CONDITIONS.impact}
              </div>
            </Card>

            {signals.length > 0 && (
              <Card title="Needs you" action={<Pill hue="coral">{signals.length}</Pill>} pad={false}>
                <div className="nb-list">
                  {signals.slice(0, 5).map((s, i) => (
                    <motion.div key={s.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.snap, delay: i * 0.02 }}>
                      <Pressable className="nb-row" onClick={() => { haptic("light"); s.open(); }}>
                        <Obj name={s.obj} hue={s.hue} size={34} />
                        <span className="nb-row-body">
                          <span className="nb-row-top">
                            <span className="nb-row-title">{s.title}</span>
                            {s.when && <span className="nb-row-when">{s.when}</span>}
                          </span>
                          <span className="nb-row-line">{s.line}</span>
                        </span>
                        {s.pill && <Pill hue={s.pill.hue}>{s.pill.text}</Pill>}
                      </Pressable>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {lens === "crew" && <CloseOutLine />}
          </div>
        )}

        {/* ------------------------------- money ------------------------------- */}
        {focus === "money" && (
          <div className="nb-stack">
            <Card>
              <Gauge
                value={margin.running}
                label="margin running"
                caption={`Priced at ${margin.pricedPct}% across ${live.length} live jobs · ${money(margin.spent, { cents: false })} spent of ${money(margin.priced, { cents: false })}`}
              />
            </Card>

            <Card title="Cash" action={<Pressable className="nb-more" onClick={() => push("now-money", () => <MoneyScreen />)}>Open<Icon name="chevron" size={14} /></Pressable>}>
              <div className="nb-rings">
                <RingStat pct={billed > 0 ? outstanding / billed : 0} value={compactMoney(outstanding)} label="outstanding" hue="blue" />
                <RingStat pct={outstanding > 0 ? overdue / outstanding : 0} value={compactMoney(overdue)} label="overdue" hue="coral" />
                <RingStat pct={billed > 0 ? collected / billed : 0} value={compactMoney(monthIn)} label="in this month" hue="emerald" />
              </div>
            </Card>

            <Card title="Live jobs" pad={false}>
              <div className="nb-list">
                {live.map((j) => {
                  const c = jobCost(db, j);
                  const over = c.estimatedHours > 0 && c.hours > c.estimatedHours;
                  return (
                    <Pressable key={j.id} className="nb-row" onClick={() => openJob(j)}>
                      <Ring pct={c.estimatedHours ? Math.min(c.hours / c.estimatedHours, 1) : 0} hue={over ? "coral" : "emerald"} size={34} />
                      <span className="nb-row-body">
                        <span className="nb-row-top">
                          <span className="nb-row-title">{e.customer(j.customerId).name}</span>
                          <span className="nb-row-when">{money(j.valueCents, { cents: false })}</span>
                        </span>
                        <span className="nb-row-line">
                          {c.hours.toFixed(0)} h{c.estimatedHours ? ` of ${c.estimatedHours} priced` : " clocked"} · {money(c.spentCents, { cents: false })} spent
                        </span>
                      </span>
                      {over && <Pill hue="coral">{Math.round(c.hours - c.estimatedHours)}h over</Pill>}
                    </Pressable>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* -------------------------------- crew ------------------------------- */}
        {focus === "crew" && (
          <div className="nb-stack">
            <Card title="On the clock" action={<Pill hue="emerald" dot>{onClock.length} live</Pill>} pad={false}>
              <div className="nb-list">
                {crewRows.map(({ p, openEntry, today }) => (
                  <Pressable key={p.id} className="nb-row" onClick={() => push(`person-${p.id}`, () => <PersonScreen personId={p.id} />)} data-shot={`person-${p.id}`}>
                    <span className="nb-face">
                      <Avatar name={p.name} size={34} tone={p.avatarTone} />
                      {openEntry && <i className="nb-live" />}
                    </span>
                    <span className="nb-row-body">
                      <span className="nb-row-top">
                        <span className="nb-row-title">{p.name}</span>
                        <span className="nb-row-when">{today > 0 ? `${today.toFixed(1)} h` : "—"}</span>
                      </span>
                      <span className="nb-row-line">
                        {openEntry
                          ? `${e.customer(e.job(openEntry.jobId).customerId).name.split(" ")[0]} · ${TASK_LABEL[openEntry.task].toLowerCase()} since ${time(openEntry.startAt)}`
                          : p.role.replace("_", " ")}
                      </span>
                    </span>
                    {openEntry && <Pill hue="emerald" dot>on site</Pill>}
                  </Pressable>
                ))}
              </div>
            </Card>

            <Card title="Day coverage">
              <div className="nb-cover">
                <Ticks done={Math.min(onClock.length * 2, 8)} total={8} hue="emerald" />
                <p className="nb-cover-note">
                  {onClock.length} of {crewRows.length} on site · {money(Math.round(crewRows.reduce((s, r) => s + r.today, 0) * LABOR_RATE_CENTS), { cents: false })} of labour logged today
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ------------------------------- media ------------------------------- */}
        {focus === "media" && (
          <div className="nb-stack">
            <Card title="What's working" action={<Pressable className="nb-more" onClick={() => push("now-media", () => <MediaScreen />)}>Open<Icon name="chevron" size={14} /></Pressable>}>
              {topReel && (
                <div className="nb-reel">
                  <span className="nb-reel-thumb"><img src={photoSrc({ seed: topReel.photoSeed })} alt="" /></span>
                  <div className="grow">
                    <p className="nb-row-title">{topReel.title}</p>
                    <p className="nb-row-line">{topReel.format} · {relative(topReel.publishedAt, NOW)}</p>
                    <div className="nb-reel-stats">
                      <Metric value={`${Math.round(topReel.views / 1000)}k`} label="views" />
                      <Metric value={String(topReel.leads)} label="leads" hue="emerald" />
                      <Metric value={compactMoney(topReel.bookedCents)} label="booked" hue="emerald" />
                    </div>
                  </div>
                </div>
              )}
            </Card>
            <Card title="Marked on site" action={<Pill hue="teal">{marked}</Pill>}>
              <div className="nb-marked">
                {db.photos.filter((p) => p.forReel).slice(0, 6).map((p) => (
                  <span key={p.id} className="nb-marked-cell"><img src={photoSrc(p)} alt="" loading="lazy" /></span>
                ))}
              </div>
            </Card>
          </div>
        )}

        <p className="nb-foot">{LENS[lens].label} · {LENS[lens].leads}</p>
      </div>
      <div className="now-fade" aria-hidden />
    </div>
  );
}

/* ------------------------------ the hot card ------------------------------ */

function HotCard({ job, onOpen, lens }: { job: Job; onOpen: () => void; lens: string }) {
  const e = useEntities();
  const { db } = useDB();
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const est = e.estimates(job.id).at(-1);
  const totals = est ? estimateTotals(est) : null;
  const cost = jobCost(db, job);
  const late = job.nextAction && new Date(job.nextAction.dueAt) < NOW;

  const flag = job.blocker
    ? { text: BLOCKER_SHORT[job.blocker.kind] ?? "Blocked", hue: "amber" as const }
    : late ? { text: "Overdue", hue: "coral" as const }
      : { text: "In progress", hue: "blue" as const };

  return (
    <motion.div
      className="k-card is-pad hot"
      role="button" tabIndex={0}
      whileTap={{ scale: 0.995 }} transition={SPRING.snap}
      onClick={onOpen}
      onKeyDown={(ev) => { if (ev.key === "Enter") onOpen(); }}
    >
      <div className="hot-top">
        <span className="hot-thumb">{property.photo && <img src={photoSrc({ seed: property.photo })} alt="" />}</span>
        <span className="grow">
          <span className="hot-name">{customer.name}</span>
          <span className="hot-where">{property.address}, {property.city}</span>
        </span>
        <Pill hue={flag.hue} dot>{flag.text}</Pill>
      </div>
      <p className="hot-scope">{job.scopeSummary}</p>
      <div className="hot-metrics">
        <Metric value={money(job.valueCents, { cents: false })} label="contract" />
        {totals && <Metric value={`${Math.round(totals.margin * 100)}%`} label="priced margin" />}
        {cost.hours > 0 && (
          <Metric
            value={`${cost.hours.toFixed(0)} h`}
            label={cost.estimatedHours ? `of ${cost.estimatedHours} priced` : "clocked"}
            hue={cost.estimatedHours && cost.hours > cost.estimatedHours ? "coral" : undefined}
          />
        )}
      </div>
      {job.nextAction && (
        <div className="hot-action">
          <span className="hot-next">{job.nextAction.label}</span>
          <Button size="sm" variant={job.blocker?.kind === "awaiting_deposit" ? "money" : "call"} icon={job.blocker?.kind === "awaiting_deposit" ? "money" : "phone"}>
            {job.blocker?.kind === "awaiting_deposit" ? "Re-run" : lens === "crew" ? "Log" : "Call"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
