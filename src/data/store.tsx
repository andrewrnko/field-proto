/* Single source of truth for the prototype.
 *
 * Writes go through `commit`, which models what a real client does: an
 * optimistic local apply, a visible pending state, and an acknowledged result.
 * Nothing in the UI is allowed to claim "saved" before commit resolves
 * (design system §6). A failure leaves the draft intact and surfaces Retry. */
import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from "react";
import type { DB } from "./types";
import { seed } from "./seed";

type Ctx = {
  db: DB;
  /** apply a pure update; resolves when the (simulated) server acknowledges */
  commit: (fn: (db: DB) => DB, opts?: { latencyMs?: number; fail?: boolean; label?: string }) => Promise<boolean>;
  /** true while any write is in flight */
  pending: number;
};

const DataCtx = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => seed());
  const [pending, setPending] = useState(0);
  const failNext = useRef(false);

  const commit = useCallback<Ctx["commit"]>((fn, opts) => {
    const latency = opts?.latencyMs ?? 420;
    const willFail = opts?.fail ?? failNext.current;
    failNext.current = false;
    setPending((p) => p + 1);
    const before = db;
    setDb((cur) => fn(structuredClone(cur)));
    return new Promise((resolve) => {
      setTimeout(() => {
        setPending((p) => p - 1);
        if (willFail) { setDb(before); resolve(false); return; }
        resolve(true);
      }, latency);
    });
  }, [db]);

  const value = useMemo(() => ({ db, commit, pending }), [db, commit, pending]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useDB() {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useDB outside DataProvider");
  return c;
}

/* --------------------------- save state --------------------------- */

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useSaver() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<number | undefined>(undefined);
  const run = useCallback(async (p: Promise<boolean>) => {
    setState("saving");
    const ok = await p;
    setState(ok ? "saved" : "error");
    window.clearTimeout(timer.current);
    if (ok) timer.current = window.setTimeout(() => setState("idle"), 1800);
    return ok;
  }, []);
  return { state, run, reset: () => setState("idle") };
}

export const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save. Retry.",
};

/* ------------------------- selector helpers ------------------------ */

export function useEntities() {
  const { db } = useDB();
  return useMemo(() => ({
    person: (id: string | null) => db.people.find((p) => p.id === id) ?? null,
    customer: (id: string) => db.customers.find((c) => c.id === id)!,
    property: (id: string) => db.properties.find((p) => p.id === id)!,
    job: (id: string) => db.jobs.find((j) => j.id === id)!,
    jobsFor: (customerId: string) => db.jobs.filter((j) => j.customerId === customerId),
    findings: (jobId: string) => db.findings.filter((f) => f.jobId === jobId),
    photos: (jobId: string) => db.photos.filter((p) => p.jobId === jobId),
    estimates: (jobId: string) => db.estimates.filter((e) => e.jobId === jobId),
    changeOrders: (jobId: string) => db.changeOrders.filter((c) => c.jobId === jobId),
    appointments: (jobId: string) => db.appointments.filter((a) => a.jobId === jobId),
    invoices: (jobId: string) => db.invoices.filter((i) => i.jobId === jobId),
    activity: (jobId: string) => db.activity.filter((a) => a.jobId === jobId)
      .sort((a, b) => b.at.localeCompare(a.at)),
    messages: (threadId: string) => db.messages.filter((m) => m.threadId === threadId)
      .sort((a, b) => a.at.localeCompare(b.at)),
  }), [db]);
}
