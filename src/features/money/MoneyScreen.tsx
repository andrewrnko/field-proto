/* Money — one number, then what is stuck.
 *
 * A founder checks this twice a day to answer one question: is anything not
 * moving. So the screen is the outstanding figure, the handful of invoices that
 * are actually stuck with the one action that unsticks each, and three lines
 * that open everything else. Lists live in sheets, not on the surface. */
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Button, Pressable, Ticker, useToast } from "../../ui/primitives";
import { SheetHead } from "../../ui/domain";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { compactMoney, dateLabel, money, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { LABOR_RATE_CENTS, estimateTotals } from "../../data/types";
import { InvoiceSheet } from "./InvoiceSheet";
import { useInvoiceActions } from "./actions";
import {
  KIND_LABEL, STATE_LABEL, attention, headline, isOpen, openGroups, outstandingOf, paidGroups,
  stateTone, type Attention,
} from "./model";
import { EstimateScreen } from "../estimate/EstimateScreen";
import { salesMix } from "./mix";
import { WORK_LABEL } from "../../data/types";
import { Obj } from "../../ui/Obj";
import "./money.css";

export function MoneyScreen() {
  const { db } = useDB();
  const e = useEntities();
  const { present } = useSheets();
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);

  const h = useMemo(() => headline(db), [db]);
  const stuck = useMemo(() => attention(db), [db]);
  const waiting = useMemo(
    () => db.estimates
      .filter((x) => x.status === "sent" || x.status === "viewed")
      .sort((a, b) => (a.sentAt ?? a.createdAt).localeCompare(b.sentAt ?? b.createdAt)),
    [db.estimates],
  );

  const openInvoice = (id: string, autoPay?: boolean) =>
    present((api) => <InvoiceSheet api={api} invoiceId={id} autoPay={autoPay} />, { detents: [0.66, 0.94] });

  return (
    <Screen
      title="Money"
      hideTitle
      onRefresh={async () => {
        setRefreshing(true);
        await new Promise((r) => setTimeout(r, 900));
        setRefreshing(false);
        setStale(!navigator.onLine);
      }}
      actions={
        <Pressable
          className="round round-plain" style={{ width: 40, height: 40 }} aria-label="Money settings"
          onClick={() => present((api) => <MoneyInfo api={api} />, { detents: ["auto"] })}
        >
          <Icon name="moreVert" size={22} />
        </Pressable>
      }
    >
      {/* --------------------------- the number --------------------------- */}
      <div className="mny-hero">
        <p className="mny-label">Outstanding</p>
        <p className="t-figure mny-figure">
          <Ticker value={h.outstanding} format={(n) => money(n, { cents: false })} />
        </p>
        <p className="mny-caption">
          across {h.openCount} invoice{h.openCount === 1 ? "" : "s"}
          {h.overdueCents > 0 && <> · <span className="tone-danger">{compactMoney(h.overdueCents)} overdue</span></>}
        </p>
        <p className="mny-caption mny-second">
          {money(h.collectedThisMonth, { cents: false })} collected in {NOW.toLocaleDateString("en-US", { month: "long", timeZone: "America/Los_Angeles" })}
          {h.avgDaysToCollect != null && <> · paid in {h.avgDaysToCollect} days on average</>}
        </p>
        {stale && (
          <p className="mny-stale"><Icon name="alert" size={15} /> Showing the last numbers that reached this phone</p>
        )}
      </div>

      {/* ---------------------------- what's stuck ------------------------ */}
      {stuck.length === 0 ? (
        <div className="mny-clear">
          <motion.span className="mny-clear-mark" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.pop}>
            <Icon name="check" size={28} strokeWidth={2.2} />
          </motion.span>
          <p className="t-section">Nothing is stuck</p>
          <p className="t-body dim">Every open invoice is inside its terms.</p>
        </div>
      ) : (
        <section className="mny-sec">
          <h2>Stuck</h2>
          <div>
            {stuck.map((a) => <StuckRow key={a.key} item={a} refreshing={refreshing} onOpen={openInvoice} />)}
          </div>
        </section>
      )}

      {/* ------------------------------ openers --------------------------- */}
      <section className="mny-sec">
        <h2>Everything else</h2>
        <div>
          <Pressable className="mny-open" onClick={() => present((api) => <InvoicesSheet api={api} onOpen={openInvoice} />, { detents: [0.66, 0.94] })}>
            <span className="grow">
              <span className="mny-open-t">Open invoices</span>
              <span className="mny-open-s">{h.openCount} out with customers{h.inFlight > 0 ? ` · ${compactMoney(h.inFlight)} still settling` : ""}</span>
            </span>
            <span className="mny-open-fig">{compactMoney(h.outstanding)}</span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>

          <Pressable className="mny-open" onClick={() => present((api) => <WaitingSheet api={api} />, { detents: ["auto", 0.9] })}>
            <span className="grow">
              <span className="mny-open-t">Estimates with no answer</span>
              <span className="mny-open-s">
                {waiting.length === 0
                  ? "Nothing waiting on a decision"
                  : `Oldest sent ${relative(waiting[0].sentAt ?? waiting[0].createdAt, NOW)}`}
              </span>
            </span>
            <span className="mny-open-fig">{waiting.length}</span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>

          <Pressable className="mny-open" onClick={() => present((api) => <MixSheet api={api} />, { detents: ["auto", 0.92] })}>
            <span className="grow">
              <span className="mny-open-t">What's worth selling</span>
              <span className="mny-open-s">Margin by the four jobs you actually sell</span>
            </span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>

          <Pressable className="mny-open" onClick={() => present((api) => <PaidSheet api={api} onOpen={openInvoice} />, { detents: [0.66, 0.94] })}>
            <span className="grow">
              <span className="mny-open-t">Money in</span>
              <span className="mny-open-s">{h.collectedCount} payments settled this month</span>
            </span>
            <span className="mny-open-fig">{compactMoney(h.collectedThisMonth)}</span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>
        </div>
      </section>

      <p className="mny-foot">{e.person(db.me)?.name.split(" ")[0]}'s view · fixtures, not live banking</p>
    </Screen>
  );
}

