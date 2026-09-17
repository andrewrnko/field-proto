/* A screen = collapsing large title + scroll body (+ optional pull to refresh).
 *
 * The title collapses into the nav bar once, at a stable threshold, so the
 * header never flickers mid-scroll. Pull-to-refresh arms only at the very top
 * and uses the same rubber-band curve as the sheet, so both gestures feel like
 * the same hand. */
import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useNav } from "./Nav";
import { Icon } from "./Icon";
import { Pressable } from "./primitives";
import { rubber, SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";

const TRIGGER = 68;

export function Screen({
  title, subtitle, actions, children, back, backLabel, headerExtra, flush, onRefresh, hideTitle,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  back?: boolean;
  backLabel?: string;
  headerExtra?: ReactNode;
  flush?: boolean;
  onRefresh?: () => Promise<void> | void;
  /** the screen composes its own opening instead of the standard large title */
  hideTitle?: boolean;
}) {
  /* a screen pushed onto the stack always offers its way back, without every
     caller having to remember to ask for it */
  const { pop, depth } = useNav();
  const [stuck, setStuck] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const raf = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pull = useMotionValue(0);
  const spin = useTransform(pull, [0, TRIGGER], [0, 1], { clamp: true });
  const shift = useTransform(pull, (v) => v * 0.1);
  const armed = useRef(false);
  const startY = useRef(0);
  const active = useRef(false);

  const down = (e: React.PointerEvent) => {
    if (!onRefresh || refreshing) return;
    active.current = (scrollRef.current?.scrollTop ?? 1) <= 0;
    startY.current = e.clientY;
    armed.current = false;
  };
  const move = (e: React.PointerEvent) => {
    if (!active.current || refreshing) return;
    const dy = e.clientY - startY.current;
    if (dy <= 0) { pull.set(0); return; }
    if ((scrollRef.current?.scrollTop ?? 1) > 0) { active.current = false; pull.set(0); return; }
    const v = rubber(dy, 600, 1.1);
    pull.set(v);
    if (!armed.current && v >= TRIGGER) { armed.current = true; haptic("light"); }
  };
  const up = async () => {
    if (!active.current) return;
    active.current = false;
    if (armed.current && onRefresh) {
      setRefreshing(true);
      animate(pull, 44, SPRING.track);
      await onRefresh();
      haptic("success");
      setRefreshing(false);
    }
    armed.current = false;
    animate(pull, 0, SPRING.track);
  };

  return (
    <div className="screen-view">
      <header className={`nav-bar${stuck ? " is-stuck" : ""}`}>
        <div className="nav-bar-inline">
          {(back ?? depth > 0) && (
            <Pressable
              className="round round-plain" style={{ width: 36, height: 36, marginLeft: -6 }}
              onClick={pop} aria-label={backLabel ?? "Back"}
            >
              <Icon name="chevronLeft" size={22} />
            </Pressable>
          )}
          <span className="nav-bar-title t-row truncate">{title}</span>
        </div>
        <div className="nav-actions">{actions}</div>
      </header>

      {onRefresh && (
        <motion.div className="refresh-well" style={{ height: pull }}>
          <motion.span className={`refresh-mark${refreshing ? " is-spinning" : ""}`} style={{ opacity: spin, scale: spin }}>
            <Icon name={refreshing ? "refresh" : "arrowDown"} size={16} strokeWidth={2.2} />
          </motion.span>
        </motion.div>
      )}

      <motion.div
        ref={scrollRef}
        className={`scroll screen-scroll${flush ? " is-flush" : ""}`}
        style={onRefresh ? { y: shift } : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onScroll={(e) => {
          const top = (e.target as HTMLElement).scrollTop;
          cancelAnimationFrame(raf.current);
          raf.current = requestAnimationFrame(() => setStuck(top > 34));
        }}
      >
        {!hideTitle && (
          <div className="screen-title">
            <h1 className="t-title">{title}</h1>
            {subtitle && <div className="t-body dim screen-sub">{subtitle}</div>}
          </div>
        )}
        {headerExtra && <div className="screen-head-extra">{headerExtra}</div>}
        {children}
      </motion.div>
    </div>
  );
}
