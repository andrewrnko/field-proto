/* Close out the day.
 *
 * A full-screen pushed flow, not a sheet: it is five decisions long, it is the
 * only thing the user is doing, and half of it happens standing next to a truck
 * with one glove off. Same shape as the inspection flow — one question per
 * step, tap-first everywhere, nothing required to be typed.
 *
 * Every step writes through commit() as it is left, so an abandoned close-out
 * still leaves the hours banked. */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../../ui/Icon";
import { Avatar, Button, Field, Pressable, Segmented, Skeleton, useToast } from "../../ui/primitives";
import { BLOCKER_SHORT, photoSrc } from "../../ui/domain";
import { Obj, type ObjHue, type ObjName } from "../../ui/Obj";
import { useNav } from "../../ui/Nav";
import { SAVE_LABEL, useDB, useEntities, useSaver } from "../../data/store";
import { NOW, sameDay } from "../../data/clock";
import { money, time } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import {
  LABOR_RATE_CENTS, TASK_LABEL, hoursOf,
  type BlockerKind, type DB, type TimeEntry,
} from "../../data/types";
import { decimalHours, dur, endPresets, pendingMaterials } from "./closeout";
import "./closeout.css";

const STEPS = ["Hours", "What got done", "Photos", "Tomorrow", "Done"] as const;

type Load = "loading" | "ready" | "error";
type PhotoLens = "all" | "today" | "reel";

type BlockerChoice = {
  kind: BlockerKind;
  title: string;
  note: string;
  obj: ObjName;
  hue: ObjHue;
};

const BLOCKERS: BlockerChoice[] = [
  { kind: "none", title: "Nothing is stopping us", note: "Tomorrow starts on time.", obj: "check", hue: "emerald" },
  { kind: "awaiting_materials", title: "Waiting on material", note: "Something has not landed yet.", obj: "van", hue: "amber" },
  { kind: "awaiting_customer", title: "Waiting on the customer", note: "A decision or an answer we don't have.", obj: "bubble", hue: "violet" },
  { kind: "weather", title: "Weather", note: "Rain or wind stops the work.", obj: "drop", hue: "cyan" },
  { kind: "crew_short", title: "Crew short", note: "Not enough hands to keep moving.", obj: "tools", hue: "indigo" },
];

