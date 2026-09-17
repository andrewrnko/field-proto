/* Templates — the four messages these two actually send, already merged.
 *
 * Nothing sends from the list. Picking one pushes a second step that shows the
 * recipient, the number it goes to, and the exact text, because a customer-
 * facing send has to show the recipient and the content before it goes
 * (contract §8). The second button puts it in the composer instead, for when
 * the wording needs a human touch. */
import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { Button, Pressable } from "../../ui/primitives";
import { SheetHead } from "../../ui/domain";
import type { SheetApi } from "../../ui/Sheet";
import { useDB, useEntities } from "../../data/store";
import { NOW, dayOffsetOf } from "../../data/clock";
import { dateLabel, dayName, money, phone, time } from "../../lib/format";
import { estimateTotals, type Stage } from "../../data/types";
import { haptic } from "../../lib/haptics";
import "./inbox.css";

type Template = {
  id: string;
  title: string;
  note: string;
  icon: "truck" | "money" | "alert" | "shield";
  text: string | null;
  blocked?: string;
};

export function TemplatesSheet({
  api, threadId, onInsert, onSend,
}: {
  api: SheetApi;
  threadId: string;
  onInsert: (text: string) => void;
  onSend: (text: string) => Promise<void>;
}) {
  const templates = useTemplates(threadId);
  const { db } = useDB();
  const e = useEntities();
  const thread = db.threads.find((t) => t.id === threadId)!;
  const customer = e.customer(thread.customerId);

  return (
    <>
      <SheetHead api={api} title="Send a template" subtitle={`To ${customer.name}`} icon="doc" />
      <div className="sheet-body stack gap-3">
        {templates.every((t) => !t.text) && (
          <div className="notice">
            <Icon name="alert" size={17} />
            <span className="grow t-body">
              Nothing to merge yet — this job has no schedule, estimate or invoice on it. Write to
              {" "}{customer.name.split(/\s+/)[0]} in your own words instead.
            </span>
          </div>
        )}
        <div className="list">
          {templates.map((t) => (
            <Pressable
              key={t.id}
              className="row tpl-row"
              disabled={!t.text}
              data-shot={`tpl-${t.id}`}
              onClick={() => t.text && api.push((a) => (
                <TemplatePreview
                  api={a} template={t} threadId={threadId}
                  onInsert={onInsert} onSend={onSend}
                />
              ))}
            >
              <span className="row-lead action-icon"><Icon name={t.icon} size={19} /></span>
              <span className="row-body">
                <span className="t-row">{t.title}</span>
                <span className="t-meta">{t.text ? t.note : t.blocked}</span>
              </span>
              {t.text && <Icon name="chevron" size={17} className="dimmer" />}
            </Pressable>
          ))}
        </div>
      </div>
    </>
  );
}

function TemplatePreview({
  api, template, threadId, onInsert, onSend,
}: {
  api: SheetApi;
  template: Template;
  threadId: string;
  onInsert: (text: string) => void;
  onSend: (text: string) => Promise<void>;
}) {
  const { db } = useDB();
  const e = useEntities();
  const thread = db.threads.find((t) => t.id === threadId)!;
  const customer = e.customer(thread.customerId);
  const job = thread.jobId ? e.job(thread.jobId) : null;
  const [busy, setBusy] = useState(false);
  const text = template.text ?? "";

  return (
    <>
      <SheetHead api={api} title={template.title} subtitle="Check it before it goes" icon={template.icon} />
      <div className="sheet-body stack gap-3">
        <div className="tpl-to">
          <span className="grow">
            <span className="t-meta block">Goes to</span>
            <span className="t-row">{customer.name} · {phone(customer.phone)}</span>
          </span>
          <Icon name="message" size={18} className="dimmer" />
        </div>
        <div className="tpl-preview">
          <p className="t-body">{text}</p>
        </div>
        <p className="t-meta">
          {job ? `Filed against ${job.title}. ` : ""}
          {text.length} characters · sends as {thread.channel === "email" ? "an email" : "a text"}
        </p>
      </div>
      <div className="sheet-foot">
        <Button
          full icon="send" pending={busy}
          onClick={async () => {
            setBusy(true);
            haptic("medium");
            await onSend(text);
            setBusy(false);
            api.close();
          }}
        >
          Send to {customer.name.split(/\s+/)[0]}
        </Button>
        <Button
          variant="secondary" full icon="edit"
          onClick={() => { onInsert(text); api.close(); }}
        >
          Put it in the composer
        </Button>
      </div>
    </>
  );
}

/* ---------------------------- the merge ---------------------------- */

