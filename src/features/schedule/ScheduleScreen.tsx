/* Schedule — the board.
 *
 * Two questions, two views. Day answers "where is everyone right now and what
 * is in the way"; Week answers "where is my idle time". The day view is a real
 * timeline — a block's height is its duration, so a half day looks like a half
 * day — because the founders read a day by its shape before they read any text.
 *
 * Conflicts are the reason this screen exists. Overlap is detected per person,
 * not per appointment: two jobs at the same hour are fine, the same carpenter
 * on both is not. A conflict is stated in plain words, marked on the blocks it
 * belongs to, and resolvable in two taps — move one, or hand it to someone who
 * is actually free. Both paths write through commit(). */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon, type IconName } from "../../ui/Icon";
import {
  Avatar, Badge, Button, EmptyState, Pressable, Segmented, SectionHead, Skeleton, useToast,
} from "../../ui/primitives";
import { DayChip, SheetHead, TimeRange } from "../../ui/domain";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities, useSaver, SAVE_LABEL } from "../../data/store";
import { NOW, dayOffsetOf, onDay } from "../../data/clock";
import { compactMoney, relative, time } from "../../lib/format";
import { FADE, SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { Appointment, DB, Job, Person, ScheduleState } from "../../data/types";
import { JobDetail } from "../jobs/JobDetail";
import "./schedule.css";

/* ------------------------------ constants ------------------------------ */

const DAY_FROM = -3;
const DAY_TO = 10;                 // 14 days on the strip
const PPH = 48;                    // pixels per hour on the day timeline
const MIN_BLOCK = 40;
const GAP_MIN_MINUTES = 10;
const WORK_DAY_MIN = 8 * 60;       // one crew-day of capacity

const KIND_LABEL: Record<Appointment["kind"], string> = {
  inspection: "Inspection", work: "Work day", walkthrough: "Walkthrough",
  punch: "Punch list", delivery: "Delivery",
};
const KIND_ICON: Record<Appointment["kind"], IconName> = {
  inspection: "ruler", work: "wrench", walkthrough: "users",
  punch: "check", delivery: "truck",
};
const STATE_LABEL: Record<ScheduleState, string> = {
  unscheduled: "Unscheduled", tentative: "Tentative", confirmed: "Confirmed",
  in_progress: "On site", done: "Done",
};
const STATE_CLASS: Record<ScheduleState, string> = {
  unscheduled: "s-idle", tentative: "s-tentative", confirmed: "s-confirmed",
  in_progress: "s-live", done: "s-done",
};
const ROLE_LABEL: Record<Person["role"], string> = {
  owner: "Owner", estimator: "Estimator", lead_carpenter: "Lead carpenter",
  carpenter: "Carpenter", coordinator: "Coordinator", sub: "Subcontractor",
};

/* ------------------------------- helpers ------------------------------- */

const ms = (iso: string) => new Date(iso).getTime();
const first = (name: string) => name.split(" ")[0];
const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

/** "7:30a–4:00p" — compact enough for a narrow lane, still tabular. */
function shortRange(startAt: string, endAt: string) {
  const s = time(startAt).replace(" am", "a").replace(" pm", "p");
  const e = time(endAt).replace(" am", "a").replace(" pm", "p");
  return `${s}–${e}`;
}

/** "7:12a" — the now marker has 34px to live in. */
function tickTime(d: Date) {
  return time(d.toISOString()).replace(" am", "a").replace(" pm", "p");
}

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function dayTitle(offset: number) {
  const d = new Date(onDay(offset, 12));
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Los_Angeles" });
}

function dayStamp(offset: number) {
  return new Date(onDay(offset, 12)).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "America/Los_Angeles",
  });
}

function personBusy(db: DB, personId: string, s: number, e: number, exceptId?: string) {
  return db.appointments.some((a) =>
    a.id !== exceptId && a.crewIds.includes(personId) && overlaps(ms(a.startAt), ms(a.endAt), s, e));
}

/** Overlaps found per person — the only definition of a conflict that matters. */
type Conflict = { personId: string; a: Appointment; b: Appointment; from: number; to: number };

function findConflicts(appts: Appointment[], people: Person[]): Conflict[] {
  const out: Conflict[] = [];
  for (const p of people) {
    const mine = appts.filter((a) => a.crewIds.includes(p.id))
      .sort((x, y) => x.startAt.localeCompare(y.startAt));
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        const from = Math.max(ms(mine[i].startAt), ms(mine[j].startAt));
        const to = Math.min(ms(mine[i].endAt), ms(mine[j].endAt));
        if (from < to) out.push({ personId: p.id, a: mine[i], b: mine[j], from, to });
      }
    }
  }
  return out;
}

/** Greedy lane packing so two things at the same hour sit side by side. */
type Placed = { appt: Appointment; lane: number; s: number; e: number };

function packLanes(appts: Appointment[]) {
  const sorted = [...appts].sort((a, b) => a.startAt.localeCompare(b.startAt) || a.endAt.localeCompare(b.endAt));
  const laneEnd: number[] = [];
  const placed: Placed[] = sorted.map((appt) => {
    const s = ms(appt.startAt);
    const e = ms(appt.endAt);
    let lane = laneEnd.findIndex((end) => end <= s);
    if (lane === -1) { lane = laneEnd.length; laneEnd.push(e); }
    else laneEnd[lane] = e;
    return { appt, lane, s, e };
  });
  return { placed, lanes: Math.max(1, laneEnd.length) };
}

/** Dead air on the board: stretches where nobody is on a job. */
function openGaps(placed: Placed[]) {
  if (placed.length < 2) return [] as Array<{ from: number; to: number; next: Appointment }>;
  const byStart = [...placed].sort((a, b) => a.s - b.s);
  const gaps: Array<{ from: number; to: number; next: Appointment }> = [];
  let covered = byStart[0].e;
  for (let i = 1; i < byStart.length; i++) {
    const p = byStart[i];
    if (p.s - covered >= GAP_MIN_MINUTES * 60000) gaps.push({ from: covered, to: p.s, next: p.appt });
    covered = Math.max(covered, p.e);
  }
  return gaps;
}

/** Days this appointment's whole crew is free for the same length of work. */
function freeSlots(db: DB, appt: Appointment, limit = 6) {
  const dur = ms(appt.endAt) - ms(appt.startAt);
  const long = dur > 4 * 3600000;
  const starts: Array<[number, number]> = long ? [[7, 30], [8, 0]] : [[8, 0], [10, 0], [13, 0], [14, 30]];
  const out: string[] = [];
  for (let off = 0; off <= 13 && out.length < limit; off++) {
    for (const [hh, mm] of starts) {
      const s = ms(onDay(off, hh, mm));
      const e = s + dur;
      if (s <= NOW.getTime()) continue;
      if (appt.crewIds.some((id) => personBusy(db, id, s, e, appt.id))) continue;
      out.push(new Date(s).toISOString());
      break;
    }
  }
  return out;
}

