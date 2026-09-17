/* The live object.
 *
 * One thing, rendered as what it actually is rather than as a row: the place,
 * the state in three words, and the single action that changes it. Pressing it
 * compresses it; opening it carries the same photograph into the record, so the
 * user never loses where they came from. */
import { motion } from "motion/react";
import type { IconName } from "../../ui/Icon";
import { Button, Pressable, useToast } from "../../ui/primitives";
import { BLOCKER_SHORT, photoSrc } from "../../ui/domain";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { phone, relative, time } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { Job } from "../../data/types";
import { useLens, type Lens } from "../../shell/roles";
import { InspectionFlow } from "../inspect/InspectionFlow";
import { CloseOutLine } from "../closeout/CloseOutLine";

/** The Joi-style time strip: how long until you are supposed to be there, or
 *  how long you have been. Tinted, quiet, and always true. */
function ArrivalStrip({ startAt, endAt, clockedInAt }: { startAt: string; endAt: string; clockedInAt?: string }) {
  const start = new Date(startAt), end = new Date(endAt);
  /* already clocked in beats the booked window — crews start before the slot */
  if (clockedInAt) {
    const mins = Math.round((NOW.getTime() - new Date(clockedInAt).getTime()) / 60000);
    return (
      <span className="arrive is-live">
        <span className="arrive-dot" aria-hidden />
        On the clock since {time(clockedInAt)} · {mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
      </span>
    );
  }
  const onSite = start <= NOW && end >= NOW;
  const mins = Math.round((start.getTime() - NOW.getTime()) / 60000);
  const label = onSite
    ? `On site · ${Math.max(0, Math.round((NOW.getTime() - start.getTime()) / 60000))} min in`
    : mins > 0
      ? `On site in ${mins < 60 ? `${mins} minutes` : `${Math.floor(mins / 60)}h ${mins % 60}m`}`
      : "Window has passed";
  return (
    <span className={`arrive${onSite ? " is-live" : ""}`}>
      <span className="arrive-dot" aria-hidden />
      {label}
    </span>
  );
}

export function LiveObject({ job, lens, onOpen }: { job: Job; lens: Lens; onOpen: () => void }) {
  const e = useEntities();
  const { db } = useDB();
  const { person: me } = useLens();
  const { push } = useNav();
  const toast = useToast();

  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const appt = e.appointments(job.id).find((a) => new Date(a.endAt) >= NOW);
  const findings = e.findings(job.id);
  const marked = e.photos(job.id).filter((p) => p.forReel).length;
  const late = job.nextAction && new Date(job.nextAction.dueAt) < NOW;
  const myShift = db.time.find((t) => t.jobId === job.id && t.endAt === null && t.personId === me.id);

  /* what this object is, said in three words, depends on who is looking */
  const flag =
    lens === "crew" || lens === "media"
      ? appt ? `${time(appt.startAt)}–${time(appt.endAt)}` : "On site"
      : job.blocker ? BLOCKER_SHORT[job.blocker.kind] ?? "Blocked"
        : late ? `Overdue ${relative(job.nextAction!.dueAt, NOW)}`
          : job.nextAction?.label ?? "Needs a decision";

  const body =
    lens === "crew" ? job.scopeSummary
      : lens === "media"
        ? marked > 0
          ? `${findings.length} findings here, ${marked} already marked for a cut.`
          : `${findings.length} findings here and nothing marked yet — ${findings[0]?.title.toLowerCase() ?? "the rot at the rim"} is the shot.`
        : job.scopeSummary;

  const action: { label: string; icon: IconName; tone: "primary" | "call" | "money" | "capture"; run: () => void } =
    lens === "crew"
      ? { label: "Log what you found", icon: "camera", tone: "capture", run: () => push(`inspect-${job.id}`, () => <InspectionFlow jobId={job.id} />) }
      : lens === "media"
        ? { label: "Capture from this job", icon: "camera", tone: "capture", run: () => push(`inspect-${job.id}`, () => <InspectionFlow jobId={job.id} />) }
        : job.blocker?.kind === "awaiting_deposit"
          ? { label: "Re-run the deposit", icon: "money", tone: "money", run: () => toast({ text: "Opens the payment sheet on the invoice" }) }
          : job.blocker?.kind === "awaiting_customer"
            ? { label: `Nudge ${customer.name.split(" ")[0]}`, icon: "message", tone: "primary", run: () => toast({ text: `Reminder sent to ${customer.name}`, tone: "success", undo: () => {} }) }
            : job.blocker?.kind === "awaiting_materials"
              ? { label: "Chase the supplier", icon: "phone", tone: "call", run: () => toast({ text: "Calling Dunn Lumber, Everett" }) }
              : { label: `Call ${customer.name.split(" ")[0]}`, icon: "phone", tone: "call", run: () => toast({ text: `Calling ${phone(customer.phone)}` }) };

  return (
    <motion.article
      className="live"
      layoutId={`job-${job.id}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.sheet}
    >
      <Pressable className="live-media" onClick={onOpen} aria-label={`Open ${customer.name}`} scale={0.995}>
        {property.photo && <img src={photoSrc({ seed: property.photo })} alt="" />}
        <span className={`live-flag${job.blocker || late ? " is-hot" : ""}`}><i />{flag}</span>
        <span className="live-ident">
          <span className="live-name">{customer.name}</span>
          <span className="live-where">
            {property.address}, {property.city}
            {lens === "crew" && appt?.travelMinutes ? ` · ${appt.travelMinutes} min out` : ""}
          </span>
        </span>
      </Pressable>

      <div className="live-body">
        <p className="live-said">{body}</p>
        <Button size="lg" full variant={action.tone} icon={action.icon} onClick={() => { haptic("medium"); action.run(); }}>
          {action.label}
        </Button>
        {lens === "crew" && appt && <ArrivalStrip startAt={appt.startAt} endAt={appt.endAt} clockedInAt={myShift?.startAt} />}
        {lens === "crew" && <CloseOutLine />}
      </div>
    </motion.article>
  );
}
