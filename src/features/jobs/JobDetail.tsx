/* The job record.
 *
 * Opens with the place, because a founder recognises the house before they read
 * a name. Then one line of state, then the one action that moves it. Scope,
 * findings, money, schedule and history are sections that open into sheets —
 * the record is not a tabbed database view. */
import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Icon, type IconName } from "../../ui/Icon";
import { Avatar, Badge, Button, Pressable, useToast } from "../../ui/primitives";
import { MoneyRow, SeverityChip, SheetHead, photoSrc } from "../../ui/domain";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { PhotoViewer } from "../../ui/PhotoViewer";
import { useDB, useEntities, useSaver, SAVE_LABEL } from "../../data/store";
import { NOW } from "../../data/clock";
import { dateLabel, money, phone, relative, time } from "../../lib/format";
import { haptic } from "../../lib/haptics";
import { SEVERITY_LABEL, STAGE_LABEL, estimateTotals, type Photo, type Stage } from "../../data/types";
import { InspectionFlow } from "../inspect/InspectionFlow";
import { EstimateScreen } from "../estimate/EstimateScreen";
import { ChangeOrderFlow } from "../estimate/ChangeOrderFlow";
import { CustomerScreen } from "./CustomerScreen";
import { CallbackSection, CostSection, MaterialsSection } from "./JobOps";
import { MapView } from "../../ui/MapView";
import { MoistureSection } from "./Moisture";
import "./record.css";

