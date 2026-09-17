/* The operating sections of a job record: labour and cost while the job is
 * open, the materials that can stop it, and the reasons to come back after it
 * closes. These are the three things that decide whether a rot job made money,
 * and none of them were in the sales-pipeline model the app started with. */
import { useState } from "react";
import { motion } from "motion/react";
import { Icon } from "../../ui/Icon";
import { Avatar, Button, Pressable, useToast } from "../../ui/primitives";
import { MoneyRow, SheetHead, Tag, type Hue } from "../../ui/domain";
import type { ObjHue } from "../../ui/Obj";
import { Obj } from "../../ui/Obj";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useDB, useEntities, useSaver, SAVE_LABEL } from "../../data/store";
import { NOW } from "../../data/clock";
import { dateLabel, money, relative, time } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import {
  CALLBACK_LABEL, LABOR_RATE_CENTS, MATERIAL_STATE_LABEL, TASK_LABEL,
  hoursOf, type Callback, type MaterialOrder,
} from "../../data/types";
import { hoursByPerson, hoursByTask, jobCost } from "./costing";
import "./ops.css";

const hrs = (h: number) => `${h.toFixed(h < 10 ? 1 : 0)} h`;

/* ----------------------- labour and cost ----------------------- */

export function CostSection({ jobId }: { jobId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const { present } = useSheets();
  const saver = useSaver();
  const job = e.job(jobId);
  const cost = jobCost(db, job);
  const me = e.person(db.me);
  const myOpen = db.time.find((t) => t.jobId === jobId && t.personId === db.me && t.endAt === null);

  if (cost.hours === 0 && !myOpen) return null;

  const over = cost.estimatedHours > 0 && cost.hours > cost.estimatedHours;
  const pct = cost.estimatedHours > 0 ? Math.min(cost.hours / cost.estimatedHours, 1.6) : 0;

  const clock = () =>
    saver.run(commit((d) => {
      if (myOpen) {
        const t = d.time.find((x) => x.id === myOpen.id)!;
        t.endAt = NOW.toISOString();
        d.activity.push({
          id: `act-clock-${Date.now()}`, jobId, at: NOW.toISOString(), actorId: d.me,
          kind: "note", text: `${me?.name.split(" ")[0]} clocked out`,
          meta: `${hrs(hoursOf(t, NOW))} on ${TASK_LABEL[t.task].toLowerCase()}`,
        });
      } else {
        d.time.push({
          id: `t-new-${Date.now()}`, jobId, personId: d.me,
          startAt: NOW.toISOString(), endAt: null, task: "framing", onSite: true,
        });
        d.activity.push({
          id: `act-clock-${Date.now()}`, jobId, at: NOW.toISOString(), actorId: d.me,
          kind: "note", text: `${me?.name.split(" ")[0]} clocked in`,
        });
      }
      return d;
    }));

  return (
    <section className="rec-sec">
      <h2>Where the hours went</h2>

      <Pressable className="burn" onClick={() => present((api) => <LabourSheet api={api} jobId={jobId} />, { detents: ["auto", 0.92] })}>
        <div className="burn-top">
          <div>
            <p className="burn-hours">{hrs(cost.hours)}</p>
            <p className="burn-of">
              {cost.estimatedHours > 0 ? `of ${hrs(cost.estimatedHours)} priced` : "no hours priced on this job"}
            </p>
          </div>
          <div className="burn-right">
            <p className="burn-cost">{money(cost.spentCents, { cents: false })}</p>
            <p className="burn-of">spent of {money(cost.budgetCents, { cents: false })}</p>
          </div>
        </div>
        <div className={`burn-bar${over ? " is-over" : ""}`}>
          <motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 1) * 100}%` }} transition={{ ...SPRING.sheet, delay: 0.08 }} />
          {over && <span className="burn-over" style={{ width: `${Math.min((pct - 1) / 0.6, 1) * 100}%` }} />}
        </div>
        <p className={`burn-note${over ? " is-over" : ""}`}>
          {over
            ? `${hrs(cost.hours - cost.estimatedHours)} past the estimate — ${money(Math.round((cost.hours - cost.estimatedHours) * LABOR_RATE_CENTS), { cents: false })} out of the ${money(job.valueCents - cost.budgetCents, { cents: false })} of margin you priced`
            : cost.estimatedHours > 0
              ? `${hrs(cost.estimatedHours - cost.hours)} of priced labour left`
              : `${money(job.valueCents - cost.spentCents, { cents: false })} of the contract not spent yet`}
        </p>
      </Pressable>

      {cost.unclosed.length > 0 && (
        <div className="stale">
          <Obj name="warning" hue="amber" size={40} />
          <span className="grow">
            <span className="stale-title">
              {cost.unclosed.map((t) => e.person(t.personId)?.name.split(" ")[0]).filter(Boolean).join(" and ")}
              {cost.unclosed.length === 1 ? " never clocked out" : " never clocked out"}
            </span>
            <span className="stale-note">
              Open since {dateLabel(cost.unclosed[0].startAt)}, {time(cost.unclosed[0].startAt)} — left out of the
              hours above so it can't bill itself. Set the real end time.
            </span>
          </span>
          <Button
            size="sm" variant="secondary"
            onClick={() => present((api) => <FixShiftSheet api={api} jobId={jobId} />, { detents: ["auto"] })}
          >
            Fix it
          </Button>
        </div>
      )}

      {cost.onSiteNow.length > 0 && (
        <div className="onsite">
          {cost.onSiteNow.map(({ personId, since, entry }) => {
            const p = e.person(personId);
            return (
              <div key={personId} className="onsite-row">
                <Avatar name={p?.name ?? "?"} size={34} tone={p?.avatarTone ?? 0} />
                <span className="grow">
                  <span className="onsite-name">{p?.name.split(" ")[0]} is on site</span>
                  <span className="onsite-meta">
                    Since {time(since)} · {hrs(hoursOf(entry, NOW))} · {TASK_LABEL[entry.task].toLowerCase()}
                  </span>
                </span>
                <span className="onsite-live" aria-hidden />
              </div>
            );
          })}
        </div>
      )}

      <div className="hrow" style={{ gap: 10 }}>
        <Button
          variant={myOpen ? "secondary" : "primary"}
          icon={myOpen ? "check" : "clock"}
          pending={saver.state === "saving"}
          onClick={() => { haptic("medium"); void clock(); }}
        >
          {myOpen ? `Clock out · ${hrs(hoursOf(myOpen, NOW))}` : "Clock in"}
        </Button>
        {saver.state !== "idle" && <span className={`t-meta save-${saver.state}`}>{SAVE_LABEL[saver.state]}</span>}
      </div>
    </section>
  );
}

/** Correcting a forgotten clock-out: the crew's real leaving time, not now. */
function FixShiftSheet({ api, jobId }: { api: SheetApi; jobId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const cost = jobCost(db, e.job(jobId));

  const close = async (entryId: string, endAt: string, label: string) => {
    setBusy(label);
    const ok = await commit((d) => {
      const t = d.time.find((x) => x.id === entryId)!;
      t.endAt = endAt;
      t.note = undefined;
      const who = d.people.find((p) => p.id === t.personId);
      d.activity.push({
        id: `act-fix-${Date.now()}`, jobId, at: NOW.toISOString(), actorId: d.me,
        kind: "note", text: `Corrected ${who?.name.split(" ")[0]}'s clock-out to ${label}`,
        meta: `${hrs(hoursOf({ ...t, endAt }, NOW))} logged`,
      });
      return d;
    });
    setBusy(null);
    if (!ok) { toast({ text: "Couldn't save. Retry.", tone: "danger" }); return; }
    haptic("success");
    toast({ text: "Shift corrected", tone: "success" });
    api.close();
  };

  return (
    <>
      <SheetHead api={api} title="Never clocked out" subtitle="Pick when they actually left" />
      <div className="sheet-body stack gap-3">
        {cost.unclosed.map((t) => {
          const who = e.person(t.personId);
          const day = new Date(t.startAt);
          const opts = [
            { h: 15, m: 30, label: "3:30 pm" },
            { h: 16, m: 0, label: "4:00 pm" },
            { h: 17, m: 0, label: "5:00 pm" },
          ];
          return (
            <div key={t.id} className="stack gap-2">
              <p className="t-row">{who?.name} · in at {time(t.startAt)} on {dateLabel(t.startAt)}</p>
              <div className="fix-grid">
                {opts.map((o) => {
                  const end = new Date(day); end.setHours(o.h, o.m, 0, 0);
                  const iso = end.toISOString();
                  return (
                    <Button
                      key={o.label} variant="secondary" pending={busy === o.label}
                      onClick={() => { haptic("medium"); void close(t.id, iso, o.label); }}
                    >
                      {o.label}
                    </Button>
                  );
                })}
              </div>
              <p className="t-meta">
                {TASK_LABEL[t.task]} · a {opts[1].label} finish logs{" "}
                {hrs((new Date(day).setHours(16, 0, 0, 0) - new Date(t.startAt).getTime()) / 36e5)} at{" "}
                {money(LABOR_RATE_CENTS)}/h.
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LabourSheet({ api, jobId }: { api: SheetApi; jobId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const job = e.job(jobId);
  const cost = jobCost(db, job);
  const byPerson = hoursByPerson(db, jobId);
  const byTask = hoursByTask(db, jobId);
  const top = byTask[0]?.hours ?? 1;

  return (
    <>
      <SheetHead api={api} title="Labour" subtitle={`${hrs(cost.hours)} clocked on this job`} />
      <div className="sheet-body scroll stack gap-4" data-sheet-scroll>
        <div>
          <MoneyRow label="Labour" cents={cost.laborCents} note={`${hrs(cost.hours)} at ${money(LABOR_RATE_CENTS)}/h`} />
          <MoneyRow label="Materials" cents={cost.materialCents} />
          <MoneyRow label="Spent so far" cents={cost.spentCents} strong tone={cost.spentCents > cost.budgetCents ? "danger" : undefined} />
          <MoneyRow label="Priced to cost" cents={cost.budgetCents} />
        </div>

        <div className="stack gap-2">
          <p className="t-row">Who</p>
          {byPerson.map(({ personId, hours, open }) => {
            const p = e.person(personId);
            return (
              <div key={personId} className="labour-row">
                <Avatar name={p?.name ?? "?"} size={30} tone={p?.avatarTone ?? 0} />
                <span className="grow t-body">{p?.name}</span>
                {open && <Tag hue="teal">on site</Tag>}
                <span className="t-num t-row">{hrs(hours)}</span>
              </div>
            );
          })}
        </div>

        <div className="stack gap-2">
          <p className="t-row">On what</p>
          {byTask.map(({ task, hours }) => (
            <div key={task} className="task-row">
              <span className="task-label t-body">{TASK_LABEL[task]}</span>
              <span className="task-bar"><i style={{ width: `${(hours / top) * 100}%` }} /></span>
              <span className="t-num t-meta">{hrs(hours)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* --------------------------- materials --------------------------- */

const MAT_HUE: Record<MaterialOrder["state"], Hue> = {
  needed: "coral", ordered: "blue", will_call: "amber", delivered: "emerald", backordered: "coral",
};

export function MaterialsSection({ jobId }: { jobId: string }) {
  const { db, commit } = useDB();
  const { present } = useSheets();
  const rows = db.materials.filter((m) => m.jobId === jobId);
  if (rows.length === 0) return null;

  const outstanding = rows.filter((m) => m.state !== "delivered");
  const late = outstanding.filter((m) => new Date(m.neededBy) < NOW);

  return (
    <section className="rec-sec">
      <h2>
        Materials
        {late.length > 0 && <span className="dimmer" style={{ fontWeight: 500 }}> · {late.length} late</span>}
      </h2>
      <div>
        {rows.map((m) => (
          <Pressable
            key={m.id} className="mat-row"
            onClick={() => present((api) => <MaterialSheet api={api} materialId={m.id} commit={commit} />, { detents: ["auto"] })}
          >
            <Obj
              name={m.state === "delivered" ? "check" : m.state === "backordered" ? "warning" : "beam"}
              hue={MAT_HUE[m.state] === "coral" ? "coral" : MAT_HUE[m.state] === "emerald" ? "emerald" : "amber"}
              size={42}
            />
            <span className="grow">
              <span className="mat-item">{m.item}</span>
              <span className="mat-meta">{m.qty} · {m.supplier}</span>
              <span className="mat-tags">
                <Tag hue={MAT_HUE[m.state]}>{MATERIAL_STATE_LABEL[m.state]}</Tag>
                {m.state !== "delivered" && (
                  <span className={`mat-when${new Date(m.neededBy) < NOW ? " is-late" : ""}`}>
                    {m.promisedAt ? `promised ${relative(m.promisedAt, NOW)}` : `needed ${relative(m.neededBy, NOW)}`}
                  </span>
                )}
              </span>
            </span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>
        ))}
      </div>
    </section>
  );
}

function MaterialSheet({
  api, materialId, commit,
}: { api: SheetApi; materialId: string; commit: ReturnType<typeof useDB>["commit"] }) {
  const { db } = useDB();
  const e = useEntities();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const m = db.materials.find((x) => x.id === materialId)!;
  const picker = m.pickedUpBy ? e.person(m.pickedUpBy) : null;

  const set = async (state: MaterialOrder["state"], text: string) => {
    setBusy(true);
    const ok = await commit((d) => {
      const row = d.materials.find((x) => x.id === materialId)!;
      row.state = state;
      if (state === "delivered") row.pickedUpBy = d.me;
      d.activity.push({
        id: `act-mat-${Date.now()}`, jobId: m.jobId, at: NOW.toISOString(), actorId: d.me,
        kind: "note", text, meta: row.item,
      });
      /* a job blocked on this material is no longer blocked once it lands */
      if (state === "delivered") {
        const job = d.jobs.find((j) => j.id === m.jobId);
        if (job?.blocker?.kind === "awaiting_materials") job.blocker = null;
      }
      return d;
    });
    setBusy(false);
    if (!ok) { toast({ text: "Couldn't save. Retry.", tone: "danger" }); return; }
    haptic("success");
    toast({ text, tone: "success" });
    api.close();
  };

  return (
    <>
      <SheetHead api={api} title={m.item} subtitle={`${m.qty} · ${m.supplier}`} />
      <div className="sheet-body stack gap-3">
        <div className="hrow" style={{ gap: 8, flexWrap: "wrap" }}>
          <Tag hue={MAT_HUE[m.state]}>{MATERIAL_STATE_LABEL[m.state]}</Tag>
          <Tag hue={new Date(m.neededBy) < NOW ? "coral" : "neutral"}>Needed {dateLabel(m.neededBy)}</Tag>
          {m.promisedAt && <Tag hue="blue">Promised {dateLabel(m.promisedAt)}</Tag>}
        </div>
        {m.note && <p className="t-body">{m.note}</p>}
        <MoneyRow label="Cost" cents={m.costCents} />
        {picker && <p className="t-meta">Picked up by {picker.name}</p>}
      </div>
      <div className="sheet-foot">
        {m.state === "will_call" && (
          <Button full size="lg" icon="truck" pending={busy} onClick={() => set("delivered", "Picked up the will-call")}>
            I've got it — mark picked up
          </Button>
        )}
        {m.state === "needed" && (
          <Button full size="lg" icon="doc" pending={busy} onClick={() => set("ordered", "Ordered")}>Mark ordered</Button>
        )}
        {m.state === "ordered" && (
          <Button full size="lg" icon="truck" pending={busy} onClick={() => set("delivered", "Landed on site")}>Mark on site</Button>
        )}
        {m.state === "backordered" && (
          <Button full size="lg" icon="phone" pending={busy} onClick={() => { toast({ text: `Calling ${m.supplier}` }); api.close(); }}>
            Call {m.supplier.split(",")[0]}
          </Button>
        )}
        {m.state !== "delivered" && (
          <Button variant="quiet" full onClick={api.close}>Not yet</Button>
        )}
      </div>
    </>
  );
}

/* --------------------------- callbacks --------------------------- */

const CB_OBJ: Record<Callback["kind"], { obj: "drop" | "check" | "bubble" | "clipboard"; hue: ObjHue }> = {
  moisture_recheck: { obj: "drop", hue: "cyan" },
  warranty: { obj: "check", hue: "emerald" },
  review_ask: { obj: "bubble", hue: "violet" },
  punch: { obj: "clipboard", hue: "indigo" },
};

export function CallbackSection({ jobId }: { jobId: string }) {
  const { db, commit } = useDB();
  const toast = useToast();
  const rows = db.callbacks.filter((c) => c.jobId === jobId);
  if (rows.length === 0) return null;

  const done = async (c: Callback) => {
    const ok = await commit((d) => {
      const row = d.callbacks.find((x) => x.id === c.id)!;
      row.doneAt = NOW.toISOString();
      d.activity.push({
        id: `act-cb-${Date.now()}`, jobId, at: NOW.toISOString(), actorId: d.me,
        kind: "note", text: `${CALLBACK_LABEL[c.kind]} done`,
      });
      return d;
    });
    if (ok) { haptic("success"); toast({ text: `${CALLBACK_LABEL[c.kind]} marked done`, tone: "success", undo: () => {} }); }
  };

  return (
    <section className="rec-sec">
      <h2>Coming back</h2>
      <div>
        {rows.map((c) => {
          const art = CB_OBJ[c.kind];
          const late = !c.doneAt && new Date(c.dueAt) < NOW;
          return (
            <div key={c.id} className={`cb-row${c.doneAt ? " is-done" : ""}`}>
              <Obj name={art.obj} hue={art.hue} size={42} />
              <span className="grow">
                <span className="cb-title">{CALLBACK_LABEL[c.kind]}</span>
                <span className="cb-note">{c.note}</span>
                <span className="cb-meta">
                  {c.doneAt
                    ? `Done ${relative(c.doneAt, NOW)}`
                    : <span className={late ? "tone-danger" : ""}>{late ? "Was due " : "Due "}{relative(c.dueAt, NOW)}</span>}
                  {c.baselinePct != null && ` · baseline ${c.baselinePct}% MC`}
                </span>
              </span>
              {!c.doneAt && (
                <Button size="sm" variant="secondary" onClick={() => { haptic("medium"); void done(c); }}>
                  {c.kind === "review_ask" ? "Ask now" : "Done"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
