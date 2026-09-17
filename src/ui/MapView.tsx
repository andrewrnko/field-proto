/* A place, drawn as a place.
 *
 * The map is baked at build time from OpenStreetMap tiles (scripts/maps.mjs),
 * so it ships with the app: no key, no runtime request, correct when the crawl
 * space has no signal. The pin is drawn, not part of the image, so it can pulse
 * when the crew is standing on it. */
import { motion } from "motion/react";
import { Icon } from "./Icon";
import { Pressable } from "./primitives";
import { SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";
import type { Property } from "../data/types";
import "./map.css";

export function MapView({
  property, height = 168, live, caption, action, onAction, round = 20,
}: {
  property: Property;
  height?: number;
  /** someone is on site right now — the pin breathes */
  live?: boolean;
  caption?: string;
  action?: string;
  onAction?: () => void;
  round?: number;
}) {
  const directions = () => {
    haptic("medium");
    if (onAction) return onAction();
    const q = property.lat && property.lng
      ? `${property.lat},${property.lng}`
      : encodeURIComponent(`${property.address}, ${property.city} WA`);
    window.open(`https://maps.apple.com/?q=${q}`, "_blank", "noopener");
  };

  return (
    <div className="map" style={{ height, borderRadius: round }}>
      <img src={`${import.meta.env.BASE_URL}maps/${property.id}.jpg`} alt="" loading="lazy" />
      <span className="map-wash" aria-hidden />

      <motion.span
        className="map-pin"
        initial={{ y: -10, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ ...SPRING.pop, delay: 0.08 }}
      >
        {live && <span className="map-pulse" aria-hidden />}
        <span className={`map-dot${live ? " is-live" : ""}`} />
      </motion.span>

      <div className="map-foot">
        <span className="grow">
          <span className="map-addr">{property.address}</span>
          <span className="map-city">{caption ?? `${property.city}, WA ${property.zip}`}</span>
        </span>
        <Pressable className="map-go" onClick={directions}>
          <Icon name="truck" size={17} />
          {action ?? "Directions"}
        </Pressable>
      </div>
    </div>
  );
}