/* ------------------------- writes (pure db → db) ------------------------ */

function logActivity(d: DB, jobId: string, text: string, meta?: string) {
  d.activity.push({
    id: `act-sch-${d.activity.length + 1}`, jobId, at: NOW.toISOString(),
    actorId: d.me, kind: "schedule", text, meta,
  });
}

function applyConfirm(d: DB, apptId: string) {
  const a = d.appointments.find((x) => x.id === apptId)!;
  a.state = "confirmed";
  const j = d.jobs.find((x) => x.id === a.jobId);
  if (j && j.schedule === "tentative") j.schedule = "confirmed";
  logActivity(d, a.jobId, "Appointment confirmed", dayStamp(dayOffsetOf(a.startAt)));
  return d;
}

function applyMove(d: DB, apptId: string, startISO: string) {
  const a = d.appointments.find((x) => x.id === apptId)!;
  const dur = ms(a.endAt) - ms(a.startAt);
  a.startAt = startISO;
  a.endAt = new Date(ms(startISO) + dur).toISOString();
  logActivity(d, a.jobId, `Moved to ${dayStamp(dayOffsetOf(startISO))}`, shortRange(a.startAt, a.endAt));
  return d;
}

function applySwap(d: DB, apptId: string, fromId: string, toId: string) {
  const a = d.appointments.find((x) => x.id === apptId)!;
  a.crewIds = a.crewIds.map((id) => (id === fromId ? toId : id)).filter((id, i, all) => all.indexOf(id) === i);
  const from = d.people.find((p) => p.id === fromId);
  const to = d.people.find((p) => p.id === toId);
  logActivity(d, a.jobId, `${to ? to.name : "Crew"} takes this from ${from ? first(from.name) : "crew"}`);
  return d;
}

function applyToggleCrew(d: DB, apptId: string, personId: string) {
  const a = d.appointments.find((x) => x.id === apptId)!;
  a.crewIds = a.crewIds.includes(personId)
    ? a.crewIds.filter((id) => id !== personId)
    : [...a.crewIds, personId];
  const p = d.people.find((x) => x.id === personId);
  logActivity(d, a.jobId, `${p ? p.name : "Crew"} ${a.crewIds.includes(personId) ? "added to" : "taken off"} this visit`);
  return d;
}

function applyBook(d: DB, jobId: string, crewIds: string[], startISO: string, hours: number) {
  const id = `ap-new-${d.appointments.length + 1}`;
  d.appointments.push({
    id, jobId, kind: "work", startAt: startISO,
    endAt: new Date(ms(startISO) + hours * 3600000).toISOString(),
    crewIds, state: "tentative", note: "Pencilled in from the board. Confirm with the customer.",
  });
  const j = d.jobs.find((x) => x.id === jobId);
  if (j) { j.schedule = "tentative"; j.crewIds = crewIds; }
  logActivity(d, jobId, `Pencilled in for ${dayStamp(dayOffsetOf(startISO))}`, shortRange(startISO, new Date(ms(startISO) + hours * 3600000).toISOString()));
  return d;
}

/* ================================ screen ================================ */

type Mode = "day" | "week";
type Load = "loading" | "ready" | "error";

