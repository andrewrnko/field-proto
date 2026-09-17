/* The bar.
 *
 * One control, three jobs, all inside a thumb's reach: it names where you are,
 * it searches, and it creates. Drag it up and the business rises behind it.
 * There is no tab bar, because five tabs named after database tables is the
 * schema leaking into the person's hands. */
import { useRef } from "react";
import { motion, useMotionValue, animate, useTransform } from "motion/react";
import { Icon } from "../ui/Icon";
import { Pressable } from "../ui/primitives";
import { useSheets } from "../ui/Sheet";
import { useNav } from "../ui/Nav";
import { SPRING, clamp, project } from "../lib/motion";
import { haptic } from "../lib/haptics";
import { Deck } from "./Deck";
import { CommandSheet } from "./Command";
import { CreatePalette } from "./Create";

export function Bar({ label }: { label: string }) {
  const { present } = useSheets();
  /* the bar belongs to Now. Descend into anything and the screen owns its own
     bottom — otherwise a floating control sits on top of the primary action. */
  const { depth } = useNav();
  const y = useMotionValue(0);
  const lift = useTransform(y, (v) => clamp(-v, 0, 40));
  const hint = useTransform(lift, [0, 28], [0, 1]);
  const dragging = useRef(false);
  const armed = useRef(false);
  const captured = useRef(false);
  const start = useRef(0);
  const t0 = useRef(0);

  const openDeck = () => present((api) => <Deck api={api} />, { detents: [0.62, 0.94], initial: 0 });

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-bar-action]")) return;
    start.current = e.clientY; t0.current = performance.now();
    dragging.current = true; armed.current = false; captured.current = false;
    /* capture only once a drag actually begins — capturing here retargets the
       click and the buttons inside the bar stop working */
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dy = Math.min(0, e.clientY - start.current);
    if (!captured.current) {
      if (dy > -6) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      captured.current = true;
    }
    y.set(dy * 0.5);
    if (!armed.current && dy < -26) { armed.current = true; haptic("light"); }
  };
  const up = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (captured.current) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* gone */ }
      captured.current = false;
    }
    const dy = e.clientY - start.current;
    const v = (dy / Math.max(1, performance.now() - t0.current)) * 1000;
    animate(y, 0, SPRING.track);
    if (armed.current || project(v) < -60) { haptic("medium"); openDeck(); }
  };

  return (
    <motion.div
      className="bar"
      style={{ y, x: "-50%" }}
      animate={{ opacity: depth > 0 ? 0 : 1, scale: depth > 0 ? 0.92 : 1, pointerEvents: depth > 0 ? "none" : "auto" }}
      transition={SPRING.sheet} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <motion.span className="bar-hint" style={{ opacity: hint }} aria-hidden />
      <Pressable className="bar-where" onClick={() => { haptic("medium"); openDeck(); }} data-shot="deck">
        <span className="bar-grip" aria-hidden />
        <span className="bar-label">{label}</span>
      </Pressable>
      <Pressable
        className="bar-act" data-bar-action aria-label="Search everything" data-shot="command"
        onClick={() => present((api) => <CommandSheet api={api} />, { detents: [0.92] })}
      >
        <Icon name="search" size={21} />
      </Pressable>
      <Pressable
        className="bar-act bar-plus" data-bar-action aria-label="Create" data-shot="create"
        onClick={() => present((api) => <CreatePalette api={api} />, { detents: ["auto"] })}
      >
        <Icon name="plus" size={22} />
      </Pressable>
    </motion.div>
  );
}
