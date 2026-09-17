/* The entry point on Today.
 *
 * Deliberately the quietest thing on the screen: it is not urgent, it is not a
 * decision, and it is only true for part of the day. One line, one tap, at the
 * bottom where the eye lands last. */
import { useMemo } from "react";
import { Icon } from "../../ui/Icon";
import { Pressable } from "../../ui/primitives";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { haptic } from "../../lib/haptics";
import { dur, openShift } from "./closeout";
import { useLens } from "../../shell/roles";
import { CloseOutFlow } from "./CloseOutFlow";
import "./closeout.css";

export function CloseOutLine() {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const { person } = useLens();
  const shift = useMemo(() => openShift(db, person.id), [db, person.id]);
  if (!shift) return null;

  const names = shift.entryIds
    .map((id) => db.time.find((t) => t.id === id))
    .map((t) => (t ? e.person(t.personId)?.name.split(" ")[0] : null))
    .filter((n): n is string => !!n);

  return (
    <Pressable
      className="cls-line"
      data-shot="closeout"
      scale={0.99}
      onClick={() => {
        haptic("medium");
        push(`closeout-${shift.jobId}`, () => <CloseOutFlow jobId={shift.jobId} entryIds={shift.entryIds} />);
      }}
    >
      <Icon name="clock" size={19} className="dimmer" />
      <span className="grow">
        <span className="cls-line-title">Close out the day</span>
        <span className="cls-line-sub truncate">
          {shift.mine ? "You" : names.join(" and ")} · {dur((NOW.getTime() - new Date(shift.since).getTime()) / 36e5)} on the clock
        </span>
      </span>
      <Icon name="chevron" size={18} className="dimmer" />
    </Pressable>
  );
}
