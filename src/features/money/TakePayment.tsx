/* Take payment — amount → confirm → authorise → result.
 *
 * Four pushed steps inside the invoice sheet. The rules that shape it:
 *   · nothing is marked paid until commit() resolves true;
 *   · a declined card fails at the confirm step, names the issuer's reason,
 *     and writes a failed payment to the ledger — never a settlement;
 *   · every number shown (fee, net, balance) is integer cents derived from
 *     the same fixtures the rest of the app reads.
 *
 * The draft is a plain object captured by the step closures, so it survives
 * the sheet's push/pop without a store round-trip. */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "../../ui/Icon";
import { Badge, Button, Pressable, useToast } from "../../ui/primitives";
import { SheetHead } from "../../ui/domain";
import type { SheetApi } from "../../ui/Sheet";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { money } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { estimateTotals } from "../../data/types";
import type { Invoice } from "../../data/types";
import {
  METHODS, METHOD_ICON, METHOD_LABEL, METHOD_SETTLE,
  cardOnFile, feeFor, outstandingOf, recordPayment,
  type Method,
} from "./model";

/* Prototype PIN. Named on screen so nobody mistakes it for a real one. */
const PIN = "1234";

type Draft = { amountCents: number; method: Method };

/** Entry point: push the amount step onto an open invoice sheet. */
export function startTakePayment(api: SheetApi, invoice: Invoice) {
  const draft: Draft = { amountCents: outstandingOf(invoice), method: "card" };
  api.push((a) => <AmountStep api={a} draft={draft} invoiceId={invoice.id} />, { detents: ["auto"] });
}

/* ------------------------------ money text ------------------------------ */

/** Dollars text → integer cents. No Number("12.34") anywhere: the fraction is
 *  parsed as its own integer so nothing is ever a float. */
function parseDollars(text: string) {
  const clean = text.replace(/[^0-9.]/g, "");
  const dot = clean.indexOf(".");
  const whole = (dot === -1 ? clean : clean.slice(0, dot)).replace(/\D/g, "");
  const frac = (dot === -1 ? "" : clean.slice(dot + 1)).replace(/\D/g, "");
  const dollars = whole === "" ? 0 : parseInt(whole, 10);
  const cents = parseInt((frac + "00").slice(0, 2), 10);
  return dollars * 100 + cents;
}

function dollarsText(cents: number) {
  const whole = Math.floor(cents / 100);
  return `${whole.toLocaleString("en-US")}.${String(cents % 100).padStart(2, "0")}`;
}

/* ================================ step 1 ================================ */

