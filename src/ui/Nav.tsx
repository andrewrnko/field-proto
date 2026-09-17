/* ------------------------------------------------------------------ *
 * Nav — a push/pop stack with an interactive edge-swipe back gesture.
 *
 * Screens stay mounted while they are in the stack, so scroll position,
 * inputs and unfinished drafts survive a push and a cancelled back swipe
 * (design system §6: "Preserve deep links, selected record, back behavior,
 * filters, scroll, and unfinished drafts").
 * ------------------------------------------------------------------ */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef,
  useState, type ReactNode,
} from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { SPRING, project, clamp } from "../lib/motion";
import { haptic } from "../lib/haptics";

type Screen = { key: string; render: () => ReactNode };

type NavCtx = {
  push: (key: string, render: () => ReactNode) => void;
  pop: () => void;
  popToRoot: () => void;
  depth: number;
  stack: Screen[];
};

const Ctx = createContext<NavCtx | null>(null);
export const useNav = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNav must be used inside <NavHost>");
  return c;
};

const EDGE = 28; // px of left edge that starts a back swipe

/* The provider sits ABOVE the sheet host so that sheet content — which renders
   outside the nav layers — can still push screens. The layers themselves render
   inside the sheet host, so a presented sheet scales them back like iOS. */
export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([]);

  const push = useCallback((key: string, render: () => ReactNode) => {
    setStack((s) => (s[s.length - 1]?.key === key ? s : [...s, { key, render }]));
    haptic("light");
  }, []);
  const pop = useCallback(() => { setStack((s) => s.slice(0, -1)); haptic("light"); }, []);
  const popToRoot = useCallback(() => setStack([]), []);

  const value = useMemo(
    () => ({ push, pop, popToRoot, depth: stack.length, stack }),
    [push, pop, popToRoot, stack],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack.length) { e.preventDefault(); pop(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stack.length, pop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function NavLayers({ root }: { root: ReactNode }) {
  const { stack, pop } = useNav();
  const width = useRef(393);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { width.current = el.clientWidth; });
    ro.observe(el);
    width.current = el.clientWidth;
    return () => ro.disconnect();
  }, []);

  return (
    <div className="nav-host" ref={containerRef}>
      <Layer index={0} stackSize={stack.length} width={width}>{root}</Layer>
      {stack.map((s, i) => (
        <Layer
          key={s.key}
          index={i + 1}
          stackSize={stack.length}
          width={width}
          onBack={pop}
          interactive={i === stack.length - 1}
        >
          {s.render()}
        </Layer>
      ))}
    </div>
  );
}

function Layer({
  children, index, stackSize, width, onBack, interactive = false,
}: {
  children: ReactNode;
  index: number;
  stackSize: number;
  width: React.RefObject<number>;
  onBack?: () => void;
  interactive?: boolean;
}) {
  const isTop = index === stackSize;
  const depthBelow = stackSize - index; // 0 for the top screen
  const x = useMotionValue(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const samples = useRef<Array<{ t: number; x: number }>>([]);

  /* screens below the top slide back and dim, iOS-style parallax */
  useEffect(() => {
    if (isTop) { animate(x, 0, SPRING.sheet); return; }
    animate(x, -width.current * 0.26 * Math.min(depthBelow, 1), SPRING.sheet);
  }, [isTop, depthBelow, x, width]);

  const dim = useTransform(x, [-width.current * 0.26, 0], [0.55, 0], { clamp: true });

  const down = (e: React.PointerEvent) => {
    if (!interactive || !onBack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left > EDGE) return;
    startX.current = e.clientX;
    samples.current = [{ t: performance.now(), x: e.clientX }];
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = clamp(e.clientX - startX.current, 0, width.current);
    samples.current.push({ t: performance.now(), x: e.clientX });
    if (samples.current.length > 6) samples.current.shift();
    x.set(dx);
  };
  const up = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* gone */ }
    const s = samples.current;
    const last = s[s.length - 1], first = s[0] ?? last;
    const v = ((last.x - first.x) / Math.max(1, last.t - first.t)) * 1000;
    const landing = x.get() + project(v);
    if (landing > width.current * 0.42 || v > 700) {
      animate(x, width.current, { ...SPRING.track, velocity: v }).then(() => onBack?.());
    } else {
      animate(x, 0, { ...SPRING.track, velocity: v });
    }
  };

  return (
    <motion.section
      className={`nav-layer${index === 0 ? " nav-root" : ""}`}
      style={{ x, zIndex: index }}
      initial={index === 0 ? false : { x: width.current }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-hidden={!isTop}
      inert={!isTop ? true : undefined}
    >
      {children}
      <motion.div className="nav-dim" style={{ opacity: dim }} aria-hidden />
    </motion.section>
  );
}
