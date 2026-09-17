/* The lens.
 *
 * One system, five ways of standing in front of it. The lens decides what Now
 * is made of — not what the user is allowed to see. An owner can still open a
 * crawl space photo; a carpenter can still see the invoice. The lens only
 * decides what the software leads with. */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useDB } from "../data/store";

export type Lens = "owner" | "estimator" | "crew" | "coordinator" | "media";

export const LENS: Record<Lens, { label: string; personId: string; leads: string }> = {
  owner:       { label: "Owner",        personId: "p1", leads: "What is blocking a crew and where the money is" },
  estimator:   { label: "Estimator",    personId: "p2", leads: "Who has not been called and what is going quiet" },
  crew:        { label: "Crew",         personId: "p3", leads: "Where to be, what the scope is, what is missing" },
  coordinator: { label: "Coordinator",  personId: "p5", leads: "Unassigned work, conflicts, customers waiting" },
  media:       { label: "Media",        personId: "p2", leads: "Which site, what to capture, what is working" },
};

const Ctx = createContext<{ lens: Lens; setLens: (l: Lens) => void; personId: string } | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLens] = useState<Lens>(() => (localStorage.getItem("gr-lens") as Lens) ?? "owner");
  const set = (l: Lens) => { localStorage.setItem("gr-lens", l); setLens(l); };
  const value = useMemo(() => ({ lens, setLens: set, personId: LENS[lens].personId }), [lens]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLens() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLens outside LensProvider");
  const { db } = useDB();
  const person = db.people.find((p) => p.id === c.personId) ?? db.people[0];
  return { ...c, person };
}