function useTemplates(threadId: string): Template[] {
  const { db } = useDB();
  const e = useEntities();
  const thread = db.threads.find((t) => t.id === threadId)!;
  const customer = e.customer(thread.customerId);
  const job = thread.jobId ? e.job(thread.jobId) : null;
  const property = job ? e.property(job.propertyId) : e.property(customer.propertyIds[0]);
  const first = customer.name.split(/\s+/)[0];
  const address = property?.address ?? "your place";

  const appt = job
    ? e.appointments(job.id).filter((a) => new Date(a.startAt) >= NOW).sort((a, b) => a.startAt.localeCompare(b.startAt))[0]
    : undefined;
  const invoice = job
    ? e.invoices(job.id).find((i) => i.kind === "deposit" && i.amountCents > i.paidCents)
    : undefined;
  const estimate = job
    ? e.estimates(job.id).find((x) => x.status === "sent" || x.status === "approved") ?? e.estimates(job.id)[0]
    : undefined;
  const lead = appt?.crewIds.length ? e.person(appt.crewIds[0]) : null;
  const changeOrder = job
    ? e.changeOrders(job.id).find((c) => c.status === "draft" || c.status === "sent")
    : undefined;

  const depositCents = invoice
    ? invoice.amountCents - invoice.paidCents
    : estimate ? estimateTotals(estimate).deposit : 0;

  return [
    {
      id: "arrival",
      title: "Crew arriving window",
      note: appt ? `${whenPhrase(appt.startAt)}, ${time(appt.startAt)} to ${time(hourAfter(appt.startAt))}` : "",
      icon: "truck",
      blocked: "Nothing is on the schedule for this job yet",
      /* An arrival window, not the whole work block — and never the access
         notes: padlock codes and tenant details are crew information. */
      text: appt
        ? `Hi ${first} — the crew will be at ${address} ${whenPhrase(appt.startAt)} between `
          + `${time(appt.startAt)} and ${time(hourAfter(appt.startAt))}. `
          + `${lead ? `${lead.name.split(/\s+/)[0]} is running the job. ` : ""}`
          + `Text this number if anything changes on your end.`
        : null,
    },
    {
      id: "deposit",
      title: "Deposit link",
      note: depositCents > 0 ? `${money(depositCents, { cents: false })} to lock the date` : "",
      icon: "money",
      blocked: "No deposit is outstanding on this job",
      text: depositCents > 0 && job
        ? `Hi ${first} — here is the deposit for ${job.title.toLowerCase()}: ${money(depositCents, { cents: false })}. `
          + `Once it lands we lock your start date. Pay here: gotrot.com/pay/${invoice?.number ?? estimate?.number ?? job.id.toUpperCase()}`
        : null,
    },
    {
      id: "change-order",
      title: "Change order needs approval",
      note: changeOrder ? `${changeOrder.number} · ${money(estimateTotals(changeOrder).subtotal, { cents: false })}` : "",
      icon: "alert",
      blocked: "No open change order on this job",
      text: changeOrder
        ? `Hi ${first} — we opened up ${address} and found ${lower(changeOrder.reason)}. `
          + `${changeOrder.number} covers it: ${money(estimateTotals(changeOrder).subtotal, { cents: false })}`
          + `${changeOrder.scheduleImpactDays > 0 ? ` and adds ${changeOrder.scheduleImpactDays} day${changeOrder.scheduleImpactDays > 1 ? "s" : ""} to the schedule` : " with no change to the schedule"}. `
          + `Nothing happens until you approve it: gotrot.com/co/${changeOrder.number}`
        : null,
    },
    {
      id: "care",
      title: "Post-job care",
      note: job?.warrantyUntil ? `Warranty runs to ${dateLabel(job.warrantyUntil)}` : "Sent after the walkthrough",
      icon: "shield",
      blocked: job ? "Sent once the work is closed out" : "Link this thread to a job first",
      text: job && CLOSING_STAGES.includes(job.stage)
        ? `Hi ${first} — ${job.title.toLowerCase()} is wrapped. Keep the crawl hatch shut and the foundation vents clear, `
          + `and run the bath fans a few minutes longer through the winter. `
          + `If you ever see moisture come back in the same spot, call us — you are covered `
          + `${job.warrantyUntil ? `until ${dateLabel(job.warrantyUntil)}` : "for a full year"}.`
        : null,
    },
  ];
}

/* Care instructions are a lie before the work is done. */
const CLOSING_STAGES: Stage[] = ["punch_list", "complete", "warranty"];

function hourAfter(iso: string) {
  const t = new Date(iso);
  t.setHours(t.getHours() + 1);
  return t.toISOString();
}

function whenPhrase(iso: string) {
  const off = dayOffsetOf(iso);
  if (off === 0) return "today";
  if (off === 1) return "tomorrow";
  if (off > 1 && off < 7) return `on ${dayName(iso, "long")}`;
  return `on ${dayName(iso, "long")}, ${dateLabel(iso)}`;
}

function lower(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
