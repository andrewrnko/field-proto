/* Estimate — two views of one document.
 *
 * "Customer" is exactly what the homeowner receives, rendered as paper so there
 * is never a surprise about what went out. "Internal" is the same document with
 * cost, margin and notes that must never print. The separation is the feature:
 * the fixtures include a job at 21% margin, and the founders should be able to
 * see that before it is sent, not after the job is framed. */
import { useState } from "react";
import { motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import {
  Badge, Button, Field, Pressable, Segmented, SectionHead, Toggle, useToast,
} from "../../ui/primitives";
import { DocObject, MoneyRow, SheetHead, useConfirm } from "../../ui/domain";
import { SuccessMark } from "../../ui/Success";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useDB, useEntities, useSaver, SAVE_LABEL } from "../../data/store";
import { NOW } from "../../data/clock";
import { dateLabel, money, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { estimateTotals, itemCost, itemTotal, type Estimate, type LineItem } from "../../data/types";
import "./estimate.css";

export function EstimateScreen({ estimateId }: { estimateId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const { present } = useSheets();
  const toast = useToast();
  const saver = useSaver();
  const [view, setView] = useState<"customer" | "internal">("internal");

  const est = db.estimates.find((x) => x.id === estimateId)!;
  const job = e.job(est.jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const totals = estimateTotals(est);
  const marginClass = totals.margin >= 0.4 ? "" : totals.margin >= 0.28 ? " is-thin" : " is-bad";

  const editable = est.status === "draft";

  const updateItem = (itemId: string, patch: Partial<LineItem>) =>
    saver.run(commit((d) => {
      const target = d.estimates.find((x) => x.id === estimateId)!;
      const item = target.items.find((i) => i.id === itemId);
      if (item) Object.assign(item, patch);
      return d;
    }, { latencyMs: 320 }));

  return (
    <Screen
      title={est.number}
      subtitle={`${customer.name} · ${job.title}`}
      back
      backLabel="Job"
      actions={
        <>
          {saver.state !== "idle" && <span className={`t-meta save-${saver.state}`}>{SAVE_LABEL[saver.state]}</span>}
          <Pressable
            className="round round-plain" style={{ width: 36, height: 36 }} aria-label="Estimate actions"
            onClick={() => present((api) => <EstimateActions api={api} estimateId={estimateId} />, { detents: ["auto"] })}
          >
            <Icon name="moreVert" size={20} />
          </Pressable>
        </>
      }
      headerExtra={
        <Segmented
          value={view} onChange={setView}
          options={[
            { value: "internal", label: "Internal" },
            { value: "customer", label: "What they see" },
          ]}
        />
      }
    >
      {view === "customer" ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.sheet}>
          <PaperDocument est={est} customerName={customer.name} address={`${property.address}, ${property.city} ${property.zip}`} />
          <p className="t-meta updated">
            {est.status === "sent" || est.status === "viewed"
              ? `Sent ${relative(est.sentAt ?? est.createdAt, NOW)}${est.viewedAt ? ` · opened ${relative(est.viewedAt, NOW)}` : " · not opened yet"}`
              : "Not sent yet — nothing has reached the customer."}
          </p>
        </motion.div>
      ) : (
        <div className="stack gap-3">
          <div className="card pad">
            <div className="between">
              <div>
                <p className="t-meta">Contract value</p>
                <p className="job-value t-num">{money(totals.subtotal, { cents: false })}</p>
              </div>
              <Badge tone={est.status === "approved" ? "success" : est.status === "declined" ? "danger" : "neutral"} dot>
                {STATUS_LABEL[est.status]}
              </Badge>
            </div>
            <div className="stack gap-1" style={{ paddingTop: 12 }}>
              <div className="between">
                <span className="t-meta">Margin</span>
                <span className={`t-meta t-num${totals.margin < 0.28 ? " tone-danger" : totals.margin < 0.4 ? " tone-warning" : ""}`}>
                  {Math.round(totals.margin * 100)}% · {money(totals.subtotal - totals.cost, { cents: false })}
                </span>
              </div>
              <div className={`margin-bar${marginClass}`}>
                <motion.i initial={{ width: 0 }} animate={{ width: `${Math.round(totals.margin * 100)}%` }} transition={{ ...SPRING.sheet, delay: 0.1 }} />
              </div>
              {totals.margin < 0.28 && (
                <p className="t-meta tone-danger">Below the 28% floor — check labour hours before this goes out.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="pad-head">
              <SectionHead
                title="Line items" count={est.items.length}
                action={editable ? <Button size="sm" variant="quiet" icon="plus" onClick={() => toast({ text: "Add item" })}>Add</Button> : undefined}
              />
            </div>
            {est.items.map((i) => (
              <Pressable
                key={i.id}
                className="line-item"
                onClick={() => present((api) => (
                  <ItemSheet api={api} item={i} editable={editable} onChange={(patch) => updateItem(i.id, patch)} />
                ), { detents: ["auto"] })}
              >
                <span className="grow">
                  <span className="t-row">{i.description}{i.optional && <Badge tone="info"> Optional</Badge>}</span>
                  <span className="t-meta">
                    {i.qty} {i.unit} × {money(i.unitPriceCents)} · cost {money(itemCost(i), { cents: false })}
                  </span>
                  {i.internalNote && <span className="t-meta dimmer">Internal: {i.internalNote}</span>}
                </span>
                <span className="li-amt">
                  <span className="t-row t-num">{money(itemTotal(i), { cents: false })}</span>
                </span>
              </Pressable>
            ))}
          </div>

          <div className="card pad">
            <MoneyRow label="Subtotal" cents={totals.subtotal} />
            {totals.optional > 0 && <MoneyRow label="Optional add-ons (not included)" cents={totals.optional} />}
            <MoneyRow label="Internal cost" cents={totals.cost} note="never printed" />
            <MoneyRow label={`Deposit to schedule (${est.depositPct}%)`} cents={totals.deposit} strong />
          </div>
        </div>
      )}

      {est.status === "draft" ? (
        <div style={{ paddingTop: 16 }}>
          <Button
            full size="lg" icon="send"
            onClick={() => present((api) => <SendFlow api={api} estimateId={estimateId} />, { detents: ["auto"] })}
          >
            Send to {customer.name.split(" ")[0]}
          </Button>
        </div>
      ) : est.status === "sent" || est.status === "viewed" ? (
        <div className="stack gap-2" style={{ paddingTop: 16 }}>
          <Button full variant="secondary" icon="message" onClick={() => toast({ text: `Nudge sent to ${customer.name}`, tone: "success", undo: () => {} })}>
            Nudge the customer
          </Button>
          <Button full variant="quiet" icon="sign" onClick={() => toast({ text: "Logged as a verbal yes — record who said it" })}>
            Log a verbal approval
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}

/* ------------------------- the document ------------------------- */

export function PaperDocument({
  est, customerName, address, compact,
}: { est: Estimate; customerName: string; address: string; compact?: boolean }) {
  const t = estimateTotals(est);
  return (
    <div className="paper">
      <div className="paper-head">
        <div className="paper-mark">
          <img className="paper-logo" src={`${import.meta.env.BASE_URL}brand/logo.svg`} alt="" />
          <span style={{ fontSize: 10.5, color: "#64646D" }}>Lynnwood, WA · WA LIC #GOTROT***</span>
        </div>
        <div className="paper-meta">
          <span><b style={{ color: "#17171B" }}>{est.number}</b></span>
          <span>Revision {est.version}</span>
          <span>{dateLabel(est.createdAt)}</span>
          {est.expiresAt && <span>Valid to {dateLabel(est.expiresAt)}</span>}
        </div>
      </div>
      <div className="paper-rule" />
      <div className="paper-to">
        <span style={{ fontSize: 10.5, letterSpacing: ".4px", color: "#64646D", textTransform: "uppercase" }}>Prepared for</span>
        <b>{customerName}</b>
        <span style={{ color: "#64646D" }}>{address}</span>
      </div>
      <div className="paper-items">
        {est.items.map((i) => (
          <div key={i.id} className={`paper-item${i.optional ? " is-optional" : ""}`}>
            <span className="pi-desc">{i.description}{i.optional ? " (optional)" : ""}</span>
            <span className="pi-qty">{i.qty} {i.unit}</span>
            <span className="pi-amt">{money(itemTotal(i), { cents: false })}</span>
          </div>
        ))}
      </div>
      <div className="paper-rule" />
      <div className="paper-tot">
        <div className="paper-tot-row"><span style={{ color: "#64646D" }}>Subtotal</span><span>{money(t.subtotal, { cents: false })}</span></div>
        <div className="paper-tot-row"><span style={{ color: "#64646D" }}>Deposit to schedule</span><span>{money(t.deposit, { cents: false })}</span></div>
        <div className="paper-tot-row is-strong"><span>Total</span><span>{money(t.subtotal, { cents: false })}</span></div>
      </div>
      {!compact && (
        <>
          <p className="paper-note">
            {est.note ?? "Price holds for 30 days. Rot is hidden work: anything found behind the material we open is quoted as a change order before we continue, with photos."}
          </p>
          <div className="paper-sign">
            <div className="paper-sign-line" />
            <span style={{ fontSize: 10.5, color: "#64646D" }}>Signature / date</span>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------- item sheet --------------------------- */

function ItemSheet({
  api, item, editable, onChange,
}: { api: SheetApi; item: LineItem; editable: boolean; onChange: (p: Partial<LineItem>) => void }) {
  const [qty, setQty] = useState(String(item.qty));
  const [price, setPrice] = useState((item.unitPriceCents / 100).toFixed(2));
  const [cost, setCost] = useState((item.unitCostCents / 100).toFixed(2));
  const [optional, setOptional] = useState(!!item.optional);

  const q = Number(qty) || 0;
  const p = Math.round((Number(price) || 0) * 100);
  const c = Math.round((Number(cost) || 0) * 100);
  const total = Math.round(q * p);
  const margin = total === 0 ? 0 : (total - Math.round(q * c)) / total;

  return (
    <>
      <SheetHead api={api} title={item.description} subtitle={`${item.qty} ${item.unit}`} icon="doc" />
      <div className="sheet-body stack gap-3">
        <div className="hrow" style={{ gap: 10 }}>
          <Field label="Quantity" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} disabled={!editable} />
          <Field label={`Price / ${item.unit}`} inputMode="decimal" prefix="$" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!editable} />
          <Field label={`Cost / ${item.unit}`} inputMode="decimal" prefix="$" value={cost} onChange={(e) => setCost(e.target.value)} disabled={!editable} />
        </div>
        <div className="card pad">
          <MoneyRow label="Line total" cents={total} strong />
          <MoneyRow label="Margin" cents={total - Math.round(q * c)} note={`${Math.round(margin * 100)}%`} tone={margin < 0.28 ? "danger" : undefined} />
        </div>
        {item.internalNote && (
          <div className="card pad">
            <p className="t-meta">Internal note — never printed</p>
            <p className="t-body">{item.internalNote}</p>
          </div>
        )}
        <div className="between">
          <div>
            <p className="t-row">Optional add-on</p>
            <p className="t-meta">Shown to the customer but not in the total</p>
          </div>
          <Toggle checked={optional} label="Optional add-on" onChange={setOptional} />
        </div>
      </div>
      <div className="sheet-foot">
        <Button
          full disabled={!editable}
          onClick={() => { onChange({ qty: q, unitPriceCents: p, unitCostCents: c, optional }); api.close(); }}
        >
          {editable ? "Save line" : "Sent estimates can't be edited"}
        </Button>
      </div>
    </>
  );
}

/* ---------------------------- send flow --------------------------- */

function SendFlow({ api, estimateId }: { api: SheetApi; estimateId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const est = db.estimates.find((x) => x.id === estimateId)!;
  const job = e.job(est.jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const findings = e.findings(est.jobId);
  const [attachPhotos, setAttachPhotos] = useState(true);
  const [sending, setSending] = useState(false);
  const totals = estimateTotals(est);

  const photoCount = findings.reduce((n, f) => n + f.photoIds.length, 0);
  const channel = customer.preferredContact === "email" ? customer.email ?? "email" : customer.phone;

  const send = async () => {
    setSending(true);
    const ok = await commit((d) => {
      const target = d.estimates.find((x) => x.id === estimateId)!;
      target.status = "sent";
      target.sentAt = NOW.toISOString();
      const j = d.jobs.find((x) => x.id === target.jobId)!;
      j.stage = "estimate_sent";
      j.nextAction = { label: `Follow up on ${target.number}`, dueAt: new Date(NOW.getTime() + 2 * 864e5).toISOString(), ownerId: j.ownerId };
      d.activity.push({
        id: `act-send-${estimateId}`, jobId: target.jobId, at: NOW.toISOString(), actorId: d.me,
        kind: "estimate", text: `${target.number} v${target.version} sent to ${customer.name}`,
        meta: `${customer.preferredContact} · ${money(totals.subtotal, { cents: false })}`,
      });
      return d;
    }, { latencyMs: 900 });
    setSending(false);
    if (!ok) { toast({ text: "Send failed — nothing left the building", tone: "danger" }); return; }
    haptic("success");
    api.push((a) => <SentConfirmation api={a} number={est.number} name={customer.name} />);
  };

  return (
    <>
      <SheetHead api={api} title="Send this estimate" subtitle={`${est.number} · revision ${est.version}`} icon="send" />
      <div className="sheet-body stack gap-3">
        <div className="card pad">
          <div className="send-row">
            <DocObject tone="blue" label="EST" size={42} />
            <span className="grow">
              <span className="t-row block">{est.number} · v{est.version}</span>
              <span className="t-meta">{est.items.filter((i) => !i.optional).length} items · {money(totals.subtotal, { cents: false })}</span>
            </span>
          </div>
          <div className="send-row">
            <Icon name="user" size={19} className="dim" />
            <span className="grow">
              <span className="t-row block">{customer.name}</span>
              <span className="t-meta">{channel} · prefers {customer.preferredContact}</span>
            </span>
          </div>
          <div className="send-row">
            <Icon name="pin" size={19} className="dim" />
            <span className="grow">
              <span className="t-body block">{property.address}</span>
              <span className="t-meta">{property.city} {property.zip}</span>
            </span>
          </div>
          <div className="send-row">
            <Icon name="photo" size={19} className="dim" />
            <span className="grow">
              <span className="t-body block">Attach {photoCount} finding photos</span>
              <span className="t-meta">Homeowners approve faster when they see the rot</span>
            </span>
            <Toggle checked={attachPhotos} label="Attach photos" onChange={setAttachPhotos} />
          </div>
        </div>
        <Pressable className="card pad doc-card" onClick={() => api.push((a) => <PreviewStep api={a} estimateId={estimateId} />)}>
          <Icon name="doc" size={20} />
          <span className="grow t-row">Read it exactly as they will</span>
          <Icon name="chevron" size={17} className="dimmer" />
        </Pressable>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" icon="send" pending={sending} onClick={send}>
          Send to {customer.name.split(" ")[0]}
        </Button>
        <p className="t-meta" style={{ textAlign: "center" }}>Goes out as {customer.preferredContact} to {channel}</p>
      </div>
    </>
  );
}

function PreviewStep({ api, estimateId }: { api: SheetApi; estimateId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const est = db.estimates.find((x) => x.id === estimateId)!;
  const job = e.job(est.jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  return (
    <>
      <SheetHead api={api} title="Customer copy" subtitle={est.number} icon="doc" />
      <div className="sheet-body scroll" data-sheet-scroll style={{ maxHeight: 480 }}>
        <PaperDocument est={est} customerName={customer.name} address={`${property.address}, ${property.city} ${property.zip}`} />
      </div>
      <div className="sheet-foot">
        <Button full variant="secondary" onClick={api.pop}>Back to send</Button>
      </div>
    </>
  );
}

function SentConfirmation({ api, number, name }: { api: SheetApi; number: string; name: string }) {
  return (
    <div className="confirm">
      <SuccessMark size={96} hue="blue" icon="send" />
      <h2 className="t-section">{number} is with {name.split(" ")[0]}</h2>
      <p className="t-body dim">Follow-up set for two days out. You'll see it on Today if they go quiet.</p>
      <div className="confirm-actions">
        <Button variant="secondary" full onClick={api.close}>Done</Button>
      </div>
    </div>
  );
}

/* -------------------------- more actions -------------------------- */

function EstimateActions({ api, estimateId }: { api: SheetApi; estimateId: string }) {
  const { db, commit } = useDB();
  const toast = useToast();
  const confirm = useConfirm();
  const est = db.estimates.find((x) => x.id === estimateId)!;

  return (
    <>
      <SheetHead api={api} title={est.number} subtitle={STATUS_LABEL[est.status]} icon="doc" />
      <div className="sheet-body">
        <div className="list">
          <Pressable className="row" onClick={() => { toast({ text: "PDF shared" }); api.close(); }}>
            <span className="row-lead action-icon"><Icon name="download" size={19} /></span>
            <span className="row-body"><span className="t-row">Share the PDF</span><span className="t-meta">Same file the customer got</span></span>
          </Pressable>
          <Pressable className="row" onClick={() => { toast({ text: `Revision ${est.version + 1} started` }); api.close(); }}>
            <span className="row-lead action-icon"><Icon name="copy" size={19} /></span>
            <span className="row-body"><span className="t-row">New revision</span><span className="t-meta">Keeps v{est.version} exactly as sent</span></span>
          </Pressable>
          <Pressable
            className="row"
            onClick={() => {
              api.close();
              confirm({
                title: `Withdraw ${est.number}?`,
                body: `The copy already with the customer stays valid until they decide. Withdrawing marks it expired on your side and stops the follow-up.`,
                confirmLabel: "Withdraw",
                tone: "danger",
                icon: "undo",
                onConfirm: async () => {
                  await commit((d) => {
                    const t = d.estimates.find((x) => x.id === estimateId)!;
                    t.status = "expired";
                    return d;
                  });
                  toast({ text: `${est.number} withdrawn`, tone: "danger" });
                },
              });
            }}
          >
            <span className="row-lead action-icon"><Icon name="undo" size={19} /></span>
            <span className="row-body"><span className="t-row">Withdraw</span><span className="t-meta">Stops the follow-up</span></span>
          </Pressable>
        </div>
      </div>
    </>
  );
}

const STATUS_LABEL: Record<Estimate["status"], string> = {
  draft: "Draft", sent: "Sent", viewed: "Opened", approved: "Approved",
  declined: "Declined", expired: "Expired",
};
