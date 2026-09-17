/* ------------------------------------------------------------------ *
 * Sheet — the interaction spine of the app.
 *
 * Behaviour it owns, all of which real iOS sheets have and web ones usually
 * don't:
 *   · multiple detents, continuously draggable between them
 *   · velocity projection (a flick lands where the finger *was going*)
 *   · rubber-band resistance past the top detent
 *   · scroll/drag handoff — a downward drag inside content that is already
 *     scrolled to the top pulls the sheet instead of the list
 *   · auto height from content, animated when an inner step changes
 *   · nested steps with a back affordance (see refs: "Host a game" →
 *     "Clone the game")
 *   · the presenting screen scales back and rounds, iOS card-stack style
 *   · focus trap + restore, Escape to dismiss, aria-modal semantics
 * ------------------------------------------------------------------ */
import {
  createContext, useCallback, useContext, useEffect, useId, useLayoutEffect,
  useMemo, useRef, useState, type ReactNode,
} from "react";
import { AnimatePresence, motion, useMotionValue, animate } from "motion/react";
import { SPRING, FADE, rubber, project, clamp, nearestDetent } from "../lib/motion";
import { haptic } from "../lib/haptics";

export type Detent = "auto" | number; // number = fraction of screen height

type SheetSpec = {
  id: string;
  render: (api: SheetApi) => ReactNode;
  detents: Detent[];
  initial: number;          // index into detents
  dismissible: boolean;
  onDismiss?: () => void;
};

export type SheetApi = {
  close: () => void;
  push: (render: (api: SheetApi) => ReactNode, opts?: { detents?: Detent[] }) => void;
  pop: () => void;
  canPop: boolean;
  setDetent: (index: number) => void;
};

type Ctx = {
  present: (
    render: (api: SheetApi) => ReactNode,
    opts?: { detents?: Detent[]; initial?: number; dismissible?: boolean; onDismiss?: () => void },
  ) => string;
  dismiss: (id?: string) => void;
  count: number;
};

const SheetCtx = createContext<Ctx | null>(null);
export const useSheets = () => {
  const c = useContext(SheetCtx);
  if (!c) throw new Error("useSheets must be used inside <SheetHost>");
  return c;
};

/* ------------------------------ host ------------------------------ */

export function SheetHost({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetSpec[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id?: string) => {
    setStack((s) => {
      const target = id ? s.find((x) => x.id === id) : s[s.length - 1];
      if (!target) return s;
      target.onDismiss?.();
      return s.filter((x) => x !== target);
    });
  }, []);

  const present = useCallback<Ctx["present"]>((render, opts) => {
    const id = `sheet-${++seq.current}`;
    setStack((s) => [...s, {
      id,
      render,
      detents: opts?.detents ?? ["auto"],
      initial: opts?.initial ?? 0,
      dismissible: opts?.dismissible ?? true,
      onDismiss: opts?.onDismiss,
    }]);
    haptic("light");
    return id;
  }, []);

  const value = useMemo(() => ({ present, dismiss, count: stack.length }), [present, dismiss, stack.length]);
  const depth = stack.length;

  return (
    <SheetCtx.Provider value={value}>
      <motion.div
        className="sheet-root"
        /* the context behind a sheet stays visible but stops being reachable —
           by pointer, by tab order and by screen reader */
        inert={depth > 0 ? true : undefined}
        animate={{
          scale: depth > 0 ? 1 - Math.min(depth, 2) * 0.035 : 1,
          borderRadius: depth > 0 ? 28 : 0,
          y: depth > 0 ? 12 : 0,
        }}
        transition={SPRING.sheet}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {depth > 0 && (
          <motion.div
            key="scrim"
            className="sheet-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            onPointerDown={() => { const top = stack[stack.length - 1]; if (top.dismissible) dismiss(top.id); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stack.map((spec, i) => (
          <SheetSurface
            key={spec.id}
            spec={spec}
            behind={i < stack.length - 1}
            onClose={() => dismiss(spec.id)}
            onPush={(render, opts) => {
              setStack((s) => s.map((x) => x.id === spec.id
                ? { ...x, detents: opts?.detents ?? x.detents }
                : x));
              // steps live inside the surface; see SheetSurface's own stack
              return render;
            }}
          />
        ))}
      </AnimatePresence>
    </SheetCtx.Provider>
  );
}

/* ---------------------------- surface ----------------------------- */

type Step = { render: (api: SheetApi) => ReactNode; detents?: Detent[] };

