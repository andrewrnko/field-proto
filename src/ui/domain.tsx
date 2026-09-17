/* Domain-flavoured building blocks shared by every feature.
   If two features need the same thing, it lives here — not copied twice. */
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import { Button, Pressable, Avatar } from "./primitives";
import { useSheets, type SheetApi } from "./Sheet";
import { SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";
import { NOW, dayOffsetOf } from "../data/clock";
import { relative, time, money } from "../lib/format";
import type { Blocker, Job, Person, Photo, Severity, Stage } from "../data/types";
import { STAGE_LABEL, SEVERITY_LABEL } from "../data/types";

/* --------------------------- objects --------------------------- *
 * A family of glossy 3D objects, one per kind of thing. They carry the
 * personality so the working text does not have to. */
export type ObjName =
  | "house" | "beam" | "drop" | "clipboard" | "coins" | "calendar"
  | "bubble" | "camera" | "tools" | "van" | "warning" | "docs";

export function Obj({ name, size = 44, className = "" }: { name: ObjName; size?: number; className?: string }) {
  return (
    <span className={`obj ${className}`} style={{ width: size, height: size }} aria-hidden>
      <img src={`${import.meta.env.BASE_URL}art/obj-${name}.png`} alt="" loading="lazy" />
    </span>
  );
}

/* ----------------------------- tags ---------------------------- */

export type Hue = "blue" | "amber" | "cyan" | "indigo" | "emerald" | "coral" | "violet" | "teal" | "yellow" | "pink" | "neutral";

export function Tag({ children, hue = "neutral", icon }: { children: ReactNode; hue?: Hue; icon?: IconName }) {
  return (
    <span className={`tag${hue === "neutral" ? "" : ` tag-${hue}`}`}>
      {icon && <Icon name={icon} size={14} strokeWidth={2.1} />}
      <span className="tag-label">{children}</span>
    </span>
  );
}

/** A blocker in three words. The sentence lives on the record. */
export const BLOCKER_SHORT: Record<string, string> = {
  awaiting_customer: "Waiting on them",
  awaiting_deposit: "Deposit declined",
  awaiting_materials: "Materials not in",
  awaiting_access: "No access",
  weather: "Weather hold",
  crew_short: "Crew short",
  permit: "Permit pending",
  none: "Blocked",
};

/** One hue per stage, fixed, so a colour always means the same thing. */
export const STAGE_HUE: Record<Stage, Hue> = {
  new_lead: "blue", qualifying: "blue",
  inspection_booked: "coral", inspection_done: "cyan",
  estimate_draft: "indigo", estimate_sent: "indigo",
  approved: "emerald", scheduled: "coral",
  in_progress: "teal", punch_list: "yellow",
  complete: "emerald", warranty: "emerald", lost: "neutral",
};

export const SEVERITY_HUE: Record<Severity, Hue> = {
  monitor: "neutral", active: "amber", structural: "coral",
};

/* ---------------------------- stage ---------------------------- */

export function StageChip({ stage }: { stage: Stage }) {
  return <Tag hue={STAGE_HUE[stage]}>{STAGE_LABEL[stage]}</Tag>;
}

export function SeverityChip({ severity }: { severity: Severity }) {
  return <Tag hue={SEVERITY_HUE[severity]} icon={severity === "monitor" ? "clock" : "alert"}>{SEVERITY_LABEL[severity]}</Tag>;
}

/* --------------------------- blocker --------------------------- */

export function BlockerBar({ blocker, onAct, actionLabel }: { blocker: Blocker; onAct?: () => void; actionLabel?: string }) {
  return (
    <div className="blocker">
      <Icon name="alert" size={18} strokeWidth={2} />
      <div className="grow">
        <p className="t-row">{blocker.label}</p>
        <p className="t-meta">Blocked {relative(blocker.since, NOW)}</p>
      </div>
      {onAct && <Button size="sm" variant="secondary" onClick={onAct}>{actionLabel ?? "Resolve"}</Button>}
    </div>
  );
}

/* --------------------------- next action ----------------------- */

export function NextAction({ job, owner, onAct }: { job: Job; owner: Person | null; onAct?: () => void }) {
  if (!job.nextAction) return null;
  const overdue = new Date(job.nextAction.dueAt) < NOW;
  return (
    <Pressable className={`next-action${overdue ? " is-overdue" : ""}`} onClick={onAct}>
      <span className={`na-dot${overdue ? " is-overdue" : ""}`} aria-hidden />
      <span className="grow">
        <span className="t-row">{job.nextAction.label}</span>
        <span className="t-meta">
          {owner ? owner.name.split(" ")[0] : "Unassigned"} · {overdue ? "overdue " : ""}{relative(job.nextAction.dueAt, NOW)}
        </span>
      </span>
      <Icon name="chevron" size={17} className="dimmer" />
    </Pressable>
  );
}

/* ----------------------------- photos --------------------------- */

export function photoSrc(p: Pick<Photo, "seed">) { return `${import.meta.env.BASE_URL}photos/${p.seed}.jpg`; }

export function PhotoThumb({ photo, size = 76, onClick }: { photo: Photo; size?: number; onClick?: () => void }) {
  /* without a handler this is an image, not a control — nesting a button inside
     a tappable row is invalid and swallows the row's own tap */
  const Tag = (onClick ? Pressable : "span") as React.ElementType;
  return (
    <Tag className="thumb" style={{ width: size, height: size }} onClick={onClick} aria-label={onClick ? photo.caption ?? "Photo" : undefined}>
      <img src={photoSrc(photo)} alt={photo.caption ?? ""} loading="lazy" />
      {photo.syncState !== "synced" && (
        <span className={`thumb-sync thumb-${photo.syncState}`}>
          <Icon name={photo.syncState === "failed" ? "alert" : "refresh"} size={12} strokeWidth={2.2} />
        </span>
      )}
    </Tag>
  );
}

export function PhotoStrip({ photos, onOpen }: { photos: Photo[]; onOpen?: (p: Photo, i: number) => void }) {
  return (
    <div className="hscroll photo-strip">
      {photos.map((p, i) => (
        <PhotoThumb key={p.id} photo={p} onClick={onOpen ? () => onOpen(p, i) : undefined} />
      ))}
    </div>
  );
}

/* ------------------------- document object ---------------------- *
 * The one place saturated colour is allowed: a small dimensional paper
 * stack that stands in for an estimate / change order / invoice. */
export function DocObject({ tone = "blue", label, size = 52 }: { tone?: "blue" | "amber" | "paper"; label?: string; size?: number }) {
  return (
    <span className={`doc doc-${tone}`} style={{ width: size, height: size }} aria-hidden>
      <span className="doc-back" />
      <span className="doc-mid" />
      <span className="doc-front">{label && <em>{label}</em>}</span>
    </span>
  );
}

/* --------------------------- sheet head ------------------------- */

export function SheetHead({
  api, title, subtitle, avatar,
}: { api: SheetApi; title: string; subtitle?: string; icon?: IconName; avatar?: string }) {
  /* One shape for every sheet: an optional back affordance, the title on a
     single baseline, and a close target. No decorative icon chip — it pushed
     the title onto a fourth baseline and said nothing. */
  return (
    <div className="sheet-head">
      {api.canPop && (
        <Pressable className="round round-plain" style={{ width: 38, height: 38, marginLeft: -8 }} onClick={api.pop} aria-label="Back">
          <Icon name="chevronLeft" size={22} />
        </Pressable>
      )}
      {avatar && <Avatar name={avatar} size={38} />}
      <div className="grow">
        <h2>{title}</h2>
        {subtitle && <p className="t-meta truncate">{subtitle}</p>}
      </div>
      <Pressable className="round round-tinted" style={{ width: 34, height: 34 }} onClick={api.close} aria-label="Close">
        <Icon name="close" size={17} strokeWidth={2.2} />
      </Pressable>
    </div>
  );
}

/* ------------------------- confirm / auth ----------------------- */

export function useConfirm() {
  const { present } = useSheets();
  return (opts: {
    title: string;
    body: string;
    confirmLabel: string;
    tone?: "danger" | "default";
    icon?: IconName;
    onConfirm: () => void | Promise<void>;
  }) =>
    present((api) => <ConfirmBody api={api} {...opts} />, { detents: ["auto"] });
}

function ConfirmBody({
  api, title, body, confirmLabel, tone = "default", icon = "alert", onConfirm,
}: { api: SheetApi; title: string; body: string; confirmLabel: string; tone?: "danger" | "default"; icon?: IconName; onConfirm: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="confirm">
      <motion.span
        className={`confirm-glyph${tone === "danger" ? " is-danger" : ""}`}
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.pop}
      >
        <Icon name={icon} size={26} strokeWidth={1.9} />
      </motion.span>
      <h2 className="t-section">{title}</h2>
      <p className="t-body dim">{body}</p>
      <div className="confirm-actions">
        <Button variant="secondary" full onClick={api.close} disabled={busy}>Cancel</Button>
        <Button
          variant={tone === "danger" ? "destructive" : "primary"}
          full pending={busy}
          onClick={async () => { setBusy(true); haptic(tone === "danger" ? "warning" : "medium"); await onConfirm(); setBusy(false); api.close(); }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- money ---------------------------- */

export function MoneyRow({ label, cents, strong, tone, note }: { label: string; cents: number; strong?: boolean; tone?: "success" | "danger"; note?: string }) {
  return (
    <div className={`money-row${strong ? " is-strong" : ""}`}>
      <span className="grow">
        <span className={strong ? "t-row" : "t-body"}>{label}</span>
        {note && <span className="t-meta block">{note}</span>}
      </span>
      <span className={`t-num${tone ? ` tone-${tone}` : ""} ${strong ? "t-row" : "t-body"}`}>{money(cents)}</span>
    </div>
  );
}

/* ----------------------------- misc ----------------------------- */

export function Stat({ label, value, delta, tone }: { label: string; value: ReactNode; delta?: string; tone?: "success" | "danger" | "warning" }) {
  return (
    <div className="stat step">
      <p className="t-meta">{label}</p>
      <p className={`stat-value t-num${tone ? ` tone-${tone}` : ""}`}>{value}</p>
      {delta && <p className="t-meta">{delta}</p>}
    </div>
  );
}

export function DayChip({ iso, selected, onSelect, dotCount = 0 }: { iso: string; selected: boolean; onSelect: () => void; dotCount?: number }) {
  const d = new Date(iso);
  const off = dayOffsetOf(iso);
  return (
    <button className={`day-chip${selected ? " is-on" : ""}${off === 0 ? " is-today" : ""}`} onClick={() => { haptic("select"); onSelect(); }}>
      <span className="day-num t-num">{d.getDate()}</span>
      <span className="day-name">{d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Los_Angeles" }).toUpperCase()}</span>
      <span className="day-dots">{Array.from({ length: Math.min(dotCount, 3) }).map((_, i) => <i key={i} />)}</span>
    </button>
  );
}

export function TimeRange({ startAt, endAt }: { startAt: string; endAt: string }) {
  return <span className="t-num dim">{time(startAt)} – {time(endAt)}</span>;
}