function AmountStep({ api, draft, invoiceId }: { api: SheetApi; draft: Draft; invoiceId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const invoice = db.invoices.find((i) => i.id === invoiceId)!;
  const job = e.job(invoice.jobId);
  const customer = e.customer(job.customerId);
  const card = cardOnFile(db, customer.id);
  const balance = outstandingOf(invoice);
  const estimate = e.estimates(job.id).slice(-1)[0] ?? null;
  const depositCents = estimate ? estimateTotals(estimate).deposit : 0;

  const [text, setText] = useState(() => dollarsText(draft.amountCents));
  const [method, setMethod] = useState<Method>(draft.method);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cents = parseDollars(text);
  const tooMuch = cents > balance;
  const tooLittle = cents <= 0;
  const preset = cents === balance ? "full" : depositCents > 0 && cents === depositCents ? "deposit" : "custom";

  const chip = (key: "full" | "deposit" | "custom", value: number) => {
    haptic("select");
    if (key === "custom") {
      setFocused(true);
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    setText(dollarsText(value));
  };

  return (
    <>
      <SheetHead api={api} title="Take payment" subtitle={`${invoice.number} · ${customer.name}`} icon="money" />
      <div className="sheet-body stack gap-4" data-no-drag>
        <div className={`mn-amount${focused ? " is-focus" : ""}`}>
          <div className="mn-amount-box">
            <span className="mn-amount-cur">$</span>
            <input
              ref={inputRef}
              className="mn-amount-input"
              inputMode="decimal"
              aria-label="Amount to take"
              data-shot="amount-input"
              value={text}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); setText(dollarsText(parseDollars(text))); }}
              onChange={(ev) => setText(ev.target.value)}
              style={{ width: `${Math.max(4, text.length)}ch` }}
            />
          </div>
          <span className="mn-amount-rule" aria-hidden />
          <p className={`t-meta${tooMuch ? " mn-amount-err" : ""}`}>
            {tooMuch
              ? `More than the ${money(balance)} still owed on this invoice`
              : `Balance due ${money(balance)} of ${money(invoice.amountCents)} invoiced`}
          </p>
        </div>

        <div className="mn-chips">
          <Pressable
            className={`mn-chip${preset === "full" ? " is-on" : ""}`}
            feedback={null}
            onClick={() => chip("full", balance)}
          >
            <span className="mn-chip-label">Full balance</span>
            <span className="t-meta t-num">{money(balance, { cents: false })}</span>
          </Pressable>
          <Pressable
            className={`mn-chip${preset === "deposit" ? " is-on" : ""}`}
            feedback={null}
            disabled={depositCents <= 0 || depositCents > balance}
            onClick={() => chip("deposit", depositCents)}
          >
            <span className="mn-chip-label">Deposit</span>
            <span className="t-meta t-num">
              {depositCents > 0 && depositCents <= balance ? money(depositCents, { cents: false }) : "none set"}
            </span>
          </Pressable>
          <Pressable
            className={`mn-chip${preset === "custom" ? " is-on" : ""}`}
            feedback={null}
            onClick={() => chip("custom", cents)}
          >
            <span className="mn-chip-label">Custom</span>
            <span className="t-meta">type it</span>
          </Pressable>
        </div>

        <div className="stack gap-2">
          <p className="t-meta mn-label">How is it being paid</p>
          <div className="list">
            {METHODS.map((m) => {
              const fee = feeFor(m, cents);
              return (
                <Pressable
                  key={m}
                  className={`mn-method${method === m ? " is-on" : ""}`}
                  feedback="select"
                  data-shot={`method-${m}`}
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                >
                  <span className="mn-method-glyph"><Icon name={METHOD_ICON[m]} size={19} /></span>
                  <span className="mn-method-main">
                    <span className="t-row">{METHOD_LABEL[m]}</span>
                    <span className="t-meta truncate">
                      {m === "card"
                        ? `${card.brand} ···· ${card.last4}${card.declines ? " · declined" : ""}`
                        : m === "ach"
                          ? "ACH from the customer's bank"
                          : m === "check"
                            ? "Record a check you are holding"
                            : "Record cash you have taken"}
                    </span>
                  </span>
                  <span className="mn-inv-side">
                    <span className="t-meta t-num">{fee > 0 ? `${money(fee)} fee` : "no fee"}</span>
                  </span>
                  {method === m && <Icon name="check" size={19} strokeWidth={2.2} className="mn-method-check" />}
                </Pressable>
              );
            })}
          </div>
          {method === "card" && card.declines && (
            <p className="t-meta tone-danger">
              This is the card that was declined on {invoice.number}. Running it again will probably fail.
            </p>
          )}
        </div>
      </div>

      <div className="sheet-foot">
        <Button
          full size="lg" data-shot="review-payment"
          disabled={tooMuch || tooLittle}
          onClick={() => {
            draft.amountCents = cents;
            draft.method = method;
            haptic("medium");
            api.push((a) => <ConfirmStep api={a} draft={draft} invoiceId={invoiceId} />, { detents: ["auto"] });
          }}
        >
          Review {money(cents)}
        </Button>
      </div>
    </>
  );
}

/* ================================ step 2 ================================ */

