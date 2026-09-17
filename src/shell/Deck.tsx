/* The Deck — the business, one thumb-drag away.
 *
 * Everything the old tab bar exposed permanently lives here, plus the lenses.
 * It rises over Now, which stays visible behind it, so the user never loses the
 * thing they were looking at to go somewhere else. */
import { motion } from "motion/react";
import { Icon } from "../ui/Icon";
import { Avatar, Pressable } from "../ui/primitives";
import { Obj, type ObjHue, type ObjName } from "../ui/Obj";
import type { SheetApi } from "../ui/Sheet";
import { useNav } from "../ui/Nav";
import { useDB } from "../data/store";
import { NOW } from "../data/clock";
import { compactMoney } from "../lib/format";
import { SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";
import { LEAD_STAGES } from "../data/types";
import { LENS, useLens, type Lens as LensKey } from "./roles";
import { JobsScreen } from "../features/jobs/JobsScreen";
import { ScheduleScreen } from "../features/schedule/ScheduleScreen";
import { MoneyScreen } from "../features/money/MoneyScreen";
import { InboxScreen } from "../features/inbox/InboxScreen";
import { PeopleScreen } from "../features/people/PeopleScreen";
import { MediaScreen } from "../features/media/MediaScreen";
import "./shell.css";

export function Deck({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const { push } = useNav();
  const { lens, setLens } = useLens();

  const open = (key: string, node: React.ReactNode) => { api.close(); push(key, () => node); };

  const leads = db.jobs.filter((j) => LEAD_STAGES.includes(j.stage)).length;
  const active = db.jobs.filter((j) => !LEAD_STAGES.includes(j.stage) && j.stage !== "lost").length;
  const today = db.appointments.filter((a) => new Date(a.startAt).toDateString() === NOW.toDateString()).length;
  const outstanding = db.invoices.filter((i) => i.state !== "paid" && i.state !== "draft")
    .reduce((s, i) => s + (i.amountCents - i.paidCents), 0);
  const unread = db.threads.reduce((n, t) => n + t.unread, 0);
  const onClock = db.time.filter((t) => t.endAt === null).length;
  const forReel = db.photos.filter((p) => p.forReel).length;

  const cells: Array<{ name: string; note: string; count?: string; obj: ObjName; hue: ObjHue; go: () => void }> = [
    { name: "Jobs", note: `${leads} leads · ${active} in production`, obj: "house", hue: "blue", go: () => open("deck-jobs", <JobsScreen />) },
    { name: "Schedule", note: `${today} on the board today`, obj: "calendar", hue: "coral", go: () => open("deck-sched", <ScheduleScreen />) },
    { name: "Money", note: `${compactMoney(outstanding)} out there`, obj: "coins", hue: "emerald", go: () => open("deck-money", <MoneyScreen />) },
    { name: "Inbox", note: unread ? `${unread} unread` : "nothing waiting", count: unread ? String(unread) : undefined, obj: "bubble", hue: "violet", go: () => open("deck-inbox", <InboxScreen />) },
    { name: "People", note: onClock ? `${onClock} on the clock` : "nobody clocked in", obj: "tools", hue: "slate", go: () => open("deck-people", <PeopleScreen />) },
    { name: "Media", note: `${forReel} shots marked`, obj: "camera", hue: "teal", go: () => open("deck-media", <MediaScreen />) },
  ];

  return (
    <>
      <div className="deck-head">
        <p className="deck-title">The business</p>
        <p className="deck-sub">Everything, when you want it. Nothing, when you don't.</p>
      </div>

      <div className="scroll" data-sheet-scroll style={{ paddingBottom: 24 }}>
        <div className="deck-grid">
          {cells.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING.sheet, delay: 0.02 * i }}
            >
              <Pressable className="deck-cell" onClick={() => { haptic("light"); c.go(); }} style={{ width: "100%" }}>
                <Obj name={c.obj} hue={c.hue} size={42} />
                <span>
                  <span className="deck-name block">{c.name}</span>
                  <span className="deck-note block">{c.note}</span>
                </span>
                {c.count && <span className="deck-count">{c.count}</span>}
              </Pressable>
            </motion.div>
          ))}
        </div>

        <div className="lens-row">
          {(Object.keys(LENS) as LensKey[]).map((k) => {
            const p = db.people.find((x) => x.id === LENS[k].personId)!;
            return (
              <Pressable
                key={k}
                className={`lens-chip${lens === k ? " is-on" : ""}`}
                onClick={() => { haptic("select"); setLens(k); }}
              >
                <Avatar name={p.name} size={26} tone={p.avatarTone} />
                {LENS[k].label}
              </Pressable>
            );
          })}
        </div>
        <p className="t-meta" style={{ padding: "8px var(--gutter) 0" }}>
          {LENS[lens].label} · {LENS[lens].leads.toLowerCase()}
        </p>

        <div style={{ padding: "22px var(--gutter) 0" }}>
          <Pressable className="rec-open" onClick={() => { api.close(); }} style={{ width: "100%" }}>
            <Icon name="settings" size={20} className="dim" />
            <span className="grow"><span className="rec-open-t">Settings</span></span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>
        </div>
      </div>
    </>
  );
}