function SheetSurface({
  spec, behind, onClose,
}: {
  spec: SheetSpec;
  behind: boolean;
  onClose: () => void;
  onPush: (r: (api: SheetApi) => ReactNode, o?: { detents?: Detent[] }) => unknown;
}) {
  const labelId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const [steps, setSteps] = useState<Step[]>([{ render: spec.render, detents: spec.detents }]);
  const [dir, setDir] = useState<1 | -1>(1);
  const step = steps[steps.length - 1];
  const detents = step.detents ?? spec.detents;

  const [screenH, setScreenH] = useState(() => surfaceRef.current?.parentElement?.clientHeight ?? 852);
  const [contentH, setContentH] = useState(0);
  const [detentIndex, setDetentIndex] = useState(spec.initial);

  const y = useMotionValue(0);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const scroller = useRef<HTMLElement | null>(null);
  const captured = useRef(false);
  const samples = useRef<Array<{ t: number; y: number }>>([]);

  /* measure the screen (the .screen element, not the window — the prototype
     runs inside a device frame on desktop) */
  useLayoutEffect(() => {
    const el = surfaceRef.current?.closest(".screen") as HTMLElement | null;
    if (!el) return;
    const ro = new ResizeObserver(() => setScreenH(el.clientHeight));
    ro.observe(el);
    setScreenH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  /* measure content for auto-height sheets */
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.scrollHeight));
    ro.observe(el);
    setContentH(el.scrollHeight);
    return () => ro.disconnect();
  }, [steps.length]);

  const maxH = Math.round(screenH * 0.94);
  /* auto-height content taller than the screen becomes a scroller rather than
     silently clipping its last row */
  const heights = detents.map((d) =>
    d === "auto" ? clamp(contentH, 120, maxH) : clamp(Math.round(screenH * d), 120, maxH));
  const sheetH = Math.max(...heights, 120);
  const capped = detents.includes("auto") && contentH > maxH - 26;
  /* offset 0 == fully open at the tallest detent */
  const offsets = heights.map((h) => sheetH - h);
  const currentOffset = offsets[clamp(detentIndex, 0, offsets.length - 1)] ?? 0;

  /* settle to the active detent whenever it (or the measurement) changes */
  useEffect(() => {
    if (dragging.current) return;
    const controls = animate(y, currentOffset, SPRING.sheet);
    return () => controls.stop();
  }, [currentOffset, y]);

  /* focus management */
  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const node = surfaceRef.current;
    const first = node?.querySelector<HTMLElement>(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (behind) return;
      if (e.key === "Escape" && spec.dismissible) { e.stopPropagation(); onClose(); }
      if (e.key !== "Tab" || !node) return;
      const f = [...node.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      restoreFocus.current?.focus?.({ preventScroll: true });
    };
  }, [behind, onClose, spec.dismissible]);

  /* ------------------------- gesture ------------------------- */

  const onPointerDown = (e: React.PointerEvent) => {
    if (behind) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    scroller.current = target.closest<HTMLElement>("[data-sheet-scroll]");
    startY.current = e.clientY;
    startOffset.current = y.get();
    samples.current = [{ t: performance.now(), y: e.clientY }];
    dragging.current = false;
    captured.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (behind || e.buttons === 0 && e.pointerType === "mouse") return;
    if (!samples.current.length) return;
    const dy = e.clientY - startY.current;
    samples.current.push({ t: performance.now(), y: e.clientY });
    if (samples.current.length > 6) samples.current.shift();

    if (!dragging.current) {
      if (Math.abs(dy) < 3) return;
      const s = scroller.current;
      const atTop = !s || s.scrollTop <= 0;
      const canDragUp = detentIndex < detents.length - 1;
      // downward drag only takes over when the list is already at its top
      if (dy > 0 && !atTop) return;
      if (dy < 0 && !canDragUp) return;
      dragging.current = true;
      // capture only once the sheet actually takes the gesture, so an inner
      // list keeps native momentum scrolling until then
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      captured.current = true;
      if (s) s.style.overflowY = "hidden";
    }

    const raw = startOffset.current + dy;
    const min = 0;
    const max = sheetH;
    const next = raw < min ? rubber(raw - min, screenH) + min : clamp(raw, min, max);
    y.set(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (scroller.current) scroller.current.style.overflowY = "";
    if (captured.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      captured.current = false;
    }
    samples.current = [];
    if (!dragging.current) { scroller.current = null; return; }
    dragging.current = false;

    const s = samples.current;
    const last = s[s.length - 1];
    const first = s[0] ?? last;
    const dt = Math.max(1, last.t - first.t);
    const velocity = ((last.y - first.y) / dt) * 1000; // px/s
    const landing = y.get() + project(velocity);

    const dismissLine = offsets[0] + Math.max(72, sheetH * 0.18);
    if (spec.dismissible && (landing > dismissLine || velocity > 950)) {
      haptic("light");
      onClose();
      return;
    }
    const snapTo = nearestDetent(landing, offsets);
    const idx = offsets.indexOf(snapTo);
    if (idx !== detentIndex) { setDetentIndex(idx); haptic("select"); }
    else animate(y, snapTo, { ...SPRING.track, velocity });
    scroller.current = null;
  };

  /* --------------------------- api --------------------------- */

  const api: SheetApi = useMemo(() => ({
    close: onClose,
    push: (render, opts) => { setDir(1); setSteps((s) => [...s, { render, detents: opts?.detents }]); haptic("light"); },
    pop: () => { setDir(-1); setSteps((s) => (s.length > 1 ? s.slice(0, -1) : s)); haptic("light"); },
    canPop: steps.length > 1,
    setDetent: (i) => setDetentIndex(clamp(i, 0, detents.length - 1)),
  }), [onClose, steps.length, detents.length]);

  return (
    <motion.div
      ref={surfaceRef}
      className={`sheet${detents.includes("auto") ? " is-auto" : ""}`}
      role="dialog"
      aria-modal={!behind}
      aria-labelledby={labelId}
      style={{ height: sheetH, y }}
      initial={{ y: sheetH }}
      animate={{ y: currentOffset, scale: behind ? 0.965 : 1, opacity: behind ? 0.65 : 1 }}
      exit={{ y: sheetH, transition: { ...SPRING.sheet, damping: 46 } }}
      transition={SPRING.sheet}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="sheet-grip" aria-hidden />
      <motion.div
        className={`sheet-steps${capped ? " is-capped" : ""}`}
        {...(capped ? { "data-sheet-scroll": "" } : {})}
        animate={{ height: detents.includes("auto") && !capped ? "auto" : "100%" }}
        transition={SPRING.sheet}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={steps.length}
            ref={contentRef}
            className="sheet-step"
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0, position: "absolute" }}
            transition={SPRING.sheet}
          >
            {step.render(api)}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
