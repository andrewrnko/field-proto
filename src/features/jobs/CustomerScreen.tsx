/* The customer record.
 *
 * A customer owns properties; properties carry jobs. The app never merges two
 * people because their names look alike, and never duplicates a contact just
 * because a second job started — so this screen has to make the selected
 * property explicit. */
import { useState } from "react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Avatar, Badge, Button, Pressable, SectionHead, useToast } from "../../ui/primitives";
import { StageChip } from "../../ui/domain";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { compactMoney, dateLabel, money, phone, relative } from "../../lib/format";
import { JobDetail } from "./JobDetail";

export function CustomerScreen({ customerId }: { customerId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const toast = useToast();

  const customer = e.customer(customerId);
  const properties = customer.propertyIds.map((id) => e.property(id));
  const jobs = e.jobsFor(customerId);
  const [propertyId, setPropertyId] = useState<string | "all">(properties.length > 1 ? "all" : properties[0]?.id ?? "all");
  const shown = propertyId === "all" ? jobs : jobs.filter((j) => j.propertyId === propertyId);

  const lifetime = jobs.filter((j) => j.stage !== "lost").reduce((s, j) => s + j.valueCents, 0);
  const threads = db.threads.filter((t) => t.customerId === customerId);

  return (
    <Screen
      title={customer.name}
      subtitle={`Customer since ${dateLabel(customer.since)} · ${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
      back
      backLabel="Job"
      actions={
        <Pressable className="round round-plain" style={{ width: 36, height: 36 }} aria-label={`Call ${customer.name}`} onClick={() => toast({ text: `Calling ${phone(customer.phone)}` })}>
          <Icon name="phone" size={20} />
        </Pressable>
      }
    >
      <div className="card pad">
        <div className="hrow" style={{ gap: 12 }}>
          <Avatar name={customer.name} size={44} tone={3} />
          <div className="grow">
            <p className="t-row">{phone(customer.phone)}</p>
            <p className="t-meta">Prefers {customer.preferredContact}{customer.email ? ` · ${customer.email}` : ""}</p>
          </div>
        </div>
        {customer.notes && <p className="t-body" style={{ paddingTop: 12 }}>{customer.notes}</p>}
        <div className="hrow" style={{ paddingTop: 12, gap: 8 }}>
          <Button size="sm" variant="secondary" icon="message" onClick={() => toast({ text: "Opens the thread" })}>Message</Button>
          <Button size="sm" variant="quiet" icon="doc" onClick={() => toast({ text: "Full history" })}>History</Button>
          <span className="grow" />
          <span className="t-num t-row">{compactMoney(lifetime)}</span>
        </div>
      </div>

      {properties.length > 1 && (
        <>
          <SectionHead title="Properties" count={properties.length} />
          <div className="chip-row">
            <button className={`chip${propertyId === "all" ? " is-on" : ""}`} onClick={() => setPropertyId("all")}>All</button>
            {properties.map((p) => (
              <button key={p.id} className={`chip${propertyId === p.id ? " is-on" : ""}`} onClick={() => setPropertyId(p.id)}>
                {p.address.split(",")[0]}
              </button>
            ))}
          </div>
        </>
      )}

      {properties
        .filter((p) => propertyId === "all" || p.id === propertyId)
        .map((p) => (
          <div key={p.id} className="card pad" style={{ marginTop: 10 }}>
            <div className="between">
              <div className="grow">
                <p className="t-row">{p.address}</p>
                <p className="t-meta">{p.city} {p.zip}{p.yearBuilt ? ` · built ${p.yearBuilt}` : ""}</p>
              </div>
              <Icon name="home" size={20} className="dimmer" />
            </div>
            {p.structures.length > 0 && (
              <div className="chip-row" style={{ paddingTop: 10 }}>
                {p.structures.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
            )}
            {p.accessNotes && <p className="t-meta access"><Icon name="lock" size={14} /> {p.accessNotes}</p>}
          </div>
        ))}

      <SectionHead title="Jobs" count={shown.length} />
      <div className="list">
        {shown.map((j) => (
          <Pressable key={j.id} className="row" onClick={() => push(`job-${j.id}`, () => <JobDetail jobId={j.id} />)}>
            <span className="row-body">
              <span className="t-row truncate">{j.title}</span>
              <span className="t-meta">{relative(j.createdAt, NOW)} · {money(j.valueCents, { cents: false })}</span>
              <span className="hrow" style={{ paddingTop: 5, gap: 6 }}>
                <StageChip stage={j.stage} />
                {j.warrantyUntil && new Date(j.warrantyUntil) > NOW && <Badge tone="success">Under warranty</Badge>}
              </span>
            </span>
            <Icon name="chevron" size={17} className="dimmer" />
          </Pressable>
        ))}
      </div>

      {threads.length > 0 && (
        <>
          <SectionHead title="Conversations" count={threads.length} />
          <div className="list">
            {threads.map((t) => (
              <Pressable key={t.id} className="row row-dense" onClick={() => toast({ text: "Opens in Inbox" })}>
                <span className="row-lead action-icon"><Icon name={t.channel === "call" ? "phone" : t.channel === "email" ? "doc" : "message"} size={18} /></span>
                <span className="row-body">
                  <span className="t-body">{t.channel === "call" ? "Calls" : t.channel === "email" ? "Email" : "Texts"}</span>
                  <span className="t-meta">Last {relative(t.lastAt, NOW)}</span>
                </span>
                {t.needsReply && <Badge tone="warning">Needs reply</Badge>}
              </Pressable>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}
