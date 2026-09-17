/* Full-screen photo viewer: swipe between shots, drag down to dismiss with the
   image scaling toward the thumbnail it came from, caption and metadata that
   fade out on tap. The drag uses the same projection maths as the sheet so the
   two gestures feel like the same hand. */
import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { SPRING, clamp, project } from "../lib/motion";
import { haptic } from "../lib/haptics";
import { Icon } from "./Icon";
import { Pressable } from "./primitives";
import { photoSrc } from "./domain";
import type { Photo, Person } from "../data/types";
import { time, dateLabel } from "../lib/format";

export function PhotoViewer({
  photos, index, onClose, by,
}: { photos: Photo[]; index: number; onClose: () => void; by?: (id: string) => Person | null }) {
  const [i, setI] = useState(index);
  const [chrome, setChrome] = useState(true);
  const y = useMotionValue(0);
  const x = useMotionValue(0);
  const scale = useTransform(y, [0, 400], [1, 0.72], { clamp: true });
  const bg = useTransform(y, [0, 320], [1, 0], { clamp: true });
  const photo = photos[i];
  const author = by?.(photo.by);

  let sx = 0, sy = 0, axis: "x" | "y" | null = null;
  let t0 = 0, p0 = 0, tracking = false, captured = false;

  const down = (e: React.PointerEvent) => {
    sx = e.clientX; sy = e.clientY; axis = null; t0 = performance.now(); p0 = e.clientX;
    tracking = true; captured = false;
    /* capture only once a drag actually starts — capturing here would retarget
       the click and swallow taps on the close button */
  };
  const move = (e: React.PointerEvent) => {
    if (!tracking) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      captured = true;
    }
    if (axis === "y") y.set(Math.max(dy, -60));
    else x.set(dx);
  };
  const up = (e: React.PointerEvent) => {
    tracking = false;
    if (captured) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* gone */ }
      captured = false;
    }
    const dt = Math.max(1, performance.now() - t0);
    if (axis === "y") {
      if (y.get() > 130) { haptic("light"); onClose(); return; }
      animate(y, 0, SPRING.track);
    } else if (axis === "x") {
      const v = ((e.clientX - p0) / dt) * 1000;
      const landing = x.get() + project(v);
      const w = (e.currentTarget as HTMLElement).clientWidth;
      const step = landing < -w * 0.3 ? 1 : landing > w * 0.3 ? -1 : 0;
      const next = clamp(i + step, 0, photos.length - 1);
      if (next !== i) haptic("select");
      setI(next);
      animate(x, 0, SPRING.track);
    }
    axis = null;
  };

  return (
    <motion.div
      className="viewer"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    >
      <motion.div className="viewer-bg" style={{ opacity: bg }} />

      <motion.div className="viewer-stage" style={{ y, x, scale }}>
        <img src={photoSrc(photo)} alt={photo.caption ?? ""} draggable={false} />
      </motion.div>

      <motion.div className="viewer-chrome" animate={{ opacity: chrome ? 1 : 0 }}>
        <div className="viewer-top">
          <Pressable className="round round-solid" style={{ width: 34, height: 34 }} onClick={onClose} aria-label="Close photo">
            <Icon name="close" size={17} strokeWidth={2.2} />
          </Pressable>
          <span className="t-meta viewer-count t-num">{i + 1} / {photos.length}</span>
        </div>
        <div className="viewer-foot">
          {photo.caption && <p className="t-row">{photo.caption}</p>}
          <p className="t-meta">
            {dateLabel(photo.capturedAt)} · {time(photo.capturedAt)}
            {author ? ` · ${author.name}` : ""}
            {photo.syncState === "queued" ? " · waiting to sync" : photo.syncState === "failed" ? " · upload failed" : ""}
          </p>
        </div>
      </motion.div>

      <button className="viewer-hit" onClick={() => setChrome((c) => !c)} aria-label="Toggle photo details" />
    </motion.div>
  );
}
