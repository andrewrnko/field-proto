/* The invoice record.
 *
 * Opens as a document, not a form: a paper stack you recognise from the truck
 * and a rendered invoice that foots — line items, subtotal, tax, payments
 * applied, balance due. Then what has actually happened to the money, then
 * what you can do about it. Drag it up to 94% to read the whole document. */
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { Badge, Button, EmptyState, Pressable, SectionHead, useToast } from "../../ui/primitives";
import { DocObject, SheetHead, useConfirm } from "../../ui/domain";
import type { SheetApi } from "../../ui/Sheet";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { dateLabel, money, relative } from "../../lib/format";
import { haptic } from "../../lib/haptics";
import { useInvoiceActions } from "./actions";
import { startTakePayment } from "./TakePayment";
import {
  KIND_LABEL, METHOD_LABEL, STATE_LABEL,
  buildDoc, daysOverdue, outstandingOf, paymentsFor, stateTone,
} from "./model";
import "./money.css";

export function InvoiceSheet({
  api, invoiceId, autoPay,
}: { api: SheetApi; invoiceId: string; autoPay?: boolean }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const toast = useToast();
  const confirm = useConfirm();
  const started = useRef(false);

  const invoice = db.invoices.find((i) => i.id === invoiceId);

  /* "Retry payment" lands straight on the amount step — the record is still
     underneath if you pop back to read it. */
  useEffect(() => {
    if (!autoPay || started.current || !invoice) return;
    if (outstandingOf(invoice) <= 0) return;
    started.current = true;
    startTakePayment(api, invoice);
  }, [autoPay, invoice, api]);

  if (!invoice) {
    return (
      <>
        <SheetHead api={api} title="Invoice" icon="doc" />
        <div className="sheet-body">
          <EmptyState title="This invoice is gone" body="It was voided while you had it open." />
        </div>
      </>
    );
  }

  const job = e.job(invoice.jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const doc = buildDoc(db, invoice);
  const payments = paymentsFor(db, invoice.id);
  const balance = outstandingOf(invoice);
  const late = daysOverdue(invoice);

  const voidInvoice = () =>
    confirm({
      title: `Void ${invoice.number}?`,
      body: `${customer.name} is looking at a ${money(invoice.amountCents)} ${KIND_LABEL[invoice.kind].toLowerCase()} invoice for ${job.title}. Voiding cancels it on their side, takes ${money(balance)} out of your outstanding total, and cannot be undone.`,
      confirmLabel: "Void invoice",
      tone: "danger",
      icon: "trash",
      onConfirm: async () => {
        const ok = await commit((d) => {
          d.invoices = d.invoices.filter((i) => i.id !== invoice.id);
          d.activity.push({
            id: `act-${d.activity.length + 1}`,
            jobId: invoice.jobId,
            at: NOW.toISOString(),
            actorId: d.me,
            kind: "payment",
            text: `${invoice.number} voided`,
            meta: money(invoice.amountCents),
          });
          return d;
        });
        toast(ok
          ? { text: `${invoice.number} voided`, tone: "danger" }
          : { text: `Couldn't void ${invoice.number}. Retry.`, tone: "danger" });
        if (ok) api.close();
      },
    });

  return (
    <>
      <SheetHead
        api={api}
        title={invoice.number}
        subtitle={`${KIND_LABEL[invoice.kind]} · ${customer.name}`}
        icon="doc"
      />

      <div className="sheet-body scroll stack gap-3" data-sheet-scroll>
        {/* ----------------------- the document ----------------------- */}
        <div>
          <div className="mn-doc-head">
            <DocObject tone={invoice.kind === "deposit" ? "amber" : "blue"} label="INV" size={46} />
            <div className="grow">
              <p className="t-row">{KIND_LABEL[invoice.kind]} invoice</p>
              <p className="t-meta">
                Issued {dateLabel(invoice.issuedAt)} · due {dateLabel(invoice.dueAt)}
                {late > 0 ? ` · ${late}d late` : ""}
              </p>
            </div>
            <Badge tone={stateTone(invoice.state)}>{STATE_LABEL[invoice.state]}</Badge>
          </div>

          <div className="mn-paper">
            <div className="mn-paper-head">
              <span className="mn-paper-mark" aria-hidden />
              <span className="grow">
                <span className="t-row block truncate">{customer.name}</span>
                <span className="t-meta">{property.address}, {property.city} {property.zip}</span>
              </span>
              <span className="mn-paper-ref">
                <span className="t-meta t-num block">{invoice.number}</span>
                <span className="t-meta">Due {dateLabel(invoice.dueAt)}</span>
              </span>
            </div>

            <div className="mn-paper-grid">
              <span className="mn-paper-cell">
                <span className="t-meta">Contract</span>
                <span className="t-body t-num">{money(doc.contractCents, { cents: false })}</span>
              </span>
              <span className="mn-paper-cell">
                <span className="t-meta">Billed to date</span>
                <span className="t-body t-num">{money(doc.billedCents, { cents: false })}</span>
              </span>
              <span className="mn-paper-cell">
                <span className="t-meta">This invoice</span>
                <span className="t-body t-num">{money(doc.total, { cents: false })}</span>
              </span>
            </div>

            {doc.scope.length > 0 && (
              <div className="mn-paper-scope">
                <p className="t-meta mn-label">
                  Scope · {doc.estimate?.number} v{doc.estimate?.version}
                </p>
                {doc.scope.map((l) => (
                  <div key={l.label} className="mn-paper-line">
                    <span className="grow">
                      <span className="t-body block truncate">{l.label}</span>
                      <span className="t-meta">{l.note}</span>
                    </span>
                    <span className="t-body t-num dim">{money(l.cents, { cents: false })}</span>
                  </div>
                ))}
                {doc.scopeMore > 0 && (
                  <p className="t-meta dimmer">+{doc.scopeMore} more lines on the accepted estimate</p>
                )}
              </div>
            )}

            <div className="mn-paper-items">
              {doc.lines.map((l) => (
                <div key={l.label} className="mn-paper-line">
                  <span className="grow">
                    <span className="t-row block">{l.label}</span>
                    {l.note && <span className="t-meta clamp2">{l.note}</span>}
                  </span>
                  <span className="t-row t-num">{money(l.cents)}</span>
                </div>
              ))}
            </div>

            <div className="mn-paper-sums">
              <div className="mn-paper-sum">
                <span className="t-body dim">Subtotal</span>
                <span className="t-body t-num">{money(doc.subtotal)}</span>
              </div>
              <div className="mn-paper-sum">
                <span className="t-body dim">Sales tax 10.4%<span className="t-meta block">included in contract pricing</span></span>
                <span className="t-body t-num">{money(doc.taxCents)}</span>
              </div>
              <div className="mn-paper-sum">
                <span className="t-body">Total invoiced</span>
                <span className="t-body t-num">{money(doc.total)}</span>
              </div>
              {doc.paidCents > 0 && (
                <div className="mn-paper-sum">
                  <span className="t-body dim">
                    {invoice.kind === "deposit" ? "Deposit received" : "Payments applied"}
                  </span>
                  <span className="t-body t-num tone-success">−{money(doc.paidCents)}</span>
                </div>
              )}
            </div>

            <div className="mn-paper-due">
              <span className="t-row">Balance due</span>
              <span className={`mn-paper-due-value t-num${late > 0 ? " tone-danger" : ""}`}>{money(doc.balance)}</span>
            </div>
          </div>
        </div>

        {/* ---------------------- payment history --------------------- */}
        <div className="card">
          <div className="pad-head"><SectionHead title="Payment history" count={payments.length} /></div>
          {payments.length === 0 ? (
            <EmptyState
              title="No payments yet"
              body={`Nothing has been taken against ${invoice.number}. Take one below and it lands here.`}
            />
          ) : (
            payments.map((p) => (
              <div key={p.id} className={`mn-pay${p.state === "failed" ? " mn-pay-failed" : ""}`} style={{ borderTop: "1px solid var(--border)" }}>
                <span className="mn-pay-main">
                  <span className="t-row">{METHOD_LABEL[p.method]}</span>
                  <span className="t-meta clamp2">{p.reference}</span>
                  <span className="t-meta dimmer">
                    {dateLabel(p.at)} · {relative(p.at, NOW)}
                    {p.feeCents > 0 ? ` · ${money(p.feeCents)} fee` : ""}
                  </span>
                </span>
                <span className="mn-pay-side">
                  <span className="t-row t-num mn-pay-amt">{money(p.amountCents)}</span>
                  {p.state !== "settled" && (
                    <Badge tone={p.state === "failed" ? "danger" : "warning"}>
                      {p.state === "failed" ? "Declined" : "Settling"}
                    </Badge>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        {/* -------------------------- actions ------------------------- */}
        <div className="list">
          <ActionRow
            icon="send"
            title="Send reminder"
            note={`${customer.preferredContact === "email" ? "Email" : customer.preferredContact === "call" ? "Call" : "Text"} ${customer.name} · you see it before it goes`}
            onClick={() => api.push((a) => <ReminderStep api={a} invoiceId={invoice.id} />, { detents: ["auto"] })}
          />
          <ActionRow
            icon="copy"
            title="Share receipt"
            note={payments.some((p) => p.state !== "failed")
              ? `PDF of ${invoice.number} and everything paid against it`
              : "Nothing has been paid on this invoice yet"}
            onClick={() => toast({ text: `Receipt for ${invoice.number} ready to share` })}
          />
          <ActionRow
            icon="trash"
            title="Void invoice"
            note={`Cancels ${money(invoice.amountCents)} on the customer's side`}
            tone="danger"
            onClick={voidInvoice}
          />
        </div>
      </div>

      <div className="sheet-foot">
        {balance > 0 ? (
          <Button full size="lg" icon="money" data-shot="take-payment" onClick={() => startTakePayment(api, invoice)}>
            Take payment · {money(balance)}
          </Button>
        ) : (
          <Button full size="lg" variant="success" icon="check" onClick={api.close}>
            Paid in full · {money(invoice.amountCents)}
          </Button>
        )}
      </div>
    </>
  );
}

/* ------------------------------ pieces ------------------------------ */

function ActionRow({
  icon, title, note, onClick, tone,
}: { icon: IconName; title: string; note: string; onClick: () => void; tone?: "danger" }) {
  return (
    <Pressable className="row" onClick={onClick} feedback={tone === "danger" ? "warning" : "light"}>
      <span className="row-lead action-icon"><Icon name={icon} size={19} /></span>
      <span className="row-body">
        <span className={`t-row${tone === "danger" ? " tone-danger" : ""}`}>{title}</span>
        <span className="t-meta">{note}</span>
      </span>
      <Icon name="chevron" size={17} className="dimmer" />
    </Pressable>
  );
}

/** Nothing goes to a customer unseen: recipient, channel and the exact words,
 *  on screen, before the send. */
function ReminderStep({ api, invoiceId }: { api: SheetApi; invoiceId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const { remind, channelFor } = useInvoiceActions();
  const [sending, setSending] = useState(false);

  const invoice = db.invoices.find((i) => i.id === invoiceId)!;
  const job = e.job(invoice.jobId);
  const { customer, noun, to } = channelFor(invoice);
  const late = daysOverdue(invoice);
  const body = late > 0
    ? `Hi ${customer.name.split(" ")[0]} — invoice ${invoice.number} for ${money(outstandingOf(invoice))} was due ${dateLabel(invoice.dueAt)}, ${late} days ago. Here is the link to pay it. Thanks. — Marcus, Got Rot`
    : `Hi ${customer.name.split(" ")[0]} — a friendly nudge that invoice ${invoice.number} for ${money(outstandingOf(invoice))} is due ${dateLabel(invoice.dueAt)}. Here is the link to pay it. Thanks. — Marcus, Got Rot`;

  return (
    <>
      <SheetHead api={api} title="Send reminder" subtitle={invoice.number} icon="send" />
      <div className="sheet-body stack gap-3">
        <div className="card pad">
          <div className="mn-paper-sum"><span className="t-body dim">To</span><span className="t-body">{customer.name}</span></div>
          <div className="mn-paper-sum" style={{ marginTop: 7 }}><span className="t-body dim">By</span><span className="t-body">{to}</span></div>
          <div className="mn-paper-sum" style={{ marginTop: 7 }}><span className="t-body dim">About</span><span className="t-body truncate">{job.title}</span></div>
        </div>
        <div className="card pad">
          <p className="t-meta mn-label">What they get</p>
          <p className="t-body" style={{ marginTop: 6 }}>{body}</p>
        </div>
        <p className="t-meta dimmer">Sent as {noun}, because that is how {customer.name.split(" ")[0]} asked to be contacted.</p>
      </div>
      <div className="sheet-foot">
        <Button
          full size="lg" icon="send" pending={sending}
          onClick={async () => {
            setSending(true);
            haptic("medium");
            const ok = await remind(invoice);
            setSending(false);
            if (ok) api.pop();
          }}
        >
          Send it
        </Button>
        <Button variant="quiet" full onClick={api.pop} disabled={sending}>Not now</Button>
      </div>
    </>
  );
}
