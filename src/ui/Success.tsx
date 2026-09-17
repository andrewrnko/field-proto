/* Completion, made legible.
 *
 * A status chip quietly changing colour is not an acknowledgement. When
 * something real finishes — money settles, a document goes out, a day closes —
 * the mark springs in once, glows once, and stops. No confetti, no loop. */
import { motion } from "motion/react";
import { Icon, type IconName } from "./Icon";
import { SPRING } from "../lib/motion";
import "./success.css";

export function SuccessMark({
  size = 92, hue = "emerald", icon = "check",
}: { size?: number; hue?: "emerald" | "blue" | "violet" | "amber"; icon?: IconName }) {
  return (
    <span className={`succ succ-${hue}`} style={{ width: size, height: size }} aria-hidden>
      <motion.span
        className="succ-glow"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: [0, 0.9, 0.45], scale: [0.4, 1.25, 1] }}
        transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.span
        className="succ-badge"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...SPRING.pop, delay: 0.04 }}
      >
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...SPRING.pop, delay: 0.16 }}
        >
          <Icon name={icon} size={Math.round(size * 0.42)} strokeWidth={2.6} />
        </motion.span>
      </motion.span>
    </span>
  );
}
