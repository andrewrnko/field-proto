/* Creation as a surface, not a route.
 *
 * The palette expands from the button that was pressed, and the same surface
 * becomes the thing being made. Nothing navigates away; committing morphs the
 * surface into a confirmation that names what now exists. */
import { useState } from "react";
import { motion } from "motion/react";
import { Button, Field, Pressable, useToast } from "../ui/primitives";
import { Obj, type ObjHue, type ObjName } from "../ui/Obj";
import { SuccessMark } from "../ui/Success";
import { SheetHead } from "../ui/domain";
import type { SheetApi } from "../ui/Sheet";
import { useNav } from "../ui/Nav";
import { useDB, useEntities } from "../data/store";
import { NOW } from "../data/clock";
import { SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";
import type { Job } from "../data/types";
import { JobDetail } from "../features/jobs/JobDetail";
import { ChangeOrderFlow } from "../features/estimate/ChangeOrderFlow";
import { InspectionFlow } from "../features/inspect/InspectionFlow";
import "./create.css";

type Item = { obj: ObjName; hue: ObjHue; title: string; note: string; go: (api: SheetApi) => void };

export function CreatePalette({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const toast = useToast();

  /* the jobs a new thing most likely belongs to: the ones with a crew on them */
  const liveJob = db.jobs.find((j) => j.stage === "in_progress") ?? db.jobs[0];

  const items: Item[] = [
    {
      obj: "clipboard", hue: "indigo", title: "Lead", note: "Someone just called",
      go: (a) => a.push((b) => <NewLead api={b} />),
    },
    {
      obj: "drop", hue: "cyan", title: "Finding", note: `On ${e.customer(liveJob.customerId).name.split(" ")[0]}'s job`,
      go: (a) => { a.close(); push(`inspect-${liveJob.id}`, () => <InspectionFlow jobId={liveJob.id} />); },
    },
    {
      obj: "warning", hue: "amber", title: "Change order", note: "Damage that was not in scope",
      go: (a) => { a.close(); push(`co-${liveJob.id}`, () => <ChangeOrderFlow jobId={liveJob.id} />); },
    },
    {
      obj: "coins", hue: "emerald", title: "Payment", note: "Card, bank, check or cash",
      go: (a) => { a.close(); toast({ text: "Opens on the invoice so it lands on the right job" }); },
    },
  ];

  return (
    <>
      <SheetHead api={api} title="Make something" />
      <div className="sheet-body">
        <div className="create-grid">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING.sheet, delay: 0.03 * i }}
            >
              <Pressable className="create-cell" onClick={() => { haptic("light"); it.go(api); }} style={{ width: "100%" }}>
                <Obj name={it.obj} hue={it.hue} size={46} />
                <span>
                  <span className="create-name block">{it.title}</span>
                  <span className="create-note block">{it.note}</span>
                </span>
              </Pressable>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------- lead, made in place ------------------------- */

function NewLead({ api }: { api: SheetApi }) {
  const { db, commit } = useDB();
  const { push } = useNav();
  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [what, setWhat] = useState("");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<string | null>(null);

  const ready = name.trim().length > 1 && tel.trim().length >= 7;

  const create = async () => {
    setBusy(true);
    const cid = `c-new-${Date.now()}`, pid = `pr-new-${Date.now()}`, jid = `j-new-${Date.now()}`;
    const ok = await commit((d) => {
      d.customers.push({ id: cid, name: name.trim(), phone: tel.trim(), since: NOW.toISOString(), preferredContact: "call", propertyIds: [pid] });
      d.properties.push({ id: pid, customerId: cid, address: "Address to confirm", city: "Lynnwood", zip: "", structures: [] });
      const job: Job = {
        id: jid, customerId: cid, propertyId: pid,
        title: what.trim() || "Rot inspection",
        stage: "new_lead", ownerId: null, blocker: null, payment: "none", schedule: "unscheduled",
        nextAction: { label: "Call back and qualify", dueAt: new Date(NOW.getTime() + 3 * 36e5).toISOString(), ownerId: null },
        scopeSummary: what.trim() || "Caller reports rot — scope unknown until we look.",
        valueCents: 0,
        workType: /deck|railing|stair/i.test(what) ? "deck" : /siding|window|trim/i.test(what) ? "siding" : /water|leak|flood/i.test(what) ? "water" : "crawl",
        source: "referral", createdAt: NOW.toISOString(), crewIds: [],
      };
      d.jobs.push(job);
      d.leadResponse.push({ jobId: jid, attempts: [] });
      d.activity.push({ id: `act-${jid}`, jobId: jid, at: NOW.toISOString(), actorId: d.me, kind: "note", text: "Lead captured on the phone", meta: tel.trim() });
      return d;
    }, { latencyMs: 600 });
    setBusy(false);
    if (!ok) return;
    haptic("success");
    setMade(jid);
  };

  if (made) {
    return (
      <div className="create-done">
        <span className="create-mark"><SuccessMark size={96} /></span>
        <h2 className="t-section">{name.trim()} is in</h2>
        <p className="t-body dim">
          Unassigned, with a callback due in three hours. The clock on Now starts the moment you close this.
        </p>
        <div className="create-done-actions">
          <Button variant="secondary" full onClick={api.close}>Done</Button>
          <Button full onClick={() => { api.close(); push(`job-${made}`, () => <JobDetail jobId={made} />); }}>Open it</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SheetHead api={api} title="New lead" subtitle="While they are still on the phone" />
      <div className="sheet-body stack gap-3">
        <Field label="Name" placeholder="Dana Whitcomb" value={name} onChange={(e2) => setName(e2.target.value)} autoComplete="off" />
        <Field label="Phone" placeholder="(425) 555-0148" inputMode="tel" value={tel} onChange={(e2) => setTel(e2.target.value)} />
        <Field label="What did they say?" placeholder="Deck boards are soft by the slider" value={what} onChange={(e2) => setWhat(e2.target.value)} hint="Their words. The scope gets written after we look." />
        <p className="t-meta">
          {db.jobs.filter((j) => j.ownerId === null).length} leads are already sitting unassigned.
        </p>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" disabled={!ready} pending={busy} onClick={create}>Add lead</Button>
      </div>
    </>
  );
}
