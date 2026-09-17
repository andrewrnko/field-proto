/* Change order — the money that usually leaks.
 *
 * Rot is hidden work: the crew opens a wall and finds more. The gap between
 * "found it" and "the customer agreed to pay for it" is where this trade loses
 * margin, so this flow starts from the findings already logged in the field,
 * prices them, states the schedule impact honestly, and sends for a decision
 * that is recorded with its version. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Badge, Button, Field, Pressable, useToast } from "../../ui/primitives";
import { MoneyRow, SeverityChip } from "../../ui/domain";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { money, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { LineItem, Photo } from "../../data/types";
import "./estimate.css";

/** A finding becomes a priced line the crew can defend, not a guess. */
const RATE: Record<string, { desc: (loc: string) => string; unit: LineItem["unit"]; qty: number; price: number; cost: number }> = {
  structural: { desc: (l) => `Replace compromised framing at ${l}, shore and re-support`, unit: "lf", qty: 12, price: 14500, cost: 7200 },
  active: { desc: (l) => `Cut out and replace rotted material at ${l}`, unit: "lf", qty: 8, price: 9800, cost: 5100 },
  monitor: { desc: (l) => `Treat and seal damp material at ${l}`, unit: "sf", qty: 20, price: 1900, cost: 850 },
};

