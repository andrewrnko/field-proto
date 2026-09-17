/* One person, at depth.
 *
 * L1 who and what right now · L2 the week, by day and by job · L3 clock them
 * out or fix a shift · L4 the trail of what they actually did. */
import { motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Avatar, Button, Pressable, useToast } from "../../ui/primitives";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { dateLabel, money, relative, time } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { LABOR_RATE_CENTS, TASK_LABEL, hoursOf } from "../../data/types";
import { STALE_HOURS } from "../jobs/costing";
import { JobDetail } from "../jobs/JobDetail";
import "./people.css";

export function PersonScreen({ personId }: { personId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const toast = useToast();

  const person = e.person(personId)!;
  const entries = db.time.filter((t) => t.personId === personId)
    .filter((t) => !(t.endAt === null && hoursOf(t, NOW) > STALE_HOURS))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  const open = entries.find((t) => t.endAt === null);
  const openJob = open ? e.job(open.jobId) : null;

  /* the week, by day — the only chart a foreman actually reads */
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(NOW); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
    const hours = entries
      .filter((t) => new Date(t.startAt).toDateString() === d.toDateString())
      .reduce((s, t) => s + hoursOf(t, NOW), 0);
    return { d, hours };
  });
  const peak = Math.max(...days.map((x) => x.hours), 8);
  const week = days.reduce((s, x) => s + x.hours, 0);

  const byJob = [...entries.reduce((m, t) => {
    m.set(t.jobId, (m.get(t.jobId) ?? 0) + hoursOf(t, NOW));
    return m;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  const clockOut = async () => {
    if (!open) return;
    haptic("medium");
    const ok = await commit((d) => {
      const t = d.time.find((x) => x.id === open.id)!;
      t.endAt = NOW.toISOString();
      d.activity.push({
        id: `act-out-${Date.now()}`, jobId: t.jobId, at: NOW.toISOString(), actorId: d.me,
        kind: "note", text: `${person.name.split(" ")[0]} clocked out`,
        meta: `${hoursOf(t, NOW).toFixed(1)} h on ${TASK_LABEL[t.task].toLowerCase()}`,
      });
      return d;
    });
    if (ok) toast({ text: `${person.name.split(" ")[0]} clocked out`, tone: "success" });
  };

  return (
    <Screen title={person.name} hideTitle>
      <div className="per-head">
        <Avatar name={person.name} size={64} tone={person.avatarTone} />
        <div className="grow">
          <h1 className="per-name">{person.name}</h1>
          <p className="per-role">{person.role.replace("_", " ")}{person.phone ? ` · ${person.phone}` : ""}</p>
        </div>
      </div>

      {open && openJob && (
        <Pressable className="per-live" onClick={() => push(`job-${openJob.id}`, () => <JobDetail jobId={openJob.id} />)}>
          <span className="per-live-dot" aria-hidden />
          <span className="grow">
            <span className="per-live-title">On site at {e.customer(openJob.customerId).name.split(" ")[0]}'s</span>
            <span className="per-live-note">
              In at {time(open.startAt)} · {hoursOf(open, NOW).toFixed(1)} h · {TASK_LABEL[open.task].toLowerCase()}
            </span>
          </span>
          <Icon name="chevron" size={18} className="dimmer" />
        </Pressable>
      )}

      <section className="per-sec">
        <h2>This week</h2>
        <div className="per-week">
          {days.map(({ d, hours }, i) => (
            <div key={i} className="per-day">
              <span className="per-bar">
                <motion.i
                  initial={{ height: 0 }}
                  animate={{ height: `${(hours / peak) * 100}%` }}
                  transition={{ ...SPRING.sheet, delay: 0.03 * i }}
                  className={hours > 8.5 ? "is-long" : ""}
                />
              </span>
              <span className="per-daylabel">{d.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
        <p className="per-weeknote">
          {week.toFixed(1)} h · {money(Math.round(week * LABOR_RATE_CENTS), { cents: false })} of labour
          {days[6].hours > 0 ? ` · ${days[6].hours.toFixed(1)} h today` : ""}
        </p>
      </section>

      {byJob.length > 0 && (
        <section className="per-sec">
          <h2>On what</h2>
          <div>
            {byJob.map(([jobId, hours]) => {
              const j = e.job(jobId);
              return (
                <Pressable key={jobId} className="per-job" onClick={() => push(`job-${jobId}`, () => <JobDetail jobId={jobId} />)}>
                  <span className="grow">
                    <span className="per-job-name">{e.customer(j.customerId).name}</span>
                    <span className="per-job-note">{j.title}</span>
                  </span>
                  <span className="per-job-hours">{hours.toFixed(1)} h</span>
                  <Icon name="chevron" size={18} className="dimmer" />
                </Pressable>
              );
            })}
          </div>
        </section>
      )}

      <section className="per-sec">
        <h2>What they did</h2>
        <div>
          {entries.slice(0, 8).map((t) => (
            <div key={t.id} className="per-entry">
              <span className="grow">
                <span className="per-entry-task">{TASK_LABEL[t.task]}</span>
                <span className="per-entry-note">
                  {dateLabel(t.startAt)} · {time(t.startAt)}{t.endAt ? `–${time(t.endAt)}` : " · still on"}
                  {t.note ? ` · ${t.note}` : ""}
                </span>
              </span>
              <span className="per-entry-h">{hoursOf(t, NOW).toFixed(1)} h</span>
            </div>
          ))}
        </div>
      </section>

      {open && (
        <div style={{ paddingTop: 28 }}>
          <Button full size="lg" variant="secondary" icon="check" onClick={clockOut}>
            Clock {person.name.split(" ")[0]} out · {hoursOf(open, NOW).toFixed(1)} h
          </Button>
        </div>
      )}
      <p className="t-meta" style={{ textAlign: "center", paddingTop: 20 }}>
        Last logged {entries[0] ? relative(entries[0].startAt, NOW) : "—"}
      </p>
    </Screen>
  );
}
