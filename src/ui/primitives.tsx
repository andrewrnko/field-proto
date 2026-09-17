import {
  createContext, forwardRef, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
} from "react";
import { AnimatePresence, motion, useMotionValue, animate, useTransform } from "motion/react";
import { SPRING, FADE, clamp } from "../lib/motion";
import { haptic } from "../lib/haptics";
import { Icon, type IconName } from "./Icon";

/* ----------------------------- Pressable ---------------------------- *
 * Every tappable surface in the app goes through this: it gives the same
 * press scale, the same haptic, and keeps a 44px hit area even when the
 * visible control is smaller. */
export const Pressable = forwardRef<HTMLButtonElement, {
  children: ReactNode;
  scale?: number;
  feedback?: Parameters<typeof haptic>[0] | null;
} & ButtonHTMLAttributes<HTMLButtonElement>>(function Pressable(
  { children, scale = 0.97, feedback = "light", onPointerDown, className = "", ...rest }, ref,
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      className={className}
      whileTap={rest.disabled ? undefined : { scale }}
      transition={SPRING.snap}
      onPointerDown={(e) => {
        if (!rest.disabled && feedback) haptic(feedback);
        onPointerDown?.(e as never);
      }}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
});

/* ------------------------------ Button ------------------------------ */
type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "destructive" | "success" | "call" | "money" | "capture";
  size?: "lg" | "md" | "sm";
  icon?: IconName;
  iconAfter?: IconName;
  full?: boolean;
  pending?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children, variant = "primary", size = "md", icon, iconAfter, full, pending,
  className = "", disabled, ...rest
}: ButtonProps) {
  return (
    <Pressable
      className={`btn btn-${variant} btn-${size}${full ? " btn-full" : ""}${pending ? " is-pending" : ""} ${className}`}
      disabled={disabled || pending}
      feedback={variant === "destructive" ? "warning" : "medium"}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 17 : 19} />}
      <span className="btn-label">{children}</span>
      {iconAfter && <Icon name={iconAfter} size={size === "sm" ? 17 : 19} />}
      <AnimatePresence>
        {pending && (
          <motion.span
            className="btn-spinner" aria-hidden
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </Pressable>
  );
}

/* --------------------------- RoundButton ---------------------------- */
export function RoundButton({
  icon, label, onClick, variant = "plain", size = 36,
}: { icon: IconName; label: string; onClick?: () => void; variant?: "plain" | "solid" | "tinted"; size?: number }) {
  return (
    <Pressable
      className={`round round-${variant}`}
      style={{ width: size, height: size }}
      aria-label={label}
      onClick={onClick}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} />
    </Pressable>
  );
}

/* ---------------------------- Segmented ----------------------------- *
 * Sliding pill with a spring, like the All / Schedule control in the
 * reference. The pill is a sibling layer so the labels never reflow. */
export function Segmented<T extends string>({
  options, value, onChange, size = "md",
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
  size?: "md" | "sm";
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  /* the pill is measured from the live button, so labels of any length stay
     inside it — a fraction-of-width pill clips "Needs reply 3" */
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 3, width: 0 });
  useLayoutEffect(() => {
    const track = trackRef.current;
    const el = track?.querySelectorAll<HTMLElement>(".seg-item")[i];
    if (!track || !el) return;
    const measure = () => setBox({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [i, options.length]);

  return (
    <div className={`seg seg-${size}`} role="tablist" ref={trackRef}>
      <motion.div
        className="seg-pill"
        aria-hidden
        animate={{ left: box.left, width: box.width }}
        initial={false}
        transition={SPRING.snap}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`seg-item${o.value === value ? " is-on" : ""}`}
          onClick={() => { if (o.value !== value) { haptic("select"); onChange(o.value); } }}
        >
          {o.label}
          {o.count != null && <span className="seg-count t-num">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Badge ------------------------------- */
export function Badge({
  children, tone = "neutral", icon, dot,
}: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info"; icon?: IconName; dot?: boolean }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" aria-hidden />}
      {icon && <Icon name={icon} size={13} strokeWidth={2} />}
      {children}
    </span>
  );
}

/* ------------------------------ Avatar ------------------------------ */
export function Avatar({ name, size = 34, tone = 0, src }: { name: string; size?: number; tone?: number; src?: string }) {
  const ini = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36, ["--tone" as string]: `var(--avatar-${tone % 5})` }}
      aria-hidden
    >
      {src ? <img src={src} alt="" /> : ini}
    </span>
  );
}

/* ------------------------------- Row -------------------------------- */
export function Row({
  title, subtitle, meta, leading, trailing, onClick, chevron = true, tone, children, dense,
}: {
  title: ReactNode; subtitle?: ReactNode; meta?: ReactNode;
  leading?: ReactNode; trailing?: ReactNode; onClick?: () => void;
  chevron?: boolean; tone?: "danger" | "warning"; children?: ReactNode; dense?: boolean;
}) {
  const Tag: any = onClick ? Pressable : "div";
  return (
    <Tag className={`row${dense ? " row-dense" : ""}${tone ? ` row-${tone}` : ""}`} onClick={onClick} scale={0.985}>
      {leading && <span className="row-lead">{leading}</span>}
      <span className="row-body">
        <span className="row-title t-row truncate">{title}</span>
        {subtitle && <span className="row-sub t-body dim truncate">{subtitle}</span>}
        {children}
      </span>
      <span className="row-trail">
        {meta && <span className="row-meta t-meta t-num">{meta}</span>}
        {trailing}
        {onClick && chevron && <Icon name="chevron" size={17} className="row-chev" />}
      </span>
    </Tag>
  );
}