function ConfirmStep({ api, draft, invoiceId }: { api: SheetApi; draft: Draft; invoiceId: string }) {
  const { db, commit } = useDB();
  const e = useEntities();
  const invoice = db.invoices.find((i) => i.id === invoiceId)!;
  const job = e.job(invoice.jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const card = cardOnFile(db, customer.id);

  const [checking, setChecking] = useState(false);
  const [declined, setDeclined] = useState(false);

  const fee = feeFor(draft.method, draft.amountCents);
  const net = draft.amountCents - fee;

  const authorise = async () => {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 750));
    if (draft.method === "card" && card.declines) {
      /* the card did not authorise. Record the attempt, settle nothing. */
      await commit((d) => {
        d.payments.push({
          id: `pay-${d.payments.length + 1}`,
          invoiceId,
          jobId: invoice.jobId,
          amountCents: draft.amountCents,
          method: "card",
          at: NOW.toISOString(),
          reference: `Declined, do not honor. Card ending ${card.last4}`,
          feeCents: 0,
          state: "failed",
        });
        d.activity.push({
          id: `act-${d.activity.length + 1}`,
          jobId: invoice.jobId,
          at: NOW.toISOString(),
          actorId: "system",
          kind: "payment",
          text: `Card ending ${card.last4} declined on ${invoice.number}`,
          meta: money(draft.amountCents),
        });
        return d;
      });
      setChecking(false);
      setDeclined(true);
      haptic("error");
      return;
    }
    setChecking(false);
    haptic("medium");
    api.push((a) => <AuthStep api={a} draft={draft} invoiceId={invoiceId} />, { detents: ["auto"] });
  };

  return (
    <>
      <SheetHead api={api} title="Confirm" subtitle={invoice.number} icon="check" />
      <div className="sheet-body stack gap-3">
        <div className="mn-confirm-head">
          <p className="t-meta">Taking</p>
          <p className="mn-confirm-amt t-num">{money(draft.amountCents)}</p>
          <p className="t-meta">{METHOD_LABEL[draft.method]}{draft.method === "card" ? ` ···· ${card.last4}` : ""}</p>
        </div>

        {declined && (
          <div className="mn-decline" role="alert" data-shot="decline">
            <Icon name="alert" size={19} strokeWidth={2} />
            <div className="grow">
              <p className="t-row">Card declined — {card.declineReason}</p>
              <p className="t-meta">
                The issuer blocked it, not us. Nothing was charged and nothing on {invoice.number} is
                marked paid — the attempt is on the job's record.
              </p>
            </div>
          </div>
        )}

        <div className="card">
          <div className="mn-pay"><span className="mn-pay-main"><span className="t-meta">From</span><span className="t-row">{customer.name}</span></span></div>
          <div className="mn-pay" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="mn-pay-main">
              <span className="t-meta">Job</span>
              <span className="t-row truncate">{job.title}</span>
              <span className="t-meta truncate">{property.address}, {property.city}</span>
            </span>
          </div>
          <div className="mn-pay" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="mn-pay-main"><span className="t-meta">Invoice</span><span className="t-row t-num">{invoice.number}</span></span>
            <span className="mn-pay-side"><span className="t-body t-num">{money(invoice.amountCents)}</span><span className="t-meta">invoiced</span></span>
          </div>
        </div>

        <div className="card pad">
          <div className="mn-paper-sum"><span className="t-body">Payment</span><span className="t-body t-num">{money(draft.amountCents)}</span></div>
          <div className="mn-paper-sum" style={{ marginTop: 7 }}>
            <span className="t-body dim">
              Processing fee
              <span className="t-meta block">
                {draft.method === "card" ? "2.9% + 30¢" : draft.method === "ach" ? "flat $3.00" : "none on this method"}
              </span>
            </span>
            <span className="t-body t-num dim">{fee > 0 ? `−${money(fee)}` : money(0)}</span>
          </div>
          <div className="mn-paper-due">
            <span className="t-row">Net to you</span>
            <span className="mn-paper-due-value t-num">{money(net)}</span>
          </div>
        </div>
      </div>

      <div className="sheet-foot">
        {declined ? (
          <>
            <Button full size="lg" icon="undo" data-shot="try-another" onClick={api.pop}>Try another method</Button>
            <Button variant="quiet" full onClick={api.close}>Leave it unpaid</Button>
          </>
        ) : (
          <>
            <Button full size="lg" pending={checking} data-shot="authorise" onClick={authorise}>
              {checking ? "Authorising…" : `Authorise ${money(draft.amountCents)}`}
            </Button>
            <Button variant="quiet" full onClick={api.pop} disabled={checking}>Change amount or method</Button>
          </>
        )}
      </div>
    </>
  );
}

/* ================================ step 3 ================================ */

/** The one write. Shared by both authorisation surfaces so a payment taken by
 *  face and a payment taken by PIN land identically. */