export function ChangeOrderFlow({ jobId }: { jobId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const { pop } = useNav();
  const toast = useToast();

  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const findings = e.findings(jobId);
  const candidates = useMemo(
    () => findings.filter((f) => !f.changeOrderId),
    [findings],
  );

  const [picked, setPicked] = useState<string[]>(candidates.filter((f) => f.isNewDamage).map((f) => f.id));
  const [days, setDays] = useState(2);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"pick" | "price">("pick");
  const [sending, setSending] = useState(false);

  const items: LineItem[] = useMemo(() => picked.map((id) => {
    const f = findings.find((x) => x.id === id)!;
    const r = RATE[f.severity];
    return {
      id: `li-${id}`,
      description: r.desc(f.location),
      internalNote: f.measurement,
      qty: r.qty, unit: r.unit,
      unitPriceCents: r.price, unitCostCents: r.cost,
      taxable: true,
    };
  }), [picked, findings]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPriceCents, 0);
  const cost = items.reduce((s, i) => s + i.qty * i.unitCostCents, 0);
  const photosFor = (ids: string[]) => ids.map((id) => db.photos.find((p) => p.id === id)).filter(Boolean) as Photo[];

  const send = async () => {
    setSending(true);
    const num = `CO-${String(db.changeOrders.length + 1).padStart(3, "0")}`;
    const ok = await commit((d) => {
      const id = `co-new-${Date.now()}`;
      d.changeOrders.push({
        id, jobId, number: num,
        reason: reason.trim() || "Damage found behind the opened material",
        findingIds: picked, items,
        status: "sent",
        scheduleImpactDays: days,
        createdAt: NOW.toISOString(),
        sentAt: NOW.toISOString(),
      });
      for (const fid of picked) {
        const f = d.findings.find((x) => x.id === fid);
        if (f) f.changeOrderId = id;
      }
      const j = d.jobs.find((x) => x.id === jobId)!;
      j.blocker = { kind: "awaiting_customer", label: `${num} awaiting approval`, since: NOW.toISOString(), owner: j.ownerId ?? undefined };
      j.nextAction = { label: `Chase ${num}`, dueAt: new Date(NOW.getTime() + 864e5).toISOString(), ownerId: j.ownerId };
      d.activity.push({
        id: `act-${id}`, jobId, at: NOW.toISOString(), actorId: d.me, kind: "change_order",
        text: `${num} sent to ${customer.name}`, meta: `${money(subtotal, { cents: false })} · +${days}d`,
      });
      return d;
    }, { latencyMs: 900 });
    setSending(false);
    if (!ok) { toast({ text: "Send failed — nothing went out", tone: "danger" }); return; }
    haptic("success");
    toast({ text: `${num} sent to ${customer.name}`, tone: "success" });
    pop();
  };

  return (
    <Screen
      title="Change order"
      subtitle={`${customer.name} · ${job.title}`}
      back
      backLabel="Job"
    >
      {step === "pick" ? (
        <div className="stack gap-3">
          <p className="t-body dim">Pick what the crew found that was not in the original scope.</p>

          {candidates.length === 0 ? (
            <p className="t-body dim">Every finding on this job is already on a change order.</p>
          ) : (
            <div className="co-list">
              {candidates.map((f) => {
                const on = picked.includes(f.id);
                return (
                  <Pressable
                    key={f.id} className="co-finding"
                    onClick={() => { haptic("select"); setPicked((s) => (on ? s.filter((x) => x !== f.id) : [...s, f.id])); }}
                  >
                    <span className={`co-check${on ? " is-on" : ""}`}>{on && <Icon name="check" size={14} strokeWidth={3} />}</span>
                    {photosFor(f.photoIds)[0] && (
                      <span className="co-thumb">
                        <img src={`${import.meta.env.BASE_URL}photos/${photosFor(f.photoIds)[0].seed}.jpg`} alt="" loading="lazy" />
                      </span>
                    )}
                    <span className="grow">
                      <span className="co-title">{f.title}</span>
                      <span className="co-where">{f.location} · found {relative(f.discoveredAt, NOW)}</span>
                      <span className="hrow" style={{ paddingTop: 7, gap: 6 }}>
                        <SeverityChip severity={f.severity} />
                        {f.isNewDamage && <Badge tone="danger">New damage</Badge>}
                        {f.moisturePct != null && <Badge>{f.moisturePct}% MC</Badge>}
                      </span>
                    </span>
                  </Pressable>
                );
              })}
            </div>
          )}

          <div className="co-actions">
            <Button full size="lg" disabled={picked.length === 0} onClick={() => { setStep("price"); haptic("light"); }} iconAfter="arrowRight">
              Price {picked.length} finding{picked.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="stack gap-3">
          <motion.p className="t-body dim" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.sheet}>
            {picked.length} findings priced from this job's contract rates, not a guess.
          </motion.p>

          <section className="co-sec">
            <h2>Lines</h2>
            {items.map((i) => (
              <div key={i.id} className="co-line">
                <span className="grow">
                  <span className="t-body">{i.description}</span>
                  <span className="t-meta">{i.qty} {i.unit} × {money(i.unitPriceCents)}</span>
                </span>
                <span className="li-amt"><span className="t-row t-num">{money(i.qty * i.unitPriceCents, { cents: false })}</span></span>
              </div>
            ))}
          </section>

          <section className="co-sec">
            <MoneyRow label="Change order total" cents={subtotal} strong />
            <MoneyRow label="Our cost" cents={cost} note={`${Math.round(((subtotal - cost) / Math.max(subtotal, 1)) * 100)}% margin`} />
            <MoneyRow label="New contract value" cents={job.valueCents + subtotal} strong />
          </section>

          <section className="co-sec">
            <h2>Schedule impact</h2>
            <p className="t-body dim">Say it now. A surprise delay costs more than the money.</p>
            <div className="chip-row">
              {[0, 1, 2, 3, 5].map((d) => (
                <button key={d} className={`chip${days === d ? " is-on" : ""}`} onClick={() => { haptic("select"); setDays(d); }}>
                  {d === 0 ? "No delay" : `+${d} day${d === 1 ? "" : "s"}`}
                </button>
              ))}
            </div>
            <Field
              label="What happened, in their words"
              placeholder="Opened the rim joist and the damage runs past the bump-out"
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              hint="This is the first line the homeowner reads."
            />
          </section>

          <div className="co-actions">
            <Button full size="lg" icon="send" pending={sending} onClick={send}>
              Send to {customer.name.split(" ")[0]} for approval
            </Button>
            <Button full variant="quiet" onClick={() => setStep("pick")}>Back to findings</Button>
          </div>
        </div>
      )}
    </Screen>
  );
}