export function ScheduleScreen() {
  const { db } = useDB();
  const e = useEntities();
  const { present } = useSheets();

  const [mode, setMode] = useState<Mode>("day");
  const [day, setDay] = useState(0);
  const [dir, setDir] = useState(1);
  const [load, setLoad] = useState<Load>("loading");
  const [crewFilter, setCrewFilter] = useState<string[]>([]);

  /* first paint is a real load, not a theoretical one */
  useEffect(() => {
    const t = window.setTimeout(() => setLoad(navigator.onLine === false ? "error" : "ready"), 450);
    return () => window.clearTimeout(t);
  }, []);

  const reload = async () => {
    setLoad("loading");
    await new Promise((r) => setTimeout(r, 620));
    setLoad(navigator.onLine === false ? "error" : "ready");
  };

  const days = useMemo(
    () => Array.from({ length: DAY_TO - DAY_FROM + 1 }, (_, i) => DAY_FROM + i),
    [],
  );

  const byDay = useMemo(() => {
    const m = new Map<number, Appointment[]>();
    for (const a of db.appointments) {
      const off = dayOffsetOf(a.startAt);
      const list = m.get(off);
      if (list) list.push(a); else m.set(off, [a]);
    }
    for (const list of m.values()) list.sort((x, y) => x.startAt.localeCompare(y.startAt));
    return m;
  }, [db.appointments]);

  const allToday = useMemo(() => byDay.get(day) ?? [], [byDay, day]);
  const visible = useMemo(
    () => (crewFilter.length ? allToday.filter((a) => a.crewIds.some((id) => crewFilter.includes(id))) : allToday),
    [allToday, crewFilter],
  );
  const conflicts = useMemo(() => findConflicts(allToday, db.people), [allToday, db.people]);

  /* a conflict appearing is news — it gets a haptic, once per day change */
  const lastWarned = useRef<string>("");
  useEffect(() => {
    const key = `${day}:${conflicts.length}`;
    if (conflicts.length && lastWarned.current !== key && load === "ready") haptic("warning");
    lastWarned.current = key;
  }, [day, conflicts.length, load]);

  const selectDay = (next: number) => {
    if (next === day) return;
    setDir(next > day ? 1 : -1);
    setDay(next);
  };

  const backlog = useMemo(() => {
    const scheduled = new Set(db.appointments.map((a) => a.jobId));
    const bookable: Job["stage"][] = ["approved", "scheduled", "new_lead", "qualifying"];
    return db.jobs
      .filter((j) => j.schedule === "unscheduled" && bookable.includes(j.stage) && !scheduled.has(j.id))
      .sort((a, b) => {
        const rank = (j: Job) => (j.stage === "approved" || j.stage === "scheduled" ? 0 : 1);
        return rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt);
      });
  }, [db.jobs, db.appointments]);

  const openAppt = (id: string) =>
    present((api) => <ApptSheet api={api} apptId={id} onJump={selectDay} />, { detents: ["auto"] });

  const openBook = (jobId: string) =>
    present((api) => <BookSheet api={api} jobId={jobId} onBooked={selectDay} />, { detents: ["auto", 0.92] });

  const openResolve = () => {
    const c = conflicts[0];
    if (!c) return;
    present((api) => <ResolveSheet api={api} conflict={{ personId: c.personId, aId: c.a.id, bId: c.b.id }} />, { detents: ["auto"] });
  };

  const crewOut = useMemo(
    () => new Set(visible.flatMap((a) => a.crewIds)).size,
    [visible],
  );

  return (
    <Screen
      title="Schedule"
      onRefresh={reload}
      subtitle={
        <span>
          {dayStamp(day)} · {allToday.length} booked · {crewOut} on the board
          {conflicts.length > 0 && <span className="tone-danger"> · {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span>}
        </span>
      }
      actions={
        <>
          {day !== 0 && (
            <Pressable
              className="round round-plain" style={{ width: 40, height: 40 }}
              aria-label="Jump to today" data-shot="schedule-today"
              onClick={() => selectDay(0)}
            >
              <Icon name="today" size={22} />
            </Pressable>
          )}
          <Pressable
            className="round round-plain" style={{ width: 40, height: 40, position: "relative" }}
            aria-label="Filter by crew" data-shot="schedule-filter"
            onClick={() => present((api) => (
              <CrewFilterSheet api={api} value={crewFilter} onChange={setCrewFilter} />
            ), { detents: ["auto"] })}
          >
            <Icon name="filter" size={22} />
            {crewFilter.length > 0 && <span className="dot-mark" aria-hidden />}
          </Pressable>
        </>
      }
      headerExtra={
        <div className="stack gap-2">
          <Segmented
            value={mode}
            onChange={(m: Mode) => setMode(m)}
            options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }]}
          />
          <DayStrip days={days} day={day} onSelect={selectDay} byDay={byDay} />
        </div>
      }
    >
      {crewFilter.length > 0 && (
        <div className="chip-row">
          {crewFilter.map((id) => {
            const p = e.person(id);
            return (
              <button key={id} className="chip is-on" onClick={() => setCrewFilter((f) => f.filter((x) => x !== id))}>
                {p ? first(p.name) : id} <Icon name="close" size={12} strokeWidth={2.4} />
              </button>
            );
          })}
          <button className="chip" onClick={() => setCrewFilter([])}>Clear filters</button>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${mode}:${day}:${load}`}
          initial={{ opacity: 0, x: dir * 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -6 }}
          transition={FADE}
        >
          {load === "loading" ? (
            <TimelineSkeleton />
          ) : load === "error" ? (
            <div className="card">
              <EmptyState
                icon={<span className="sch-glyph is-danger"><Icon name="alert" size={22} /></span>}
                title="Couldn't load the schedule"
                body="The board is stored on this device until it syncs. Try again when you have signal."
                action={<Button variant="secondary" icon="refresh" onClick={reload}>Retry</Button>}
              />
            </div>
          ) : mode === "week" ? (
            <WeekGrid
              day={day}
              byDay={byDay}
              onPick={(off) => { haptic("select"); selectDay(off); setMode("day"); }}
            />
          ) : (
            <div className="stack gap-3">
              {conflicts.length > 0 && (
                <ConflictBar conflicts={conflicts} onResolve={openResolve} />
              )}

              {allToday.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={<span className="sch-glyph"><Icon name="schedule" size={22} /></span>}
                    title={`Nothing booked ${dayTitle(day)}`}
                    body={backlog.length
                      ? `${backlog.length} job${backlog.length > 1 ? "s" : ""} are waiting for a date.`
                      : "No visits, no work days, no deliveries on this date."}
                    action={backlog.length
                      ? <Button icon="plus" onClick={() => present((api) => <PickJobSheet api={api} jobs={backlog} onPick={openBook} />, { detents: ["auto", 0.9] })}>Book work</Button>
                      : undefined}
                  />
                </div>
              ) : visible.length === 0 ? (
                <div className="card">
                  <EmptyState
                    title="No visits match this crew"
                    body={`${allToday.length} on the board ${dayTitle(day).toLowerCase()}, none of them theirs.`}
                    action={<Button variant="secondary" onClick={() => setCrewFilter([])}>Clear filters</Button>}
                  />
                </div>
              ) : (
                <Timeline day={day} appts={visible} conflicts={conflicts} onOpen={openAppt} />
              )}

              <BacklogSection jobs={backlog} onBook={openBook} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="t-meta updated">
        {load === "ready"
          ? `${db.appointments.length} appointments on the board · fixtures, not live data`
          : " "}
      </p>
    </Screen>
  );
}

/* ------------------------------ day strip ------------------------------ */

function DayStrip({
  days, day, onSelect, byDay,
}: { days: number[]; day: number; onSelect: (d: number) => void; byDay: Map<number, Appointment[]> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const settled = useRef(false);

  useLayoutEffect(() => {
    const sc = ref.current;
    if (!sc) return;
    const el = sc.children[day - DAY_FROM] as HTMLElement | undefined;
    if (!el) return;
    setPill({ x: el.offsetLeft, w: el.offsetWidth });
    sc.scrollTo({
      left: Math.max(0, el.offsetLeft - (sc.clientWidth - el.offsetWidth) / 2),
      behavior: settled.current ? "smooth" : "auto",
    });
    settled.current = true;
  }, [day]);

  return (
    <div className="sch-strip">
      <div className="sch-strip-scroll hscroll" ref={ref}>
        {days.map((off) => (
          <DayChip
            key={off}
            iso={onDay(off, 12)}
            selected={off === day}
            onSelect={() => onSelect(off)}
            dotCount={(byDay.get(off) ?? []).length}
          />
        ))}
        {pill && (
          <motion.span
            className="sch-pill"
            aria-hidden
            initial={false}
            animate={{ x: pill.x, width: pill.w }}
            transition={SPRING.snap}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------- conflict banner --------------------------- */

function ConflictBar({ conflicts, onResolve }: { conflicts: Conflict[]; onResolve: () => void }) {
  const e = useEntities();
  const c = conflicts[0];
  const person = e.person(c.personId);
  const a = e.customer(e.job(c.a.jobId).customerId);
  const b = e.customer(e.job(c.b.jobId).customerId);
  const mins = (c.to - c.from) / 60000;
  const surname = (n: string) => n.split(/\s+/).slice(-1)[0];

  return (
    <motion.div
      className="conflict-bar"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.sheet}
      role="alert"
    >
      <div className="conflict-top">
        <span className="conflict-glyph"><Icon name="alert" size={18} strokeWidth={2} /></span>
        <span className="grow">
          <span className="t-row block">
            {person ? first(person.name) : "Someone"} is on two jobs{" "}
            <span className="t-num">{time(new Date(c.from).toISOString())} – {time(new Date(c.to).toISOString())}</span>
          </span>
          <span className="t-meta block">
            {surname(a.name)} and {surname(b.name)} overlap by {durationLabel(mins)}
            {conflicts.length > 1 ? ` · ${conflicts.length - 1} more conflict${conflicts.length > 2 ? "s" : ""}` : ""}
          </span>
        </span>
      </div>
      <Button variant="secondary" full data-shot="schedule-resolve" onClick={onResolve}>Resolve</Button>
    </motion.div>
  );
}

/* ------------------------------- timeline ------------------------------- */

function Timeline({
  day, appts, conflicts, onOpen,
}: { day: number; appts: Appointment[]; conflicts: Conflict[]; onOpen: (id: string) => void }) {
  const e = useEntities();
  const isToday = day === 0;
  const { placed, lanes } = useMemo(() => packLanes(appts), [appts]);
  const gaps = useMemo(() => openGaps(placed), [placed]);

  const dayStart = ms(onDay(day, 0));
  const rawStart = Math.min(...placed.map((p) => p.s), isToday ? NOW.getTime() : Infinity);
  const rawEnd = Math.max(...placed.map((p) => p.e), isToday ? NOW.getTime() : -Infinity);
  const startHour = Math.floor((rawStart - dayStart) / 3600000);
  const endHour = Math.ceil((rawEnd - dayStart) / 3600000);
  const hours = Math.max(1, endHour - startHour);
  const height = hours * PPH + 10;
  const top0 = dayStart + startHour * 3600000;
  const y = (t: number) => ((t - top0) / 3600000) * PPH;

  const nowY = isToday ? y(NOW.getTime()) : -1;
  const conflicted = new Set(conflicts.flatMap((c) => [c.a.id, c.b.id]));

  return (
    <div className="tl-card">
      {lanes >= 3 && (
        <p className="tl-more t-meta">
{lanes} jobs at once — swipe <Icon name="arrowRight" size={13} strokeWidth={2} />
        </p>
      )}
      <div
        className={`tl${lanes >= 3 ? " has-more" : ""}`}
        style={{ height, ["--lanes" as string]: lanes, ["--lane-fit" as string]: lanes >= 3 ? 1.9 : lanes }}
      >
        <div className="tl-gutter">
          {Array.from({ length: hours + 1 }, (_, i) => {
            const hy = i * PPH;
            const hour = (startHour + i) % 24;
            if (isToday && Math.abs(hy - nowY) < 14) return null;
            return (
              <span className="tl-hour-label t-num" key={i} style={{ top: hy - 8 }}>
                {hour % 12 === 0 ? 12 : hour % 12}<em>{hour < 12 ? "a" : "p"}</em>
              </span>
            );
          })}
          {isToday && nowY >= 0 && (
            <span className="tl-now-pill t-num" style={{ top: nowY - 9 }}>{tickTime(NOW)}</span>
          )}
        </div>

        <div className="tl-scroll">
          <div className="tl-canvas">
            {Array.from({ length: hours + 1 }, (_, i) => (
              <span className="tl-line" key={i} style={{ top: i * PPH }} />
            ))}

            {gaps.map((g) => {
              const gy = y(g.from);
              const gh = Math.max(18, y(g.to) - gy);
              const travel = g.next.travelMinutes;
              return (
                <div className="tl-gap" key={`gap-${g.from}`} style={{ top: gy, height: gh }}>
                  <span className="tl-gap-label t-num">
                    {travel ? <Icon name="truck" size={12} /> : null}
                    {travel ? `${travel} min drive` : `${durationLabel((g.to - g.from) / 60000)} open`}
                  </span>
                </div>
              );
            })}

            {placed.map(({ appt, lane, s, e: end }) => {
              const job = e.job(appt.jobId);
              const prop = e.property(job.propertyId);
              const crew = appt.crewIds.map((id) => e.person(id)).filter(Boolean) as Person[];
              const h = Math.max(MIN_BLOCK, y(end) - y(s));
              const bad = conflicted.has(appt.id);
              const tiny = h < 46;
              const compact = h < 104;
              const avatars = crew.map((p) => <Avatar key={p.id} name={p.name} size={tiny ? 15 : 18} tone={p.avatarTone} />);
              const extra = appt.kind === "work"
                ? (appt.travelMinutes ? `${appt.travelMinutes} min drive` : "")
                : KIND_LABEL[appt.kind] + (appt.travelMinutes ? ` · ${appt.travelMinutes} min drive` : "");
              return (
                <div
                  className="tl-slot"
                  key={appt.id}
                  style={{ top: y(s), height: h, left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%` }}
                >
                  <Pressable
                    className={`tl-block ${STATE_CLASS[appt.state]}${tiny ? " is-tiny" : compact ? " is-short" : ""}${bad ? " is-conflict" : ""}`}
                    scale={0.985}
                    onClick={() => onOpen(appt.id)}
                  >
                    <span className="tlb-top">
                      <span className="tlb-time t-num t-meta">{shortRange(appt.startAt, appt.endAt)}</span>
                      {bad && <Icon name="alert" size={12} strokeWidth={2.4} className="tlb-alert" />}
                      {compact && <span className="tlb-crew is-inline">{avatars}</span>}
                    </span>
                    <span className={tiny ? "tlb-title truncate" : "tlb-title clamp2"}>{job.title}</span>
                    {!compact && <span className="tlb-addr t-meta clamp2">{prop.address}</span>}
                    {!compact && extra && <span className="tlb-meta t-meta">{extra}</span>}
                    {!compact && (
                      <span className="tlb-crew">
                        {avatars}
                        <span className="t-meta truncate">{crew.map((p) => first(p.name)).join(", ") || "Unassigned"}</span>
                      </span>
                    )}
                    {bad && !compact && <span className="tlb-flag t-meta">Double-booked</span>}
                  </Pressable>
                </div>
              );
            })}

            {isToday && nowY >= 0 && (
              <div className="tl-now" style={{ top: nowY }} aria-label="Now">
                <span className="tl-now-line" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="tl-card" aria-hidden>
      <div className="tl" style={{ height: 8 * PPH, ["--lanes" as string]: 2, ["--lane-fit" as string]: 2 }}>
        <div className="tl-gutter">
          {Array.from({ length: 9 }, (_, i) => (
            <span className="tl-hour-label" key={i} style={{ top: i * PPH - 6 }}><Skeleton w={16} h={9} r={4} /></span>
          ))}
        </div>
        <div className="tl-scroll">
          <div className="tl-canvas">
            {Array.from({ length: 9 }, (_, i) => <span className="tl-line" key={i} style={{ top: i * PPH }} />)}
            <div className="tl-slot" style={{ top: 4, height: PPH * 5.2, left: "0%", width: "50%" }}>
              <span className="tl-block sch-skel" />
            </div>
            <div className="tl-slot" style={{ top: PPH * 0.6, height: PPH * 6.1, left: "50%", width: "50%" }}>
              <span className="tl-block sch-skel" />
            </div>
            <div className="tl-slot" style={{ top: PPH * 6, height: PPH * 1.4, left: "0%", width: "50%" }}>
              <span className="tl-block sch-skel" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- week grid ------------------------------ */

function WeekGrid({
  day, byDay, onPick,
}: { day: number; byDay: Map<number, Appointment[]>; onPick: (off: number) => void }) {
  const { db } = useDB();
  const weekStart = day - new Date(onDay(day, 12)).getDay();
  const offsets = Array.from({ length: 7 }, (_, i) => weekStart + i);

  const load = (personId: string, off: number) => {
    const s = ms(onDay(off, 0));
    const e2 = s + 86400000;
    return (byDay.get(off) ?? [])
      .filter((a) => a.crewIds.includes(personId))
      .reduce((m, a) => m + Math.max(0, Math.min(ms(a.endAt), e2) - Math.max(ms(a.startAt), s)), 0) / 60000;
  };

  const capacity = (off: number) => (new Date(onDay(off, 12)).getDay() === 0 ? 0 : WORK_DAY_MIN);

  const conflictKeys = useMemo(() => {
    const set = new Set<string>();
    for (const off of offsets) {
      for (const c of findConflicts(byDay.get(off) ?? [], db.people)) set.add(`${c.personId}:${off}`);
    }
    return set;
  }, [offsets.join(), byDay, db.people]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = offsets.reduce((acc, off) => {
    for (const p of db.people) acc.booked += load(p.id, off);
    acc.cap += capacity(off) * db.people.length;
    return acc;
  }, { booked: 0, cap: 0 });
  const idle = Math.max(0, totals.cap - totals.booked);

  return (
    <div className="stack gap-3">
      <div className="wk card">
        <div className="wk-head">
          <span className="wk-name t-meta">Crew</span>
          {offsets.map((off) => {
            const d = new Date(onDay(off, 12));
            return (
              <button
                key={off}
                className={`wk-col${off === day ? " is-on" : ""}${off === 0 ? " is-today" : ""}`}
                onClick={() => onPick(off)}
                aria-label={dayStamp(off)}
              >
                <span className="wk-dow">{d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "America/Los_Angeles" })}</span>
                <span className="wk-date t-num">{d.getDate()}</span>
              </button>
            );
          })}
          <span className="wk-util t-meta">Load</span>
        </div>

        {db.people.map((p) => {
          const week = offsets.reduce((m, off) => m + load(p.id, off), 0);
          const cap = offsets.reduce((m, off) => m + capacity(off), 0);
          const pct = cap === 0 ? 0 : Math.round((week / cap) * 100);
          return (
            <div className="wk-row" key={p.id}>
              <span className="wk-name">
                <Avatar name={p.name} size={20} tone={p.avatarTone} />
                <span className="t-meta truncate">{first(p.name)}</span>
              </span>
              {offsets.map((off) => {
                const mins = load(p.id, off);
                const cp = capacity(off);
                const fill = cp === 0 ? 0 : Math.min(1, mins / cp);
                const bad = conflictKeys.has(`${p.id}:${off}`);
                return (
                  <Pressable
                    key={off}
                    className={`wk-cell${off === day ? " is-on" : ""}${bad ? " is-conflict" : ""}${cp === 0 ? " is-closed" : ""}`}
                    scale={0.94}
                    aria-label={`${first(p.name)} ${dayStamp(off)}: ${mins ? durationLabel(mins) : "open"}`}
                    onClick={() => onPick(off)}
                  >
                    <span className="wk-bar">
                      <span className="wk-fill" style={{ height: `${fill * 100}%` }} />
                    </span>
                    <span className="wk-hrs t-num">{mins ? Math.round(mins / 60) : cp === 0 ? "" : "·"}</span>
                  </Pressable>
                );
              })}
              <span className={`wk-util t-num t-meta${pct >= 100 ? " tone-danger" : pct < 40 ? " tone-warning" : ""}`}>{pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="wk-foot step">
        <span className="grow">
          <span className="t-row block t-num">{Math.round(idle / 60)}h idle</span>
          <span className="t-meta">{Math.round(totals.booked / 60)}h of {Math.round(totals.cap / 60)}h booked</span>
        </span>
        <span className="wk-legend" aria-hidden>
          <i className="wk-key-full" /><span className="t-meta">booked</span>
          <i className="wk-key-open" /><span className="t-meta">open</span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------- backlog -------------------------------- */

function BacklogSection({ jobs, onBook }: { jobs: Job[]; onBook: (jobId: string) => void }) {
  const e = useEntities();
  return (
    <div>
      <SectionHead title="Waiting for a date" count={jobs.length} />
      {jobs.length === 0 ? (
        <div className="card">
          <EmptyState title="Nothing waiting" body="Every sold job and every lead has a visit on the board." />
        </div>
      ) : (
        <div className="list">
          {jobs.map((j) => {
            const c = e.customer(j.customerId);
            const prop = e.property(j.propertyId);
            const sold = j.stage === "approved" || j.stage === "scheduled";
            return (
              <div className="sch-backlog" key={j.id}>
                <span className="grow">
                  <span className="hrow">
                    <span className="t-row truncate grow">{c.name}</span>
                    <span className="t-meta t-num">{compactMoney(j.valueCents)}</span>
                  </span>
                  <span className="t-body dim truncate">{j.title}</span>
                  <span className="hrow" style={{ gap: 6, flexWrap: "wrap" }}>
                    <Badge tone={sold ? "success" : "neutral"}>{sold ? "Needs a work date" : "Needs an inspection"}</Badge>
                    <span className="t-meta truncate">{prop.city} · logged {relative(j.createdAt, NOW)}</span>
                  </span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => onBook(j.id)}>Book it</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================== sheets ================================== */

function ApptSheet({ api, apptId, onJump }: { api: SheetApi; apptId: string; onJump: (d: number) => void }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const saver = useSaver();
  const { push } = useNav();

  const appt = db.appointments.find((a) => a.id === apptId);
  if (!appt) return <div className="sheet-body"><EmptyState title="This visit is gone" body="It was moved or deleted." /></div>;

  const job = e.job(appt.jobId);
  const customer = e.customer(job.customerId);
  const prop = e.property(job.propertyId);
  const crew = appt.crewIds.map((id) => e.person(id)).filter(Boolean) as Person[];
  const mins = (ms(appt.endAt) - ms(appt.startAt)) / 60000;
  const off = dayOffsetOf(appt.startAt);

  return (
    <>
      <SheetHead api={api} title={customer.name} subtitle={job.title} icon={KIND_ICON[appt.kind]} />
      <div className="sheet-body stack gap-3">
        <div className="hrow" style={{ flexWrap: "wrap", gap: 6 }}>
          <Badge>{KIND_LABEL[appt.kind]}</Badge>
          <Badge tone={appt.state === "tentative" ? "warning" : appt.state === "in_progress" ? "success" : appt.state === "done" ? "neutral" : "info"}>
            {STATE_LABEL[appt.state]}
          </Badge>
          {saver.state !== "idle" && <span className={`t-meta save-${saver.state}`}>{SAVE_LABEL[saver.state]}</span>}
        </div>

        <div className="sch-when step">
          <div className="sch-when-top">
            <span className="sch-when-day">
              <span className="t-meta">{dayTitle(off)}</span>
              <span className="t-row t-num block">{dayStamp(off)}</span>
            </span>
            <span style={{ textAlign: "right" }}>
              <span className="t-row block"><TimeRange startAt={appt.startAt} endAt={appt.endAt} /></span>
              <span className="t-meta t-num">{durationLabel(mins)}{appt.travelMinutes ? ` · ${appt.travelMinutes} min drive` : ""}</span>
            </span>
          </div>
          <div className="sch-when-crew">
            {crew.map((p) => <Avatar key={p.id} name={p.name} size={22} tone={p.avatarTone} />)}
            <span className="t-meta truncate">
              {crew.length ? crew.map((p) => `${first(p.name)} · ${ROLE_LABEL[p.role].toLowerCase()}`).join(", ") : "Nobody assigned yet"}
            </span>
          </div>
        </div>

        <div className="card pad sch-addr">
          <span className="grow">
            <span className="t-row block">{prop.address}</span>
            <span className="t-meta">{prop.city}, WA {prop.zip}</span>
          </span>
          <Button size="sm" variant="secondary" icon="pin" onClick={() => toast({ text: `Directions to ${prop.address}` })}>
            Directions
          </Button>
        </div>

        {appt.note && (
          <div className="card pad">
            <p className="t-meta">Note</p>
            <p className="t-body">{appt.note}</p>
          </div>
        )}

        <div className="list">
          <Pressable
            className="row"
            onClick={() => api.push((a) => <CrewStep api={a} apptId={apptId} />)}
          >
            <span className="row-lead action-icon"><Icon name="users" size={19} /></span>
            <span className="row-body">
              <span className="t-row">Reassign crew</span>
              <span className="t-meta">{crew.map((p) => first(p.name)).join(", ") || "Unassigned"}</span>
            </span>
            <Icon name="chevron" size={17} className="dimmer" />
          </Pressable>
          <Pressable
            className="row"
            onClick={() => api.push((a) => <MoveStep api={a} apptId={apptId} onMoved={onJump} />)}
          >
            <span className="row-lead action-icon"><Icon name="clock" size={19} /></span>
            <span className="row-body">
              <span className="t-row">Move time</span>
              <span className="t-meta">Free slots for this crew</span>
            </span>
            <Icon name="chevron" size={17} className="dimmer" />
          </Pressable>
          <Pressable
            className="row"
            onClick={() => { api.close(); push(`job-${job.id}`, () => <JobDetail jobId={job.id} />); }}
          >
            <span className="row-lead action-icon"><Icon name="jobs" size={19} /></span>
            <span className="row-body">
              <span className="t-row">Open job</span>
              <span className="t-meta">{customer.name} · {job.scopeSummary.slice(0, 40)}…</span>
            </span>
            <Icon name="chevron" size={17} className="dimmer" />
          </Pressable>
        </div>
      </div>

      {appt.state === "tentative" && (
        <div className="sheet-foot">
          <Button
            full icon="check" pending={saver.state === "saving"}
            onClick={async () => {
              haptic("medium");
              const ok = await saver.run(commit((d) => applyConfirm(d, apptId)));
              toast(ok
                ? { text: `Confirmed with ${customer.name}`, tone: "success" }
                : { text: "Couldn't save. Retry.", tone: "danger" });
            }}
          >
            Confirm this visit
          </Button>
        </div>
      )}
    </>
  );
}

function CrewStep({ api, apptId }: { api: SheetApi; apptId: string }) {
  const { db, commit } = useDB();
  const saver = useSaver();
  const appt = db.appointments.find((a) => a.id === apptId)!;

  return (
    <>
      <SheetHead api={api} title="Reassign crew" subtitle={shortRange(appt.startAt, appt.endAt)} icon="users" />
      <div className="sheet-body">
        <p className="t-meta sch-note">
          Anyone already booked in this window is marked. Tap to add or take off.
          {saver.state !== "idle" && <span className={`save-${saver.state}`}> {SAVE_LABEL[saver.state]}</span>}
        </p>
        <div className="list">
          {db.people.map((p) => {
            const on = appt.crewIds.includes(p.id);
            const busy = personBusy(db, p.id, ms(appt.startAt), ms(appt.endAt), apptId);
            return (
              <Pressable
                key={p.id}
                className={`row${on ? " is-selected" : ""}`}
                disabled={on && appt.crewIds.length === 1}
                onClick={() => { haptic("medium"); void saver.run(commit((d) => applyToggleCrew(d, apptId, p.id))); }}
              >
                <span className="row-lead"><Avatar name={p.name} size={34} tone={p.avatarTone} /></span>
                <span className="row-body">
                  <span className="t-row">{p.name}</span>
                  <span className="t-meta">{ROLE_LABEL[p.role]}{busy ? " · booked in this window" : " · free"}</span>
                </span>
                <span className="row-trail">
                  {busy && !on && <Badge tone="warning">Busy</Badge>}
                  {on && <Icon name="check" size={18} strokeWidth={2.2} />}
                </span>
              </Pressable>
            );
          })}
        </div>
      </div>
      <div className="sheet-foot"><Button full variant="secondary" onClick={api.pop}>Done</Button></div>
    </>
  );
}

function MoveStep({ api, apptId, onMoved }: { api: SheetApi; apptId: string; onMoved: (d: number) => void }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const saver = useSaver();
  const appt = db.appointments.find((a) => a.id === apptId)!;
  const slots = useMemo(() => freeSlots(db, appt), [db, appt]);
  const crew = appt.crewIds.map((id) => e.person(id)).filter(Boolean) as Person[];
  const dur = (ms(appt.endAt) - ms(appt.startAt)) / 60000;

  return (
    <>
      <SheetHead api={api} title="Move time" subtitle={`${durationLabel(dur)} · ${crew.map((p) => first(p.name)).join(", ")}`} icon="clock" />
      <div className="sheet-body">
        <p className="t-meta sch-note">
          Days where {crew.length > 1 ? "both" : first(crew[0]?.name ?? "the crew")} {crew.length > 1 ? "are" : "is"} free for the whole block.
          {saver.state !== "idle" && <span className={`save-${saver.state}`}> {SAVE_LABEL[saver.state]}</span>}
        </p>
        {slots.length === 0 ? (
          <div className="card">
            <EmptyState title="No free slot in two weeks" body="Take someone off this visit first, or shorten it." />
          </div>
        ) : (
          <div className="list">
            {slots.map((iso) => {
              const off = dayOffsetOf(iso);
              const end = new Date(ms(iso) + dur * 60000).toISOString();
              return (
                <Pressable
                  key={iso}
                  className="row"
                  onClick={async () => {
                    haptic("medium");
                    const ok = await saver.run(commit((d) => applyMove(d, apptId, iso)));
                    if (ok) { onMoved(off); toast({ text: `Moved to ${dayStamp(off)}`, tone: "success" }); api.close(); }
                    else toast({ text: "Couldn't save. Retry.", tone: "danger" });
                  }}
                >
                  <span className="row-body">
                    <span className="t-row">{dayStamp(off)}</span>
                    <span className="t-meta t-num">{shortRange(iso, end)}</span>
                  </span>
                  <Icon name="chevron" size={17} className="dimmer" />
                </Pressable>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------------------- resolve conflict --------------------------- */

function ResolveSheet({
  api, conflict,
}: { api: SheetApi; conflict: { personId: string; aId: string; bId: string } }) {
  const { db } = useDB();
  const e = useEntities();
  const person = e.person(conflict.personId);
  const a = db.appointments.find((x) => x.id === conflict.aId);
  const b = db.appointments.find((x) => x.id === conflict.bId);

  if (!person || !a || !b) {
    return (
      <>
        <SheetHead api={api} title="Resolved" icon="check" />
        <div className="sheet-body"><EmptyState title="Nothing overlaps any more" body="The board is clear for this day." /></div>
      </>
    );
  }

  const from = Math.max(ms(a.startAt), ms(b.startAt));
  const to = Math.min(ms(a.endAt), ms(b.endAt));
  const clear = from >= to;

  return (
    <>
      <SheetHead api={api} title="Double-booked" subtitle={dayStamp(dayOffsetOf(a.startAt))} icon="alert" />
      <div className="sheet-body stack gap-3">
        {clear ? (
          <EmptyState
            icon={<span className="sch-glyph is-ok"><Icon name="check" size={22} strokeWidth={2.2} /></span>}
            title="No longer overlapping"
            body={`${first(person.name)} is on one job at a time again.`}
          />
        ) : (
          <>
            <div className="sch-why">
              <Avatar name={person.name} size={38} tone={person.avatarTone} />
              <span className="grow">
                <span className="t-row block">
                  {first(person.name)} is on two jobs{" "}
                  <span className="t-num">{time(new Date(from).toISOString())} – {time(new Date(to).toISOString())}</span>
                </span>
                <span className="t-meta">{durationLabel((to - from) / 60000)} of overlap. Change one of them.</span>
              </span>
            </div>

            {[a, b].map((appt) => (
              <ConflictOption key={appt.id} api={api} appt={appt} personId={conflict.personId} />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function ConflictOption({ api, appt, personId }: { api: SheetApi; appt: Appointment; personId: string }) {
  const e = useEntities();
  const job = e.job(appt.jobId);
  const customer = e.customer(job.customerId);
  const crew = appt.crewIds.map((id) => e.person(id)).filter(Boolean) as Person[];

  return (
    <div className="card pad stack gap-2 sch-option">
      <div className="hrow">
        <span className="grow">
          <span className="t-row block truncate">{job.title}</span>
          <span className="t-meta">{customer.name} · <span className="t-num">{shortRange(appt.startAt, appt.endAt)}</span></span>
        </span>
        <span className="hrow" style={{ gap: 3 }}>
          {crew.map((p) => <Avatar key={p.id} name={p.name} size={22} tone={p.avatarTone} />)}
        </span>
      </div>
      <div className="sch-option-acts">
        <Button size="sm" variant="secondary" icon="clock" onClick={() => api.push((x) => <ResolveMoveStep api={x} apptId={appt.id} />)}>
          Move this
        </Button>
        <Button size="sm" variant="secondary" icon="user" onClick={() => api.push((x) => <ResolveSwapStep api={x} apptId={appt.id} personId={personId} />)}>
          Hand it off
        </Button>
      </div>
    </div>
  );
}

function ResolveMoveStep({ api, apptId }: { api: SheetApi; apptId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const saver = useSaver();
  const appt = db.appointments.find((a) => a.id === apptId)!;
  const job = e.job(appt.jobId);
  const slots = useMemo(() => freeSlots(db, appt), [db, appt]);
  const dur = (ms(appt.endAt) - ms(appt.startAt)) / 60000;

  return (
    <>
      <SheetHead api={api} title="Move to a free slot" subtitle={job.title} icon="clock" />
      <div className="sheet-body">
        <p className="t-meta sch-note">
          {durationLabel(dur)} block. These days the whole crew is open.
          {saver.state !== "idle" && <span className={`save-${saver.state}`}> {SAVE_LABEL[saver.state]}</span>}
        </p>
        {slots.length === 0 ? (
          <div className="card"><EmptyState title="No free day in two weeks" body="Hand it off instead." /></div>
        ) : (
          <div className="list">
            {slots.map((iso) => (
              <Pressable
                key={iso}
                className="row"
                onClick={async () => {
                  haptic("medium");
                  const ok = await saver.run(commit((d) => applyMove(d, apptId, iso)));
                  if (ok) { toast({ text: `Moved to ${dayStamp(dayOffsetOf(iso))}`, tone: "success" }); api.close(); }
                  else toast({ text: "Couldn't save. Retry.", tone: "danger" });
                }}
              >
                <span className="row-body">
                  <span className="t-row">{dayStamp(dayOffsetOf(iso))}</span>
                  <span className="t-meta t-num">{shortRange(iso, new Date(ms(iso) + dur * 60000).toISOString())}</span>
                </span>
                <Icon name="chevron" size={17} className="dimmer" />
              </Pressable>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ResolveSwapStep({ api, apptId, personId }: { api: SheetApi; apptId: string; personId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const saver = useSaver();
  const appt = db.appointments.find((a) => a.id === apptId)!;
  const out = e.person(personId);
  const s = ms(appt.startAt);
  const en = ms(appt.endAt);
  const free = db.people.filter((p) => !appt.crewIds.includes(p.id) && !personBusy(db, p.id, s, en, apptId));

  return (
    <>
      <SheetHead
        api={api}
        title={`Take ${out ? first(out.name) : "them"} off`}
        subtitle={`${shortRange(appt.startAt, appt.endAt)} · who covers it`}
        icon="user"
      />
      <div className="sheet-body">
        <p className="t-meta sch-note">
          Only people with nothing else booked in this window.
          {saver.state !== "idle" && <span className={`save-${saver.state}`}> {SAVE_LABEL[saver.state]}</span>}
        </p>
        {free.length === 0 ? (
          <div className="card"><EmptyState title="Everyone is busy" body="Move one of the two jobs instead." /></div>
        ) : (
          <div className="list">
            {free.map((p) => (
              <Pressable
                key={p.id}
                className="row"
                onClick={async () => {
                  haptic("medium");
                  const ok = await saver.run(commit((d) => applySwap(d, apptId, personId, p.id)));
                  if (ok) { toast({ text: `${first(p.name)} takes this job`, tone: "success" }); api.close(); }
                  else toast({ text: "Couldn't save. Retry.", tone: "danger" });
                }}
              >
                <span className="row-lead"><Avatar name={p.name} size={34} tone={p.avatarTone} /></span>
                <span className="row-body">
                  <span className="t-row">{p.name}</span>
                  <span className="t-meta">{ROLE_LABEL[p.role]} · free all window</span>
                </span>
                <Icon name="chevron" size={17} className="dimmer" />
              </Pressable>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------- booking -------------------------------- */

function PickJobSheet({ api, jobs, onPick }: { api: SheetApi; jobs: Job[]; onPick: (jobId: string) => void }) {
  const e = useEntities();
  return (
    <>
      <SheetHead api={api} title="Book work" subtitle={`${jobs.length} waiting for a date`} icon="plus" />
      <div className="sheet-body scroll" data-sheet-scroll style={{ maxHeight: 460 }}>
        <div className="list">
          {jobs.map((j) => {
            const c = e.customer(j.customerId);
            return (
              <Pressable key={j.id} className="row" onClick={() => { api.close(); onPick(j.id); }}>
                <span className="row-body">
                  <span className="t-row truncate">{c.name}</span>
                  <span className="t-meta truncate">{j.title}</span>
                </span>
                <Icon name="chevron" size={17} className="dimmer" />
              </Pressable>
            );
          })}
        </div>
      </div>
    </>
  );
}

function BookSheet({ api, jobId, onBooked }: { api: SheetApi; jobId: string; onBooked: (d: number) => void }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const saver = useSaver();
  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const prop = e.property(job.propertyId);

  const [crewIds, setCrewIds] = useState<string[]>(() => (job.crewIds.length ? job.crewIds : job.ownerId ? [job.ownerId] : []));
  const [hours, setHours] = useState(8);
  const [slot, setSlot] = useState<string | null>(null);

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let off = 0; off <= 13 && out.length < 6; off++) {
      const starts: Array<[number, number]> = hours > 4 ? [[7, 30], [8, 0]] : [[8, 0], [10, 0], [13, 0], [14, 30]];
      for (const [hh, mm] of starts) {
        const s = ms(onDay(off, hh, mm));
        const en = s + hours * 3600000;
        if (s <= NOW.getTime()) continue;
        if (crewIds.some((id) => personBusy(db, id, s, en))) continue;
        out.push(new Date(s).toISOString());
        break;
      }
    }
    return out;
  }, [db, crewIds, hours]);

  useEffect(() => { if (slot && !slots.includes(slot)) setSlot(null); }, [slots, slot]);

  const ready = crewIds.length > 0 && slot !== null;

  return (
    <>
      <SheetHead api={api} title="Book it" subtitle={`${customer.name} · ${prop.city}`} icon="schedule" />
      <div className="sheet-body scroll stack gap-3" data-sheet-scroll style={{ maxHeight: 470 }}>
        <div className="card pad">
          <p className="t-row">{job.title}</p>
          <p className="t-meta">{job.scopeSummary}</p>
        </div>

        <div className="stack gap-2">
          <p className="sec-title">Who goes</p>
          <div className="chip-row is-wrap">
            {db.people.map((p) => {
              const on = crewIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  className={`chip${on ? " is-on" : ""}`}
                  onClick={() => { haptic("select"); setCrewIds((c) => (on ? c.filter((x) => x !== p.id) : [...c, p.id])); }}
                >
                  {first(p.name)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="stack gap-2">
          <p className="sec-title">How long</p>
          <Segmented
            value={String(hours)}
            onChange={(v: string) => setHours(Number(v))}
            options={[{ value: "2", label: "2h" }, { value: "4", label: "Half day" }, { value: "8", label: "Full day" }]}
          />
        </div>

        <div className="stack gap-2">
          <p className="sec-title">First open slot</p>
          {crewIds.length === 0 ? (
            <div className="card"><EmptyState title="Pick a crew first" body="Slots depend on who is going." /></div>
          ) : slots.length === 0 ? (
            <div className="card"><EmptyState title="No open slot in two weeks" body="This crew is fully booked. Try fewer people or a shorter block." /></div>
          ) : (
            <div className="list">
              {slots.map((iso) => (
                <Pressable
                  key={iso}
                  className={`row row-dense${slot === iso ? " is-selected" : ""}`}
                  onClick={() => { haptic("select"); setSlot(iso); }}
                >
                  <span className="row-body">
                    <span className="t-row">{dayStamp(dayOffsetOf(iso))}</span>
                    <span className="t-meta t-num">{shortRange(iso, new Date(ms(iso) + hours * 3600000).toISOString())}</span>
                  </span>
                  {slot === iso && <Icon name="check" size={18} strokeWidth={2.2} />}
                </Pressable>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="sheet-foot">
        {saver.state !== "idle" && <p className={`t-meta save-${saver.state}`}>{SAVE_LABEL[saver.state]}</p>}
        <Button
          full disabled={!ready} pending={saver.state === "saving"}
          onClick={async () => {
            if (!slot) return;
            haptic("medium");
            const ok = await saver.run(commit((d) => applyBook(d, jobId, crewIds, slot, hours)));
            if (ok) {
              onBooked(dayOffsetOf(slot));
              toast({ text: `Pencilled in for ${dayStamp(dayOffsetOf(slot))}`, tone: "success" });
              api.close();
            } else toast({ text: "Couldn't save. Retry.", tone: "danger" });
          }}
        >
          {slot ? `Pencil in ${dayStamp(dayOffsetOf(slot))}` : "Pick a slot"}
        </Button>
      </div>
    </>
  );
}

/* ------------------------------ crew filter ------------------------------ */

function CrewFilterSheet({
  api, value, onChange,
}: { api: SheetApi; value: string[]; onChange: (v: string[]) => void }) {
  const { db } = useDB();
  return (
    <>
      <SheetHead api={api} title="Filter by crew" subtitle="Show one person's day" icon="filter" />
      <div className="sheet-body">
        <div className="list">
          {db.people.map((p) => {
            const on = value.includes(p.id);
            return (
              <Pressable
                key={p.id}
                className={`row${on ? " is-selected" : ""}`}
                onClick={() => { haptic("select"); onChange(on ? value.filter((x) => x !== p.id) : [...value, p.id]); }}
              >
                <span className="row-lead"><Avatar name={p.name} size={34} tone={p.avatarTone} /></span>
                <span className="row-body">
                  <span className="t-row">{p.name}</span>
                  <span className="t-meta">{ROLE_LABEL[p.role]}</span>
                </span>
                {on && <Icon name="check" size={18} strokeWidth={2.2} />}
              </Pressable>
            );
          })}
        </div>
      </div>
      <div className="sheet-foot">
        <Button full onClick={api.close}>Show the board</Button>
        {value.length > 0 && <Button variant="quiet" full onClick={() => onChange([])}>Clear filters</Button>}
      </div>
    </>
  );
}