export function CloseOutFlow({ jobId, entryIds }: { jobId: string; entryIds: string[] }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const { pop } = useNav();
  const toast = useToast();
  const saver = useSaver();

  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const photos = e.photos(jobId);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [load, setLoad] = useState<Load>("loading");

  /* the shift as it was when the flow opened — rows must not vanish the moment
     they are clocked out, they have to show their result */
  const entries = useMemo(
    () => entryIds.map((id) => db.time.find((t) => t.id === id)).filter((t): t is TimeEntry => !!t),
    [db.time, entryIds],
  );
  const stillOpen = entries.filter((t) => t.endAt === null);

  const [ends, setEnds] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Array<TimeEntry["task"]>>(() => [...new Set(entries.map((t) => t.task))]);
  const [note, setNote] = useState("");
  const [lens, setLens] = useState<PhotoLens>("all");
  const [reel, setReel] = useState<string[]>(() => photos.filter((p) => p.forReel).map((p) => p.id));
  const [blocker, setBlocker] = useState<BlockerKind | null>(job.blocker?.kind ?? null);
  const [materialId, setMaterialId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setLoad(navigator.onLine === false ? "error" : "ready"), 420);
    return () => window.clearTimeout(t);
  }, []);

  const reload = () => {
    setLoad("loading");
    window.setTimeout(() => setLoad(navigator.onLine === false ? "error" : "ready"), 420);
  };

  const endOf = (t: TimeEntry) => t.endAt ?? ends[t.id] ?? endPresets(t)[0].iso;
  const hoursOfDraft = (t: TimeEntry) => hoursOf({ ...t, endAt: endOf(t) }, NOW);
  const loggedHours = entries.reduce((s, t) => s + (t.endAt ? hoursOf(t, NOW) : 0), 0);
  const materials = pendingMaterials(db, jobId);

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); haptic("light"); };

  /* ---------------------------- the writes ---------------------------- */

  const clockOut = async (ids: string[]) => {
    const targets = entries.filter((t) => ids.includes(t.id) && t.endAt === null);
    if (targets.length === 0) return;
    const at = Object.fromEntries(targets.map((t) => [t.id, endOf(t)]));
    haptic("medium");
    const ok = await saver.run(commit((d) => {
      for (const t of targets) {
        const row = d.time.find((x) => x.id === t.id);
        if (!row || row.endAt) continue;
        row.endAt = at[t.id];
        const person = d.people.find((p) => p.id === row.personId);
        const first = person?.name.split(" ")[0] ?? "Crew";
        d.activity.push({
          id: `act-out-${row.id}`, jobId, at: NOW.toISOString(), actorId: row.personId, kind: "note",
          text: `${first} clocked out — ${decimalHours(hoursOf(row, NOW))} on ${TASK_LABEL[row.task].toLowerCase()}`,
          meta: `${time(row.startAt)} – ${time(row.endAt)}`,
        });
      }
      return d;
    }, { latencyMs: 480 }));
    if (!ok) { haptic("warning"); toast({ text: "Couldn't clock out. Retry.", tone: "danger" }); return; }
    haptic("success");
  };

  const saveWork = async () => {
    const ok = await saver.run(commit((d) => {
      const labels = tasks.map((t) => TASK_LABEL[t].toLowerCase());
      for (const id of entryIds) {
        const row = d.time.find((x) => x.id === id);
        if (row && note.trim() && !row.note) row.note = note.trim();
      }
      d.activity.push({
        id: `act-day-${jobId}-${entryIds.join("-")}`, jobId, at: NOW.toISOString(), actorId: d.me, kind: "note",
        text: labels.length ? `Day logged — ${labels.join(", ")}` : "Day logged",
        meta: note.trim() || undefined,
      });
      return d;
    }, { latencyMs: 420 }));
    if (!ok) { toast({ text: "Couldn't save. Retry.", tone: "danger" }); return false; }
    return true;
  };

  const savePhotos = async () => {
    const before = photos.filter((p) => p.forReel).map((p) => p.id);
    const added = reel.filter((id) => !before.includes(id));
    const removed = before.filter((id) => !reel.includes(id));
    if (added.length === 0 && removed.length === 0) return true;
    const ok = await saver.run(commit((d) => {
      for (const p of d.photos) {
        if (p.jobId !== jobId) continue;
        p.forReel = reel.includes(p.id) ? true : undefined;
      }
      if (added.length) {
        d.activity.push({
          id: `act-reel-${jobId}-${reel.length}`, jobId, at: NOW.toISOString(), actorId: d.me, kind: "photo",
          text: `${added.length} photo${added.length === 1 ? "" : "s"} marked for the reel`,
        });
      }
      return d;
    }, { latencyMs: 420 }));
    if (!ok) { toast({ text: "Couldn't save. Retry.", tone: "danger" }); return false; }
    return true;
  };

  const saveBlocker = async () => {
    const chosen = BLOCKERS.find((b) => b.kind === blocker);
    const material = materials.find((m) => m.id === materialId);
    const ok = await saver.run(commit((d) => {
      const row = d.jobs.find((j) => j.id === jobId);
      if (!row) return d;
      if (!chosen || chosen.kind === "none") {
        if (row.blocker) {
          d.activity.push({
            id: `act-unblock-${jobId}`, jobId, at: NOW.toISOString(), actorId: d.me, kind: "note",
            text: "Blocker cleared at close-out",
          });
        }
        row.blocker = null;
      } else {
        const label = chosen.kind === "awaiting_materials"
          ? material ? `Waiting on ${material.item} from ${material.supplier}` : "Waiting on material"
          : chosen.kind === "awaiting_customer" ? "Waiting on the customer"
            : chosen.kind === "weather" ? "Weather hold" : "Crew short";
        row.blocker = { kind: chosen.kind, label, since: NOW.toISOString(), owner: d.me };
        d.activity.push({
          id: `act-block-${jobId}-${chosen.kind}`, jobId, at: NOW.toISOString(), actorId: d.me, kind: "note",
          text: `Flagged at close-out: ${label}`,
        });
      }
      return d;
    }, { latencyMs: 480 }));
    if (!ok) { toast({ text: "Couldn't save. Retry.", tone: "danger" }); return false; }
    haptic("success");
    return true;
  };

  /* ----------------------------- the steps ----------------------------- */

  const advance = async () => {
    if (step === 1) { if (!(await saveWork())) return; }
    if (step === 2) { if (!(await savePhotos())) return; }
    if (step === 3) { if (!(await saveBlocker())) return; }
    go(step + 1);
  };

  const canAdvance = [stillOpen.length === 0, tasks.length > 0, true, blocker !== null, true][step];
  const busy = saver.state === "saving";

  const shownPhotos = photos.filter((p) =>
    lens === "reel" ? reel.includes(p.id)
      : lens === "today" ? sameDay(p.capturedAt, NOW)
        : true);
  const flagged = db.photos.filter((p) => p.jobId === jobId && p.forReel).length;

  return (
    <div className="cls">
      <div className="cls-top">
        {step === 0
          ? <Pressable className="round round-plain" style={{ width: 34, height: 34 }} onClick={pop} aria-label="Cancel"><Icon name="close" size={19} /></Pressable>
          : <Pressable className="round round-plain" style={{ width: 34, height: 34 }} onClick={() => go(step - 1)} aria-label="Back"><Icon name="chevronLeft" size={20} /></Pressable>}
        <div className="cls-title">
          <h2 className="t-row">{STEPS[step]}</h2>
          <p className="t-meta truncate">{customer.name} · {job.title}</p>
        </div>
        <span />
      </div>
      <div className="cls-progress">
        <motion.i animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={SPRING.sheet} />
      </div>

      <div className="scroll cls-body">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ x: dir * 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -28, opacity: 0 }}
            transition={SPRING.sheet}
          >
            {/* ------------------------- 1. hours ------------------------- */}
            {step === 0 && (
              <>
                <div className="cls-q">
                  <h3 className="t-section">Who is still on the clock?</h3>
                  <p className="t-body dim">Check the end time before you close it. This is what the job gets charged.</p>
                </div>

                {load === "loading" ? (
                  <div className="cls-shifts">
                    {entryIds.map((id) => (
                      <div key={id} className="cls-shift">
                        <Skeleton w={40} h={40} r={20} />
                        <span className="grow stack gap-1"><Skeleton w={130} h={17} /><Skeleton w={92} h={13} /></span>
                        <Skeleton w={62} h={22} />
                      </div>
                    ))}
                  </div>
                ) : load === "error" ? (
                  <div className="empty">
                    <p className="t-section">Couldn't load the timesheet</p>
                    <p className="t-body dim">Hours are kept on this device until they sync. Try again.</p>
                    <Button variant="secondary" icon="refresh" onClick={reload}>Retry</Button>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="empty">
                    <p className="t-section">Nobody is on the clock</p>
                    <p className="t-body dim">Clock in from the job record and the day will close out from here.</p>
                    <Button variant="secondary" onClick={pop}>Back to today</Button>
                  </div>
                ) : (
                  <div className="cls-shifts">
                    {entries.map((t) => (
                      <ShiftRow
                        key={t.id}
                        entry={t}
                        end={endOf(t)}
                        hours={hoursOfDraft(t)}
                        busy={busy}
                        onEnd={(iso) => { haptic("select"); setEnds((s) => ({ ...s, [t.id]: iso })); }}
                        onClockOut={() => clockOut([t.id])}
                      />
                    ))}
                  </div>
                )}

                {load === "ready" && entries.length > 0 && (
                  <p className="t-meta cls-note">
                    {decimalHours(entries.reduce((s, t) => s + hoursOfDraft(t), 0))} across {entries.length} {entries.length === 1 ? "person" : "people"}
                    {" · "}{money(Math.round(entries.reduce((s, t) => s + hoursOfDraft(t), 0) * LABOR_RATE_CENTS))} of labour at the blended rate
                  </p>
                )}
              </>
            )}

            {/* ---------------------- 2. what got done ---------------------- */}
            {step === 1 && (
              <>
                <div className="cls-q">
                  <h3 className="t-section">What did the day go on?</h3>
                  <p className="t-body dim">Tap everything that took real time. This is how an overrun gets explained later.</p>
                </div>
                <div className="cls-tasks">
                  {(Object.keys(TASK_LABEL) as Array<TimeEntry["task"]>).map((key) => {
                    const on = tasks.includes(key);
                    return (
                      <Pressable
                        key={key}
                        className={`cls-task${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        onClick={() => {
                          haptic("select");
                          setTasks((s) => (on ? s.filter((x) => x !== key) : [...s, key]));
                        }}
                      >
                        {TASK_LABEL[key]}
                      </Pressable>
                    );
                  })}
                </div>
                <div className="cls-field">
                  <Field
                    label="Anything worth saying (optional)"
                    placeholder="Girder splice was worse than the photos"
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                    hint="One line, the way you'd say it in the truck."
                  />
                </div>
              </>
            )}

            {/* -------------------------- 3. photos -------------------------- */}
            {step === 2 && (
              <>
                <div className="cls-q">
                  <h3 className="t-section">Anything worth posting?</h3>
                  <p className="t-body dim">
                    {reel.length === 0
                      ? "Nothing is marked. Tap a photo to flag it while you still remember the shot."
                      : `${reel.length} marked for the reel. Tap one again to unmark it.`}
                  </p>
                </div>

                <Segmented
                  size="sm" value={lens} onChange={setLens}
                  options={[
                    { value: "all", label: "All", count: photos.length },
                    { value: "today", label: "Today", count: photos.filter((p) => sameDay(p.capturedAt, NOW)).length },
                    { value: "reel", label: "Marked", count: reel.length },
                  ]}
                />

                <div className="cls-photos-wrap">
                  {load === "loading" ? (
                    <div className="cls-photos">
                      {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="skeleton cls-photo-skel" aria-hidden />)}
                    </div>
                  ) : load === "error" ? (
                    <div className="empty">
                      <p className="t-section">Couldn't load photos</p>
                      <p className="t-body dim">They may still be queued on the phone that shot them.</p>
                      <Button variant="secondary" icon="refresh" onClick={reload}>Retry</Button>
                    </div>
                  ) : photos.length === 0 ? (
                    <div className="empty">
                      <p className="t-section">No photos on this job yet</p>
                      <p className="t-body dim">Shoot one from the job record and it will show up here.</p>
                    </div>
                  ) : shownPhotos.length === 0 ? (
                    <div className="empty">
                      <p className="t-section">No photos match</p>
                      <p className="t-body dim">
                        {lens === "reel" ? "Nothing is marked for the reel yet." : "Nothing was shot today."}
                      </p>
                      <Button variant="secondary" onClick={() => { haptic("select"); setLens("all"); }}>Clear filters</Button>
                    </div>
                  ) : (
                    <div className="cls-photos">
                      {shownPhotos.map((p) => {
                        const on = reel.includes(p.id);
                        return (
                          <Pressable
                            key={p.id}
                            className={`cls-photo${on ? " is-on" : ""}`}
                            aria-pressed={on}
                            aria-label={`Mark for the reel: ${p.caption ?? "photo"}`}
                            onClick={() => {
                              haptic(on ? "light" : "medium");
                              setReel((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]));
                            }}
                          >
                            <img src={photoSrc(p)} alt="" loading="lazy" />
                            {on && (
                              <span className="cls-photo-flag">
                                <Icon name="check" size={13} strokeWidth={2.8} />
                              </span>
                            )}
                          </Pressable>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="t-meta cls-note">
                  {flagged > 0 && `${flagged} ${flagged === 1 ? "is" : "are"} already saved. `}
                  Marked photos go to whoever cuts the reels. Nothing is sent to a customer.
                </p>
              </>
            )}

            {/* ------------------------- 4. tomorrow ------------------------- */}
            {step === 3 && (
              <>
                <div className="cls-q">
                  <h3 className="t-section">Anything stopping you tomorrow?</h3>
                  <p className="t-body dim">Say it now and the office can fix it tonight. Say it at 7am and it costs a day.</p>
                </div>
                <div className="cls-blockers">
                  {BLOCKERS.map((b) => {
                    const on = blocker === b.kind;
                    return (
                      <div key={b.kind} className="cls-blocker-wrap">
                        <Pressable
                          className={`cls-blocker${on ? " is-on" : ""}`}
                          aria-pressed={on}
                          data-shot={`blocker-${b.kind}`}
                          onClick={() => {
                            haptic(b.kind === "none" ? "select" : "warning");
                            setBlocker(b.kind);
                            if (b.kind === "awaiting_materials" && !materialId) setMaterialId(materials[0]?.id ?? null);
                          }}
                        >
                          <Obj name={b.obj} hue={b.hue} size={40} />
                          <span className="grow">
                            <span className="t-row block">{b.title}</span>
                            <span className="t-meta block">{b.note}</span>
                          </span>
                          {on && <Icon name="check" size={19} strokeWidth={2.4} />}
                        </Pressable>

                        {on && b.kind === "awaiting_materials" && (
                          <motion.div
                            className="cls-mats"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={SPRING.sheet}
                          >
                            {materials.length === 0 ? (
                              <p className="t-meta cls-mat-empty">Nothing is on order for this job — the office will have to raise it.</p>
                            ) : materials.map((m) => (
                              <Pressable
                                key={m.id}
                                className={`cls-mat${materialId === m.id ? " is-on" : ""}`}
                                aria-pressed={materialId === m.id}
                                onClick={() => { haptic("select"); setMaterialId(m.id); }}
                              >
                                <span className="cls-mat-dot" aria-hidden />
                                <span className="grow">
                                  <span className="t-body block truncate">{m.item}</span>
                                  <span className="t-meta block truncate">{m.qty} · {m.supplier}</span>
                                </span>
                              </Pressable>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* --------------------------- 5. done --------------------------- */}
            {step === 4 && (
              <div className="cls-done">
                <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.pop}>
                  <Obj name="check" hue="emerald" size={72} />
                </motion.span>
                <h3 className="t-section">The day is closed</h3>
                <div className="cls-summary">
                  <div className="cls-sum-row">
                    <span className="t-body dim">Hours logged</span>
                    <span className="t-row t-num">{decimalHours(loggedHours)}</span>
                  </div>
                  <div className="cls-sum-row">
                    <span className="t-body dim">Labour added to the job</span>
                    <span className="t-row t-num">{money(Math.round(loggedHours * LABOR_RATE_CENTS))}</span>
                  </div>
                  <div className="cls-sum-row">
                    <span className="t-body dim">Marked for the reel</span>
                    <span className="t-row t-num">{reel.length}</span>
                  </div>
                  <div className="cls-sum-row">
                    <span className="t-body dim">Blocking tomorrow</span>
                    <span className={`t-row${blocker && blocker !== "none" ? " tone-warning" : ""}`}>
                      {blockerSummary(db, jobId)}
                    </span>
                  </div>
                </div>
                <p className="t-meta cls-note">
                  {customer.name.split(" ")[0]}'s job now shows {decimalHours(loggedHours)} more labour than it did this morning.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="cls-foot">
        {step === 4 ? (
          <Button full size="lg" icon="check" onClick={() => { haptic("success"); pop(); }} data-shot="closeout-done">Done</Button>
        ) : step === 0 && stillOpen.length > 0 ? (
          <Button full size="lg" pending={busy} onClick={() => clockOut(stillOpen.map((t) => t.id))} data-shot="clock-out-all">
            {stillOpen.length === 1 ? "Clock out" : `Clock out all ${stillOpen.length}`}
          </Button>
        ) : (
          <Button full size="lg" disabled={!canAdvance} pending={busy} onClick={advance} iconAfter="arrowRight" data-shot="closeout-next">
            Continue
          </Button>
        )}
        <p className={`t-meta cls-status save-${saver.state}`}>
          {saver.state === "idle"
            ? `Step ${step + 1} of ${STEPS.length}`
            : SAVE_LABEL[saver.state]}
        </p>
      </div>
    </div>
  );
}

function blockerSummary(db: DB, jobId: string) {
  /* the short form on the summary; the full sentence lives on the record */
  const b = db.jobs.find((j) => j.id === jobId)?.blocker;
  return b ? BLOCKER_SHORT[b.kind] ?? b.label : "Nothing";
}

/* ------------------------------- a shift ------------------------------- */

function ShiftRow({
  entry, end, hours, busy, onEnd, onClockOut,
}: {
  entry: TimeEntry; end: string; hours: number; busy: boolean;
  onEnd: (iso: string) => void; onClockOut: () => void;
}) {
  const e = useEntities();
  const person = e.person(entry.personId);
  const out = entry.endAt !== null;
  const presets = endPresets(entry);

  return (
    <div className={`cls-shift${out ? " is-out" : ""}`}>
      <div className="cls-shift-head">
        <Avatar name={person?.name ?? "Crew"} size={40} tone={person?.avatarTone ?? 0} />
        <span className="grow">
          <span className="t-row block truncate">{person?.name ?? "Unknown"}</span>
          <span className="t-meta block truncate">
            {out
              ? `${time(entry.startAt)} – ${time(entry.endAt!)} · ${TASK_LABEL[entry.task]}`
              : `In at ${time(entry.startAt)} · ${TASK_LABEL[entry.task]}`}
          </span>
        </span>
        <span className={`cls-shift-h t-num${out ? "" : " is-live"}`}>{dur(hours)}</span>
      </div>

      {out ? (
        <p className="cls-shift-done">
          <Icon name="check" size={15} strokeWidth={2.4} />
          Clocked out at {time(entry.endAt!)}
        </p>
      ) : (
        <>
          <div className="cls-ends">
            {presets.map((p) => (
              <Pressable
                key={p.key}
                className={`cls-end${!p.disabled && p.iso === end ? " is-on" : ""}`}
                aria-pressed={!p.disabled && p.iso === end}
                disabled={p.disabled}
                onClick={() => onEnd(p.iso)}
              >
                <span>{p.label}</span>
                <em className="t-num">{p.disabled ? "—" : time(p.iso)}</em>
              </Pressable>
            ))}
          </div>
          {presets.some((p) => p.disabled) && (
            <p className="t-meta cls-end-note">
              Only {dur(hours)} on the clock — there is nothing to round back to yet.
            </p>
          )}
          <Button variant="secondary" full disabled={busy} onClick={onClockOut}>
            Clock out {person?.name.split(" ")[0] ?? ""} at {time(end)}
          </Button>
        </>
      )}
    </div>
  );
}