function usePaymentCommit(api: SheetApi, draft: Draft, invoiceId: string) {
  const { db, commit } = useDB();
  const e = useEntities();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  const invoice = db.invoices.find((i) => i.id === invoiceId)!;
  const job = e.job(invoice.jobId);
  const card = cardOnFile(db, job.customerId);

  const run = async () => {
    if (done.current) return;
    done.current = true;
    setSaving(true);
    setError(null);
    const amount = draft.amountCents;
    const method = draft.method;
    const fee = feeFor(method, amount);
    /* card and bank money is authorised now and lands in a day or two; a
       check or cash in your hand has already settled. */
    const state = method === "card" || method === "ach" ? "pending" : "settled";
    const ok = await commit((d) => {
      const inv = recordPayment(d, {
        invoiceId,
        amountCents: amount,
        method,
        feeCents: fee,
        state,
        reference:
          method === "card" ? `Card ···· ${card.last4}, authorised in the field`
            : method === "ach" ? "ACH from the customer's bank"
              : method === "check" ? "Check taken on site"
                : "Cash taken on site",
      });
      d.activity.push({
        id: `act-${d.activity.length + 1}`,
        jobId: inv.jobId,
        at: NOW.toISOString(),
        actorId: d.me,
        kind: "payment",
        text: `${money(amount)} taken on ${inv.number} by ${METHOD_LABEL[method].toLowerCase()}`,
        meta: state === "pending" ? "authorised, settling" : "settled",
      });
      return d;
    });
    setSaving(false);
    if (!ok) {
      done.current = false;
      setError("Couldn't record the payment. Nothing was charged.");
      return;
    }
    haptic("success");
    api.push((a) => <ResultStep api={a} draft={draft} invoiceId={invoiceId} />, { detents: ["auto"] });
  };

  return { saving, error, run, invoice, customer: e.customer(job.customerId) };
}

function AuthStep({ api, draft, invoiceId }: { api: SheetApi; draft: Draft; invoiceId: string }) {
  const { saving, error, run, invoice, customer } = usePaymentCommit(api, draft, invoiceId);
  const [scanning, setScanning] = useState(false);

  const scan = () => {
    setScanning(true);
    window.setTimeout(() => { setScanning(false); void run(); }, 1000);
  };

  return (
    <>
      <SheetHead api={api} title="Authorise" subtitle={`${money(draft.amountCents)} · ${invoice.number}`} icon="lock" />
      <div className="sheet-body">
        <div className="mn-auth">
          <div className={`mn-bio${scanning ? " is-scanning" : ""}`}>
            <span className="mn-bio-ring" aria-hidden />
            <span className="mn-bio-ring" aria-hidden />
            <span className="mn-bio-face"><Icon name="faceid" size={38} strokeWidth={1.6} /></span>
          </div>
          <h2 className="t-section">{saving ? "Recording payment…" : scanning ? "Hold still" : "Confirm it is you"}</h2>
          <p className="t-body dim">
            {money(draft.amountCents)} from {customer.name} by {METHOD_LABEL[draft.method].toLowerCase()}.
          </p>
          {error && <p className="t-meta tone-danger" role="alert">{error}</p>}
        </div>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" icon="faceid" pending={scanning || saving} data-shot="scan-face" onClick={scan}>
          {error ? "Try again" : "Scan face"}
        </Button>
        <Button
          variant="quiet" full data-shot="use-pin" disabled={saving}
          onClick={() => { haptic("select"); api.push((a) => <PinStep api={a} draft={draft} invoiceId={invoiceId} />, { detents: ["auto"] }); }}
        >
          Use PIN instead
        </Button>
      </div>
    </>
  );
}

/** The PIN fallback is its own step, not a mode swap: the sheet measures a
 *  step when it mounts, so a pad that appears in place would be clipped. */