/* ------------------------------ stuck row ------------------------------ */

function StuckRow({
  item, refreshing, onOpen,
}: { item: Attention; refreshing: boolean; onOpen: (id: string, autoPay?: boolean) => void }) {
  const e = useEntities();
  const { remind } = useInvoiceActions();
  const [busy, setBusy] = useState(false);
  const customer = e.customer(item.job.customerId);

  const act = item.kind === "failed"
    ? { label: "Retry payment", run: () => onOpen(item.invoice.id, true) }
    : { label: "Send reminder", run: async () => { setBusy(true); await remind(item.invoice); setBusy(false); } };

  return (
    <motion.div className="mny-stuck" animate={{ opacity: refreshing ? 0.55 : 1 }} transition={SPRING.sheet}>
      <Pressable className="mny-stuck-body" onClick={() => onOpen(item.invoice.id)} scale={0.995}>
        <Obj name={item.kind === "failed" ? "warning" : item.kind === "deposit" ? "coins" : "docs"}
             hue={item.kind === "failed" ? "coral" : item.kind === "deposit" ? "emerald" : "amber"} size={44} />
        <span className="mny-stuck-text">
        <span className="mny-stuck-top">
          <span className="mny-stuck-name truncate grow">{customer.name}</span>
          <span className="mny-stuck-fig">{money(outstandingOf(item.invoice), { cents: false })}</span>
        </span>
        <span className={`mny-stuck-why${item.kind === "failed" ? " is-bad" : ""}`}>
          <i />{item.headlineText}
        </span>
        <span className="mny-stuck-sub">{item.reason}</span>
        {item.consequence && <span className="mny-stuck-cons">{item.consequence}</span>}
        </span>
      </Pressable>
      <div className="mny-stuck-act">
        <Button
          size="md" variant={item.kind === "failed" ? "primary" : "secondary"} pending={busy}
          onClick={() => { haptic("medium"); void act.run(); }}
        >
          {act.label}
        </Button>
        <Pressable className="mny-stuck-link" onClick={() => onOpen(item.invoice.id)}>
          {item.invoice.number}
          <Icon name="chevron" size={15} />
        </Pressable>
      </div>
    </motion.div>
  );
}

