/* People — who is working, on what, right now.
 *
 * Not an HR table. The question this answers is "where is my labour going",
 * which is the same question the job record asks from the other side. */
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Avatar, Pressable } from "../../ui/primitives";
import { Tag } from "../../ui/domain";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { money, time } from "../../lib/format";
import { LABOR_RATE_CENTS, TASK_LABEL, hoursOf } from "../../data/types";
import { STALE_HOURS } from "../jobs/costing";
import { PersonScreen } from "./PersonScreen";
import { Heatmap, type Cell } from "../../ui/Heatmap";
import "./people.css";

const ROLE: Record<string, string> = {
  owner: "Owner", estimator: "Estimator", lead_carpenter: "Lead carpenter",
  carpenter: "Carpenter", coordinator: "Coordinator", sub: "Subcontractor",
};

export function PeopleScreen() {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();

  const rows = db.people.map((p) => {
    const mine = db.time.filter((t) => t.personId === p.id);
    const open = mine.find((t) => t.endAt === null && hoursOf(t, NOW) <= STALE_HOURS);
    const stale = mine.find((t) => t.endAt === null && hoursOf(t, NOW) > STALE_HOURS);
    const week = mine
      .filter((t) => !(t.endAt === null && hoursOf(t, NOW) > STALE_HOURS))
      .filter((t) => new Date(t.startAt).getTime() > NOW.getTime() - 7 * 864e5)
      .reduce((s, t) => s + hoursOf(t, NOW), 0);
    return { p, open, stale, week };
  }).sort((a, b) => (b.open ? 1 : 0) - (a.open ? 1 : 0) || b.week - a.week);

  const onClock = rows.filter((r) => r.open).length;
  const weekHours = rows.reduce((s, r) => s + r.week, 0);

  /* five weeks of the whole crew, so the shape of the month is visible */
  const cells: Cell[] = Array.from({ length: 91 }).map((_, i) => {
    const d = new Date(NOW); d.setDate(d.getDate() - (90 - i)); d.setHours(0, 0, 0, 0);
    const value = db.time
      .filter((t) => !(t.endAt === null && hoursOf(t, NOW) > STALE_HOURS))
      .filter((t) => new Date(t.startAt).toDateString() === d.toDateString())
      .reduce((s2, t) => s2 + hoursOf(t, NOW), 0);
    return { date: d, value, label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) };
  });

  return (
    <Screen title="People" subtitle={`${onClock} on the clock · ${Math.round(weekHours)} h this week`}>
      <section className="ppl-heat">
        <h2>When the work happens</h2>
        <Heatmap cells={cells} weeks={13} />
      </section>
      <div className="ppl">
        {rows.map(({ p, open, stale, week }) => {
          const job = open ? e.job(open.jobId) : null;
          return (
            <Pressable key={p.id} className="ppl-row" data-shot={`person-${p.id}`} onClick={() => push(`person-${p.id}`, () => <PersonScreen personId={p.id} />)}>
              <span className="ppl-face">
                <Avatar name={p.name} size={46} tone={p.avatarTone} />
                {open && <span className="ppl-live" aria-hidden />}
              </span>
              <span className="grow">
                <span className="ppl-name">{p.name}</span>
                <span className="ppl-note">
                  {open && job
                    ? `On ${e.customer(job.customerId).name.split(" ")[0]}'s since ${time(open.startAt)} · ${TASK_LABEL[open.task].toLowerCase()}`
                    : `${ROLE[p.role]} · ${week > 0 ? `${week.toFixed(week < 10 ? 1 : 0)} h this week` : "nothing logged this week"}`}
                </span>
                {stale && <span className="ppl-tags"><Tag hue="amber" icon="alert">Never clocked out</Tag></span>}
              </span>
              <span className="ppl-right">
                <span className="ppl-hours">{week > 0 ? `${week.toFixed(week < 10 ? 1 : 0)} h` : "—"}</span>
                <span className="ppl-cost">{week > 0 ? money(Math.round(week * LABOR_RATE_CENTS), { cents: false }) : ""}</span>
              </span>
              <Icon name="chevron" size={18} className="dimmer" />
            </Pressable>
          );
        })}
      </div>
    </Screen>
  );
}