function PinStep({ api, draft, invoiceId }: { api: SheetApi; draft: Draft; invoiceId: string }) {
  const { saving, error, run, invoice } = usePaymentCommit(api, draft, invoiceId);
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);

  const key = (d: string) => {
    if (saving || entry.length >= 4) return;
    haptic("select");
    const next = entry + d;
    setEntry(next);
    if (next.length < 4) return;
    if (next === PIN) {
      haptic("medium");
      window.setTimeout(() => void run(), 160);
    } else {
      window.setTimeout(() => {
        haptic("error");
        setWrong(true);
        setEntry("");
        window.setTimeout(() => setWrong(false), 520);
      }, 120);
    }
  };

  const back = () => { if (!saving) setEntry((s) => s.slice(0, -1)); };

  /* a keyboard is a real input here — no dependency array on purpose, the
     handler has to see the current entry on every render */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key >= "0" && ev.key <= "9") { ev.preventDefault(); key(ev.key); }
      else if (ev.key === "Backspace") { ev.preventDefault(); back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <SheetHead api={api} title="Enter PIN" subtitle={`${money(draft.amountCents)} · ${invoice.number}`} icon="lock" />
      <div className="sheet-body">
        <div className={`mn-pin${wrong ? " mn-pin-wrong" : ""}`}>
          <motion.div
            className="mn-pin-dots"
            animate={wrong ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.38 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`mn-pin-dot${i < entry.length ? " is-on" : ""}`} aria-hidden />
            ))}
          </motion.div>
          <p className={`t-meta${wrong ? " tone-danger" : ""}`} role="status">
            {saving ? "Recording payment…" : wrong ? "That PIN didn't match. Try again." : "Prototype PIN: 1234 — no real credential is checked"}
          </p>
          <div className="mn-pin-pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <Pressable key={d} className="mn-pin-key t-num" feedback={null} data-shot={`pin-${d}`} onClick={() => key(d)} aria-label={d}>
                {d}
              </Pressable>
            ))}
            <span className="mn-pin-key is-blank" aria-hidden />
            <Pressable className="mn-pin-key t-num" feedback={null} data-shot="pin-0" onClick={() => key("0")} aria-label="0">0</Pressable>
            <Pressable className="mn-pin-key is-fn" feedback={null} onClick={back} aria-label="Delete">Delete</Pressable>
          </div>
          {error && <p className="t-meta tone-danger" role="alert">{error}</p>}
        </div>
      </div>
      <div className="sheet-foot">
        <Button variant="quiet" full onClick={api.pop} disabled={saving}>Use Face ID instead</Button>
      </div>
    </>
  );
}

/* ================================ step 4 ================================ */

function ResultStep({ api, draft, invoiceId }: { api: SheetApi; draft: Draft; invoiceId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const toast = useToast();
  const invoice = db.invoices.find((i) => i.id === invoiceId)!;
  const job = e.job(invoice.jobId);
  const customer = e.customer(job.customerId);
  const fee = feeFor(draft.method, draft.amountCents);
  const balance = outstandingOf(invoice);

  return (
    <>
      <div className="mn-result" data-shot="payment-done">
        <motion.span
          className="mn-result-mark"
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING.pop}
        >
          <Icon name="check" size={34} strokeWidth={2.4} />
        </motion.span>
        <p className="mn-result-amt t-num">{money(draft.amountCents)}</p>
        <p className="t-body dim">{METHOD_SETTLE[draft.method]}</p>
        <Badge tone={balance > 0 ? "warning" : "success"}>
          {balance > 0 ? `${money(balance)} still owed on ${invoice.number}` : `${invoice.number} paid in full`}
        </Badge>

        <div className="card pad mn-result-list">
          <div className="mn-paper-sum"><span className="t-body dim">From</span><span className="t-body">{customer.name}</span></div>
          <div className="mn-paper-sum" style={{ marginTop: 7 }}>
            <span className="t-body dim">Method</span>
            <span className="t-body">{METHOD_LABEL[draft.method]}</span>
          </div>
          <div className="mn-paper-sum" style={{ marginTop: 7 }}>
            <span className="t-body dim">Fee</span>
            <span className="t-body t-num">{fee > 0 ? `−${money(fee)}` : money(0)}</span>
          </div>
          <div className="mn-paper-due">
            <span className="t-row">Net to you</span>
            <span className="mn-paper-due-value t-num">{money(draft.amountCents - fee)}</span>
          </div>
        </div>
      </div>

      <div className="sheet-foot">
        <Button
          full variant="secondary" icon="send"
          onClick={() => toast({ text: `Receipt sent to ${customer.email ?? customer.name}`, tone: "success" })}
        >
          Share receipt
        </Button>
        <Button full size="lg" data-shot="payment-done-close" onClick={api.close}>Done</Button>
      </div>
    </>
  );
}