/* -------------------------------- sheets -------------------------------- */

function InvoicesSheet({ api, onOpen }: { api: SheetApi; onOpen: (id: string) => void }) {
  const { db } = useDB();
  const e = useEntities();
  const groups = openGroups(db.invoices.filter(isOpen));
  return (
    <>
      <SheetHead api={api} title="Open invoices" subtitle={`${db.invoices.filter(isOpen).length} out with customers`} icon="doc" />
      <div className="sheet-body scroll" data-sheet-scroll>
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mny-group">{g.title}{g.note ? ` · ${g.note}` : ""}</p>
            {g.invoices.map((inv) => {
              const job = e.job(inv.jobId);
              return (
                <Pressable key={inv.id} className="mny-open" onClick={() => { api.close(); onOpen(inv.id); }}>
                  <span className="grow">
                    <span className="mny-open-t">{e.customer(job.customerId).name}</span>
                    <span className="mny-open-s">{inv.number} · {KIND_LABEL[inv.kind]} · due {dateLabel(inv.dueAt)}</span>
                    <span className={`mny-state tone-${stateTone(inv.state)}`}><i />{STATE_LABEL[inv.state]}</span>
                  </span>
                  <span className="mny-open-fig">{money(outstandingOf(inv), { cents: false })}</span>
                </Pressable>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function PaidSheet({ api, onOpen }: { api: SheetApi; onOpen: (id: string) => void }) {
  const { db } = useDB();
  const e = useEntities();
  const groups = paidGroups(db);
  return (
    <>
      <SheetHead api={api} title="Money in" subtitle="Settled payments" icon="money" />
      <div className="sheet-body scroll" data-sheet-scroll>
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mny-group">{g.title}{g.note ? ` · ${g.note}` : ""}</p>
            {g.invoices.map((inv) => {
              const job = e.job(inv.jobId);
              return (
                <Pressable key={inv.id} className="mny-open" onClick={() => { api.close(); onOpen(inv.id); }}>
                  <span className="grow">
                    <span className="mny-open-t">{e.customer(job.customerId).name}</span>
                    <span className="mny-open-s">{inv.number} · {KIND_LABEL[inv.kind]}</span>
                  </span>
                  <span className="mny-open-fig">{money(inv.paidCents, { cents: false })}</span>
                </Pressable>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function WaitingSheet({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const toast = useToast();
  const waiting = db.estimates
    .filter((x) => x.status === "sent" || x.status === "viewed")
    .sort((a, b) => (a.sentAt ?? a.createdAt).localeCompare(b.sentAt ?? b.createdAt));

  return (
    <>
      <SheetHead api={api} title="Waiting on a decision" subtitle={`${waiting.length} estimates`} icon="doc" />
      <div className="sheet-body scroll" data-sheet-scroll>
        {waiting.map((est) => {
          const job = e.job(est.jobId);
          const days = Math.round((NOW.getTime() - new Date(est.sentAt ?? est.createdAt).getTime()) / 864e5);
          return (
            <div key={est.id} className="mny-open">
              <span className="grow">
                <span className="mny-open-t">{e.customer(job.customerId).name}</span>
                <span className={`mny-open-s${days >= 10 ? " tone-danger" : days >= 5 ? " tone-warning" : ""}`}>
                  Sent {days} days ago · {est.viewedAt ? "opened, no answer" : "never opened"}
                </span>
              </span>
              <span className="mny-open-fig">{money(estimateTotals(est).subtotal, { cents: false })}</span>
              <Button size="sm" variant="secondary" onClick={() => { api.close(); push(`est-${est.id}`, () => <EstimateScreen estimateId={est.id} />); }}>
                Open
              </Button>
            </div>
          );
        })}
      </div>
      <div className="sheet-foot">
        <Button full size="lg" icon="message" onClick={() => { toast({ text: "Follow-ups queued for all three", tone: "success", undo: () => {} }); api.close(); }}>
          Follow up on all {waiting.length}
        </Button>
      </div>
    </>
  );
}

function MixSheet({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const rows = salesMix(db);
  const best = [...rows].sort((a, b) => b.pricedMargin - a.pricedMargin)[0];
  const OBJ = { crawl: "house", deck: "beam", siding: "tools", water: "drop" } as const;
  const HUE = { crawl: "blue", deck: "amber", siding: "slate", water: "cyan" } as const;

  return (
    <>
      <SheetHead api={api} title="What's worth selling" subtitle="From your own estimates and hours" />
      <div className="sheet-body scroll stack gap-4" data-sheet-scroll>
        <p className="t-body dim">
          {WORK_LABEL[best.type]} jobs price at {Math.round(best.pricedMargin * 100)}%, the best margin you sell
          {best.avgDecisionDays != null ? `, and they come back with a yes in about ${Math.round(best.avgDecisionDays)} days.` : "."}
        </p>

        {rows.map((r) => (
          <div key={r.type} className="mix-row">
            <Obj name={OBJ[r.type]} hue={HUE[r.type]} size={44} />
            <div className="grow">
              <div className="mix-top">
                <span className="mix-name">{WORK_LABEL[r.type]}</span>
                <span className="mix-value t-num">{compactMoney(r.valueCents)}</span>
              </div>
              <div className="mix-bars">
                <span className="mix-bar"><i style={{ width: `${Math.max(0, Math.min(r.pricedMargin, 1)) * 100}%` }} /></span>
                <span className="mix-pct t-num">{Math.round(r.pricedMargin * 100)}%</span>
              </div>
              <p className="mix-meta">
                {r.won} sold{r.openLeads > 0 ? ` · ${r.openLeads} in the pipe` : ""}
                {r.avgValueCents > 0 ? ` · ${compactMoney(r.avgValueCents)} average` : ""}
                {/* only an over-burn means anything while jobs are still open */}
                {r.hourBurn != null && r.hourBurn > 1.05
                  ? ` · burning ${Math.round((r.hourBurn - 1) * 100)}% more hours than priced`
                  : ""}
                {r.winRate != null ? ` · wins ${Math.round(r.winRate * 100)}%` : ""}
              </p>
            </div>
          </div>
        ))}

        <p className="t-meta">
          Margin is the estimate's own price against its own cost. Where a job has hours clocked, the
          running figure uses those hours at {money(LABOR_RATE_CENTS)}/h plus materials — so it moves while the job is open.
        </p>
      </div>
    </>
  );
}

function MoneyInfo({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const h = headline(db);
  return (
    <>
      <SheetHead api={api} title="How this is counted" icon="money" />
      <div className="sheet-body stack gap-3">
        <p className="t-body">
          Outstanding is every invoice that has been sent and is not fully paid, minus what has settled against it.
          Payments that are still authorising are not counted as collected.
        </p>
        <p className="t-body dim">
          {h.inFlight > 0 ? `${money(h.inFlight, { cents: false })} is authorised and still settling.` : "Nothing is mid-settlement."}
          {h.avgDaysToCollect != null && ` Average time to collect is measured over ${h.collectedSample} fully paid invoices.`}
        </p>
      </div>
      <div className="sheet-foot"><Button full variant="secondary" onClick={api.close}>Got it</Button></div>
    </>
  );
}