export function JobDetail({ jobId }: { jobId: string }) {
  const { commit } = useDB();
  const e = useEntities();
  const { present } = useSheets();
  const { push, pop } = useNav();
  const toast = useToast();
  const saver = useSaver();
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);

  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const owner = e.person(job.ownerId);
  const findings = e.findings(jobId);
  const photos = e.photos(jobId);
  const estimates = e.estimates(jobId);
  const invoices = e.invoices(jobId);
  const activity = e.activity(jobId);
  const appointments = e.appointments(jobId).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = appointments.find((a) => new Date(a.endAt) >= NOW);
  const crew = job.crewIds.map((id) => e.person(id)).filter(Boolean);

  const late = !!job.nextAction && new Date(job.nextAction.dueAt) < NOW;
  const billed = invoices.reduce((s, i) => s + i.amountCents, 0);
  const paid = invoices.reduce((s, i) => s + i.paidCents, 0);
  const queued = photos.filter((p) => p.syncState !== "synced").length;

  /* one line that says where this job actually stands */
  const state = job.blocker
    ? { cls: "is-blocked", text: job.blocker.label }
    : late
      ? { cls: "is-late", text: `${job.nextAction!.label} — overdue ${relative(job.nextAction!.dueAt, NOW)}` }
      : job.schedule === "in_progress"
        ? { cls: "is-live", text: `Crew on site${crew.length ? ` — ${crew.map((p) => p!.name.split(" ")[0]).join(" and ")}` : ""}` }
        : { cls: "", text: `${STAGE_LABEL[job.stage]}${job.nextAction ? ` — ${job.nextAction.label.toLowerCase()} ${relative(job.nextAction.dueAt, NOW)}` : ""}` };

  /* the single most useful thing to do from here */
  const action = job.blocker?.kind === "awaiting_deposit"
    ? { label: "Re-run the deposit", icon: "money" as IconName, run: () => toast({ text: "Opens the payment sheet on the invoice" }) }
    : job.blocker?.kind === "awaiting_customer"
      ? { label: `Nudge ${customer.name.split(" ")[0]}`, icon: "message" as IconName, run: () => toast({ text: `Reminder sent to ${customer.name}`, tone: "success", undo: () => {} }) }
      : job.stage === "in_progress"
        ? { label: "Log a finding", icon: "ruler" as IconName, run: () => push(`inspect-${jobId}`, () => <InspectionFlow jobId={jobId} />) }
        : job.stage === "estimate_draft"
          ? { label: "Send the estimate", icon: "send" as IconName, run: () => { const est = estimates.at(-1); if (est) push(`est-${est.id}`, () => <EstimateScreen estimateId={est.id} />); } }
          : { label: `Call ${customer.name.split(" ")[0]}`, icon: "phone" as IconName, run: () => toast({ text: `Calling ${phone(customer.phone)}` }) };

  const changeStage = (stage: Stage) =>
    saver.run(commit((d) => {
      const j = d.jobs.find((x) => x.id === jobId)!;
      j.stage = stage;
      d.activity.push({
        id: `act-${Date.now()}`, jobId, at: NOW.toISOString(), actorId: d.me,
        kind: "stage", text: `Stage moved to ${STAGE_LABEL[stage]}`,
      });
      return d;
    }));

  return (
    <div className="rec">
      <div className="scroll rec-scroll">
        {/* ------------------------- the place ------------------------- */}
        <div className="rec-hero">
          {property.photo && <img src={photoSrc({ seed: property.photo })} alt="" />}
          <div className="rec-nav">
            <Pressable className="rec-orb" onClick={pop} aria-label="Back"><Icon name="chevronLeft" size={22} /></Pressable>
            <div className="hrow" style={{ gap: 8 }}>
              <Pressable className="rec-orb" aria-label={`Call ${customer.name}`} onClick={() => toast({ text: `Calling ${phone(customer.phone)}` })}>
                <Icon name="phone" size={20} />
              </Pressable>
              <Pressable
                className="rec-orb" aria-label="Job actions" data-shot="job-actions"
                onClick={() => present((api) => <JobActions api={api} jobId={jobId} onStage={changeStage} />, { detents: ["auto"] })}
              >
                <Icon name="moreVert" size={20} />
              </Pressable>
            </div>
          </div>
          <Pressable
            className="rec-ident"
            onClick={() => push(`cust-${customer.id}`, () => <CustomerScreen customerId={customer.id} />)}
            aria-label={`Open ${customer.name}`}
          >
            <span className="rec-name">{customer.name}</span>
            <span className="rec-where">{property.address}, {property.city}</span>
          </Pressable>
        </div>

        {/* ------------------------- the state ------------------------- */}
        <div className="rec-state">
          <div className={`rec-line ${state.cls}`}>
            <i />
            <p>{state.text}</p>
          </div>
          {saver.state !== "idle" && <p className={`t-meta rec-save save-${saver.state}`}>{SAVE_LABEL[saver.state]}</p>}
        </div>

        {/* -------------------------- the place ------------------------ */}
        <section className="rec-sec">
          <MapView
            property={property}
            live={job.schedule === "in_progress"}
            caption={next ? `${crew.map((p) => p!.name.split(" ")[0]).join(" and ") || "Crew"} · ${dateLabel(next.startAt)}` : undefined}
          />
        </section>

        {/* ------------------------- the work -------------------------- */}
        <section className="rec-sec">
          <h2>The work</h2>
          <p className="rec-scope">{job.scopeSummary}</p>
          {property.accessNotes && (
            <p className="rec-access"><Icon name="lock" size={17} />{property.accessNotes}</p>
          )}
        </section>

        {/* --------------------- hours, cost, materials ---------------- */}
        <MoistureSection jobId={jobId} />
        <CostSection jobId={jobId} />
        <MaterialsSection jobId={jobId} />
        <CallbackSection jobId={jobId} />

        {/* ------------------------ what we found ---------------------- */}
        {findings.length > 0 && (
          <section className="rec-sec">
            <h2>What we found <span className="dimmer" style={{ fontWeight: 500 }}>{findings.length}</span></h2>
            <div className="rec-strip">
              {findings.slice(0, 6).map((f) => {
                const shot = photos.find((p) => f.photoIds.includes(p.id));
                return (
                  <Pressable
                    key={f.id} className="rec-shot"
                    aria-label={f.title}
                    onClick={() => present((api) => (
                      <FindingSheet api={api} findingId={f.id} onOpenPhoto={(ps, i) => setViewer({ photos: ps, index: i })} />
                    ), { detents: ["auto"] })}
                  >
                    {shot && <img src={photoSrc(shot)} alt="" loading="lazy" />}
                    <span className="rec-shot-tag">{f.title}</span>
                  </Pressable>
                );
              })}
              <Pressable
                className="rec-shot-more"
                onClick={() => present((api) => <FindingsSheet api={api} jobId={jobId} onOpenPhoto={(ps, i) => setViewer({ photos: ps, index: i })} />, { detents: [0.62, 0.94] })}
              >
                <Icon name="layers" size={22} />
                <span className="t-meta">All {findings.length}</span>
              </Pressable>
            </div>
            {queued > 0 && (
              <p className="rec-access"><Icon name="refresh" size={17} />{queued} photos saved on this phone, waiting for signal</p>
            )}
          </section>
        )}

        {/* --------------------- everything else ----------------------- */}
        <section className="rec-sec">
          <h2>Details</h2>
          <div>
            <Pressable className="rec-open" onClick={() => present((api) => <MoneySheet api={api} jobId={jobId} />, { detents: ["auto", 0.92] })}>
              <span className="grow">
                <span className="rec-open-t">Money</span>
                <span className="rec-open-s">
                  {billed === 0 ? "Nothing billed yet" : paid >= billed ? "Paid in full" : `${money(billed - paid, { cents: false })} outstanding of ${money(billed, { cents: false })}`}
                </span>
              </span>
              <span className="rec-open-fig">{money(job.valueCents, { cents: false })}</span>
              <Icon name="chevron" size={18} className="dimmer" />
            </Pressable>

            <Pressable className="rec-open" onClick={() => present((api) => <ScheduleSheet api={api} jobId={jobId} />, { detents: ["auto"] })}>
              <span className="grow">
                <span className="rec-open-t">Schedule</span>
                <span className="rec-open-s">
                  {next ? `${dateLabel(next.startAt)} · ${time(next.startAt)}–${time(next.endAt)}` : "Nothing booked"}
                </span>
              </span>
              <span className="opener-faces">
                {crew.slice(0, 3).map((p) => <Avatar key={p!.id} name={p!.name} size={30} tone={p!.avatarTone} />)}
              </span>
              <Icon name="chevron" size={18} className="dimmer" />
            </Pressable>

            <Pressable className="rec-open" onClick={() => present((api) => <ActivitySheet api={api} jobId={jobId} />, { detents: [0.62, 0.94] })}>
              <span className="grow">
                <span className="rec-open-t">History</span>
                <span className="rec-open-s">
                  {activity.length} updates · last {activity[0] ? relative(activity[0].at, NOW) : "—"}
                </span>
              </span>
              <Icon name="chevron" size={18} className="dimmer" />
            </Pressable>

            <Pressable className="rec-open" onClick={() => push(`cust-${customer.id}`, () => <CustomerScreen customerId={customer.id} />)}>
              <span className="grow">
                <span className="rec-open-t">{customer.name}</span>
                <span className="rec-open-s">{owner ? `${owner.name} owns this` : "Nobody owns this yet"} · prefers {customer.preferredContact}</span>
              </span>
              <Icon name="chevron" size={18} className="dimmer" />
            </Pressable>
          </div>
        </section>
      </div>

      {/* --------------------------- the action --------------------------- */}
      <div className="rec-act">
        <Button size="lg" full icon={action.icon} onClick={() => { haptic("medium"); action.run(); }}>{action.label}</Button>
      </div>

      <AnimatePresence>
        {viewer && (
          <PhotoViewer photos={viewer.photos} index={viewer.index} by={(id) => e.person(id)} onClose={() => setViewer(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ sheets ------------------------------ */

function MoneySheet({ api, jobId }: { api: SheetApi; jobId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const job = e.job(jobId);
  const invoices = e.invoices(jobId);
  const estimates = e.estimates(jobId);
  const changeOrders = e.changeOrders(jobId);
  const payments = db.payments.filter((p) => p.jobId === jobId);
  const billed = invoices.reduce((s, i) => s + i.amountCents, 0);
  const paid = invoices.reduce((s, i) => s + i.paidCents, 0);
  const latest = estimates.at(-1);
  const totals = latest ? estimateTotals(latest) : null;

  return (
    <>
      <SheetHead api={api} title="Money" subtitle={job.title} icon="money" />
      <div className="sheet-body scroll stack gap-4" data-sheet-scroll style={{ maxHeight: 520 }}>
        <div>
          <MoneyRow label="Contract value" cents={job.valueCents} strong />
          {totals && <MoneyRow label="Internal cost" cents={totals.cost} note={`${Math.round(totals.margin * 100)}% margin`} />}
          <MoneyRow label="Billed" cents={billed} />
          <MoneyRow label="Collected" cents={paid} tone={paid >= billed && billed > 0 ? "success" : undefined} />
          <MoneyRow label="Outstanding" cents={billed - paid} strong tone={billed - paid > 0 ? "danger" : undefined} />
        </div>

        {latest && (
          <Pressable
            className="rec-open"
            onClick={() => { api.close(); push(`est-${latest.id}`, () => <EstimateScreen estimateId={latest.id} />); }}
          >
            <span className="grow">
              <span className="rec-open-t">{latest.number} · v{latest.version}</span>
              <span className="rec-open-s">
                {latest.status === "sent" ? `Sent ${relative(latest.sentAt ?? latest.createdAt, NOW)}`
                  : latest.status === "approved" ? `Approved ${relative(latest.decidedAt ?? latest.createdAt, NOW)}`
                    : `Draft · ${latest.items.length} items`}
              </span>
            </span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>
        )}

        {changeOrders.map((co) => (
          <div key={co.id} className="rec-open">
            <span className="grow">
              <span className="rec-open-t">{co.number}</span>
              <span className="rec-open-s">{co.reason}</span>
            </span>
            <span className="rec-open-fig">{money(estimateTotals(co).subtotal, { cents: false })}</span>
          </div>
        ))}

        {invoices.map((inv) => (
          <div key={inv.id} className="rec-open">
            <span className="grow">
              <span className="rec-open-t">{inv.number} · {inv.kind}</span>
              <span className={`rec-open-s${inv.state === "overdue" ? " tone-danger" : ""}`}>
                {inv.state === "paid" ? "Paid" : inv.state === "overdue" ? `Overdue ${relative(inv.dueAt, NOW)}` : `Due ${dateLabel(inv.dueAt)}`}
              </span>
            </span>
            <span className="rec-open-fig">{money(inv.amountCents - inv.paidCents, { cents: false })}</span>
          </div>
        ))}

        {payments.map((p) => (
          <div key={p.id} className="rec-open">
            <span className="grow">
              <span className="rec-open-t">{p.method === "ach" ? "Bank transfer" : p.method[0].toUpperCase() + p.method.slice(1)}</span>
              <span className="rec-open-s">{dateLabel(p.at)} · {p.reference}</span>
            </span>
            {p.state !== "settled" && <Badge tone={p.state === "failed" ? "danger" : "warning"}>{p.state}</Badge>}
            <span className="rec-open-fig">{money(p.amountCents)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function ScheduleSheet({ api, jobId }: { api: SheetApi; jobId: string }) {
  const e = useEntities();
  const toast = useToast();
  const appts = e.appointments(jobId).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const KIND: Record<string, string> = {
    inspection: "Inspection", work: "Work day", walkthrough: "Walkthrough",
    punch: "Punch list", delivery: "Material delivery",
  };
  return (
    <>
      <SheetHead api={api} title="Schedule" subtitle={`${appts.length} visits`} icon="schedule" />
      <div className="sheet-body scroll" data-sheet-scroll style={{ maxHeight: 420 }}>
        {appts.map((a) => {
          const past = new Date(a.endAt) < NOW;
          return (
            <div key={a.id} className="rec-open" style={{ opacity: past ? 0.5 : 1 }}>
              <span className="grow">
                <span className="rec-open-t">{KIND[a.kind]} · {dateLabel(a.startAt)}</span>
                <span className="rec-open-s">
                  {time(a.startAt)}–{time(a.endAt)} · {a.crewIds.map((id) => e.person(id)?.name.split(" ")[0]).filter(Boolean).join(", ") || "Unassigned"}
                </span>
              </span>
              {a.state === "tentative" && <Badge tone="warning">Tentative</Badge>}
            </div>
          );
        })}
      </div>
      <div className="sheet-foot">
        <Button full size="lg" icon="plus" onClick={() => { toast({ text: "Opens the schedule with free slots" }); api.close(); }}>Book another visit</Button>
      </div>
    </>
  );
}

function ActivitySheet({ api, jobId }: { api: SheetApi; jobId: string }) {
  const e = useEntities();
  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const activity = e.activity(jobId);
  return (
    <>
      <SheetHead api={api} title="History" subtitle={`${activity.length} updates`} icon="clock" />
      <div className="sheet-body scroll" data-sheet-scroll>
        <ol className="timeline">
          {activity.map((a) => {
            const actor = a.actorId === "system" || a.actorId === "customer" ? null : e.person(a.actorId);
            return (
              <li key={a.id} className="tl-item">
                <span className={`tl-dot tl-${a.kind}`} aria-hidden />
                <div className="grow">
                  <p className="t-body">{a.text}</p>
                  <p className="t-meta">
                    {a.actorId === "system" ? "Automation" : a.actorId === "customer" ? customer.name : actor?.name ?? "—"}
                    {" · "}{relative(a.at, NOW)}{a.meta ? ` · ${a.meta}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function FindingsSheet({
  api, jobId, onOpenPhoto,
}: { api: SheetApi; jobId: string; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const e = useEntities();
  const findings = e.findings(jobId);
  const photos = e.photos(jobId);
  return (
    <>
      <SheetHead api={api} title="What we found" subtitle={`${findings.length} findings`} icon="ruler" />
      <div className="sheet-body scroll" data-sheet-scroll>
        {findings.map((f) => {
          const shot = photos.find((p) => f.photoIds.includes(p.id));
          const fPhotos = f.photoIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as Photo[];
          return (
            <Pressable
              key={f.id} className="rec-open"
              onClick={() => (fPhotos.length ? (api.close(), onOpenPhoto(fPhotos, 0)) : undefined)}
            >
              {shot && <span className="thumb" style={{ width: 58, height: 58 }}><img src={photoSrc(shot)} alt="" /></span>}
              <span className="grow">
                <span className="rec-open-t">{f.title}</span>
                <span className="rec-open-s">{f.location}{f.moisturePct ? ` · ${f.moisturePct}% MC` : ""}</span>
                <span className={`sev-line sev-${f.severity}`}><i />{SEVERITY_LABEL[f.severity]}{f.isNewDamage ? " · new damage" : ""}</span>
              </span>
            </Pressable>
          );
        })}
      </div>
    </>
  );
}

function FindingSheet({
  api, findingId, onOpenPhoto,
}: { api: SheetApi; findingId: string; onOpenPhoto: (photos: Photo[], index: number) => void }) {
  const { db } = useDB();
  const e = useEntities();
  const finding = db.findings.find((f) => f.id === findingId)!;
  const photos = useMemo(
    () => finding.photoIds.map((id) => db.photos.find((p) => p.id === id)).filter(Boolean) as Photo[],
    [finding.photoIds, db.photos],
  );
  const by = e.person(finding.discoveredBy);
  return (
    <>
      <SheetHead api={api} title={finding.title} subtitle={finding.location} icon="ruler" />
      <div className="sheet-body stack gap-3">
        <div className="hrow" style={{ gap: 8, flexWrap: "wrap" }}>
          <SeverityChip severity={finding.severity} />
          {finding.isNewDamage && <Badge tone="danger">Not in original scope</Badge>}
          {finding.moisturePct != null && <Badge tone={finding.moisturePct > 20 ? "warning" : "neutral"}>{finding.moisturePct}% moisture</Badge>}
        </div>
        {photos.length > 0 && (
          <div className="rec-strip" style={{ margin: 0, padding: 0 }}>
            {photos.map((p, i) => (
              <Pressable key={p.id} className="rec-shot" style={{ width: 118, height: 150 }} onClick={() => { api.close(); onOpenPhoto(photos, i); }}>
                <img src={photoSrc(p)} alt="" />
              </Pressable>
            ))}
          </div>
        )}
        {finding.measurement && <p className="rec-scope">{finding.measurement}</p>}
        {finding.note && <p className="t-body dim">{finding.note}</p>}
        <p className="t-meta">Found by {by?.name ?? "—"} · {relative(finding.discoveredAt, NOW)}</p>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" icon="doc">Add to a change order</Button>
      </div>
    </>
  );
}

function JobActions({ api, jobId, onStage }: { api: SheetApi; jobId: string; onStage: (s: Stage) => void }) {
  const e = useEntities();
  const toast = useToast();
  const { push } = useNav();
  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const estimates = e.estimates(jobId);

  const items: Array<{ icon: IconName; label: string; note: string; run: () => void }> = [
    { icon: "ruler", label: "Log a finding", note: "Photo, location, severity, moisture", run: () => push(`inspect-${jobId}`, () => <InspectionFlow jobId={jobId} />) },
    { icon: "alert", label: "Raise a change order", note: "Damage that was not in the scope", run: () => push(`co-${jobId}`, () => <ChangeOrderFlow jobId={jobId} />) },
    { icon: "doc", label: "Open the estimate", note: "Price, margin, what they see", run: () => { const est = estimates.at(-1); if (est) push(`est-${est.id}`, () => <EstimateScreen estimateId={est.id} />); else toast({ text: "No estimate on this job yet" }); } },
    { icon: "layers", label: "Move stage", note: STAGE_LABEL[job.stage], run: () => api.push((a) => <StagePicker api={a} current={job.stage} onPick={onStage} />) },
    { icon: "user", label: "Change owner", note: "Who takes the next action", run: () => toast({ text: "Owner picker" }) },
    { icon: "message", label: `Message ${customer.name.split(" ")[0]}`, note: `Prefers ${customer.preferredContact}`, run: () => toast({ text: "Opens the thread" }) },
  ];

  return (
    <>
      <SheetHead api={api} title={customer.name} subtitle={job.title} icon="jobs" />
      <div className="sheet-body">
        <div className="list">
          {items.map((it) => (
            <Pressable key={it.label} className="row" onClick={() => { it.run(); if (it.label !== "Move stage") api.close(); }}>
              <span className="row-lead action-icon"><Icon name={it.icon} size={20} /></span>
              <span className="row-body">
                <span className="t-row">{it.label}</span>
                <span className="t-meta">{it.note}</span>
              </span>
              <Icon name="chevron" size={18} className="dimmer" />
            </Pressable>
          ))}
        </div>
      </div>
    </>
  );
}

function StagePicker({ api, current, onPick }: { api: SheetApi; current: Stage; onPick: (s: Stage) => void }) {
  return (
    <>
      <SheetHead api={api} title="Move stage" subtitle={`Now: ${STAGE_LABEL[current]}`} icon="layers" />
      <div className="sheet-body scroll" data-sheet-scroll style={{ maxHeight: 440 }}>
        <div className="list">
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
            <Pressable
              key={s} className={`row row-dense${s === current ? " is-selected" : ""}`}
              onClick={() => { haptic("medium"); onPick(s); api.close(); }}
            >
              <span className="row-body"><span className="t-row">{STAGE_LABEL[s]}</span></span>
              {s === current && <Icon name="check" size={19} strokeWidth={2.2} />}
            </Pressable>
          ))}
        </div>
      </div>
    </>
  );
}