/* ---------------------------- SwipeRow ------------------------------ *
 * Reveals one destructive and one neutral action. Keyboard users get the
 * same actions from the row's context menu, so this is never the only path. */
export function SwipeRow({
  children, actions,
}: {
  children: ReactNode;
  actions: Array<{ label: string; icon: IconName; tone?: "danger" | "neutral" | "success"; onAction: () => void }>;
}) {
  const x = useMotionValue(0);
  const width = 78 * actions.length;
  const start = useRef(0);
  const open = useRef(false);
  const drag = useRef(false);

  const down = (e: React.PointerEvent) => { start.current = e.clientX - x.get(); drag.current = false; };
  const move = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const dx = e.clientX - start.current;
    if (!drag.current && Math.abs(dx - x.get()) < 4) return;
    drag.current = true;
    x.set(clamp(dx, -width - 24, 0));
  };
  const up = () => {
    if (!drag.current) return;
    const shouldOpen = x.get() < -width * 0.45;
    if (shouldOpen !== open.current) haptic("select");
    open.current = shouldOpen;
    animate(x, shouldOpen ? -width : 0, SPRING.track);
  };
  return (
    <div className="swipe">
      <div className="swipe-actions" style={{ width }}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            className={`swipe-action swipe-${a.tone ?? "neutral"}`}
            feedback={a.tone === "danger" ? "warning" : "medium"}
            onClick={() => { animate(x, 0, SPRING.track); open.current = false; a.onAction(); }}
          >
            <Icon name={a.icon} size={19} />
            <span>{a.label}</span>
          </Pressable>
        ))}
      </div>
      <motion.div className="swipe-face" style={{ x }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------ Field ------------------------------- */
export function Field({
  label, hint, error, trailing, prefix, ...rest
}: { label: string; hint?: string; error?: string; trailing?: ReactNode; prefix?: string }
  & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label className="field-label t-meta" htmlFor={id}>{label}</label>
      <div className="field-box">
        {prefix && <span className="field-prefix dim">{prefix}</span>}
        <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
        {trailing}
      </div>
      {error
        ? <p id={`${id}-e`} className="field-msg t-meta" role="alert">{error}</p>
        : hint && <p className="field-msg t-meta dim">{hint}</p>}
    </div>
  );
}

/* ------------------------------ Toggle ------------------------------ */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch" aria-checked={checked} aria-label={label}
      className={`toggle${checked ? " is-on" : ""}`}
      onClick={() => { haptic(checked ? "light" : "medium"); onChange(!checked); }}
    >
      <motion.span className="toggle-knob" layout transition={SPRING.snap} />
    </button>
  );
}

/* ---------------------------- Skeleton ------------------------------ */
export function Skeleton({ w = "100%", h = 14, r = 7, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />;
}

/* --------------------------- EmptyState ----------------------------- */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <p className="t-section">{title}</p>
      {body && <p className="t-body dim">{body}</p>}
      {action}
    </div>
  );
}

/* ------------------------------ Ticker ------------------------------ *
 * Money that counts to its new value. Used only where a number changing is
 * itself the news (day total, invoice balance) — never on every row. */
export function Ticker({ value, format, className = "" }: { value: number; format: (n: number) => string; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(Math.round(v)));
  useEffect(() => { const c = animate(mv, value, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }); return () => c.stop(); }, [value, mv]);
  return <motion.span className={`t-num ${className}`}>{text}</motion.span>;
}

/* ------------------------------ Toast ------------------------------- */
type ToastSpec = { id: number; text: string; tone?: "neutral" | "success" | "danger"; undo?: () => void };
const ToastCtx = createContext<{ toast: (t: Omit<ToastSpec, "id">) => void } | null>(null);
export const useToast = () => {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast outside provider");
  return c.toast;
};

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastSpec[]>([]);
  const seq = useRef(0);
  const toast = (t: Omit<ToastSpec, "id">) => {
    const id = ++seq.current;
    setItems((s) => [...s.slice(-2), { ...t, id }]);
    haptic(t.tone === "danger" ? "warning" : t.tone === "success" ? "success" : "light");
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.undo ? 5200 : 2800);
  };
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-host">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.tone ?? "neutral"}`}
              initial={{ y: 28, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={SPRING.sheet}
            >
              {t.tone === "success" && <Icon name="check" size={17} strokeWidth={2.2} />}
              <span className="truncate">{t.text}</span>
              {t.undo && (
                <button className="toast-undo" onClick={() => { t.undo?.(); setItems((s) => s.filter((x) => x.id !== t.id)); }}>
                  Undo
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* --------------------------- SectionHead ---------------------------- */
export function SectionHead({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="sec-head">
      <h2 className="t-meta sec-title">{title}{count != null && <span className="sec-count t-num">{count}</span>}</h2>
      {action}
    </div>
  );
}

export { FADE };
