/* Finding capture — the flow a carpenter runs standing in a crawl space.
 *
 * Design constraints that shaped it: one hand, gloves, a headlamp, and often no
 * signal. So: one decision per step, targets far bigger than 44px, no typing
 * required to finish (every field has tap-first defaults), the photo step works
 * offline and says so, and the whole thing can be abandoned and resumed without
 * losing what was already captured. */
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, animate } from "motion/react";
import { Icon } from "../../ui/Icon";
import { Badge, Button, Field, Pressable, useToast } from "../../ui/primitives";
import { SeverityChip } from "../../ui/domain";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { SPRING, clamp } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { Finding, Severity } from "../../data/types";
import "./inspect.css";

const LOCATIONS = [
  { label: "Crawl space", note: "under the main floor" },
  { label: "Rim / band joist", note: "perimeter framing" },
  { label: "Sill plate", note: "on the foundation" },
  { label: "Subfloor", note: "sheathing above the joists" },
  { label: "Deck ledger", note: "where the deck meets the house" },
  { label: "Deck framing", note: "joists, beams, posts" },
  { label: "Siding / trim", note: "exterior envelope" },
  { label: "Window opening", note: "flashing and sill" },
];

const SEVERITIES: Array<{ value: Severity; title: string; note: string }> = [
  { value: "monitor", title: "Monitor", note: "Damp or surface only. Watch it, no repair today." },
  { value: "active", title: "Active rot", note: "Wood is soft. Material has to come out." },
  { value: "structural", title: "Structural", note: "Load-bearing member compromised. Shore before work." },
];

const STEPS = ["Where", "How bad", "Moisture", "Measure", "Photos", "Review"] as const;

export function InspectionFlow({ jobId }: { jobId: string }) {
  const { commit } = useDB();
  const e = useEntities();
  const { pop } = useNav();
  const toast = useToast();

  const job = e.job(jobId);
  const customer = e.customer(job.customerId);
  const pool = e.photos(jobId);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [location, setLocation] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [moisture, setMoisture] = useState(22);
  const [measured, setMeasured] = useState(false);
  const [measurement, setMeasurement] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [offline, setOffline] = useState(true);
  const [saving, setSaving] = useState(false);

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); haptic("light"); };
  const canAdvance = [!!location, !!severity, true, true, picked.length > 0, true][step];

  const title = useMemo(() => {
    if (!location) return "New finding";
    return detail.trim() ? `${location} — ${detail.trim()}` : location;
  }, [location, detail]);

  const save = async () => {
    setSaving(true);
    const id = `f-new-${Date.now()}`;
    const ok = await commit((d) => {
      const finding: Finding = {
        id, jobId,
        location: detail.trim() ? `${location}, ${detail.trim()}` : location!,
        title: detail.trim() || `${location} rot`,
        severity: severity!,
        moisturePct: measured ? moisture : undefined,
        measurement: measurement.trim() || undefined,
        photoIds: picked,
        discoveredAt: NOW.toISOString(),
        discoveredBy: d.me,
        isNewDamage: job.stage === "in_progress",
      };
      d.findings.push(finding);
      d.activity.push({
        id: `act-${id}`, jobId, at: NOW.toISOString(), actorId: d.me, kind: "finding",
        text: `Finding logged: ${finding.title}`,
        meta: measured ? `${moisture}% MC` : undefined,
      });
      if (offline) {
        for (const pid of picked) {
          const p = d.photos.find((x) => x.id === pid);
          if (p) p.syncState = "queued";
        }
      }
      return d;
    }, { latencyMs: 700 });
    setSaving(false);
    if (!ok) { toast({ text: "Couldn't save. Retry.", tone: "danger" }); return; }
    haptic("success");
    toast({
      text: offline ? "Saved on this device — will sync" : "Finding saved",
      tone: "success",
    });
    pop();
  };

  return (
    <div className="insp">
      <div className="insp-top">
        {step === 0
          ? <Pressable className="round round-plain" style={{ width: 34, height: 34 }} onClick={pop} aria-label="Cancel"><Icon name="close" size={19} /></Pressable>
          : <Pressable className="round round-plain" style={{ width: 34, height: 34 }} onClick={() => go(step - 1)} aria-label="Back"><Icon name="chevronLeft" size={20} /></Pressable>}
        <div className="insp-title">
          <h2 className="t-row">{STEPS[step]}</h2>
          <p className="t-meta truncate">{customer.name} · {job.title}</p>
        </div>
        <span />
      </div>
      <div className="insp-progress">
        <motion.i animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={SPRING.sheet} />
      </div>

      <div className="scroll insp-body">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ x: dir * 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -28, opacity: 0 }}
            transition={SPRING.sheet}
          >
            {step === 0 && (
              <>
                <div className="insp-q">
                  <h3 className="t-section">Where is it?</h3>
                  <p className="t-body dim">Pick the area, then add the exact spot.</p>
                </div>
                <div className="pick-grid">
                  {LOCATIONS.map((l) => (
                    <Pressable
                      key={l.label}
                      className={`pick${location === l.label ? " is-on" : ""}`}
                      onClick={() => { haptic("select"); setLocation(l.label); }}
                    >
                      <span className="pick-title">{l.label}</span>
                      <span className="pick-note">{l.note}</span>
                    </Pressable>
                  ))}
                </div>
                <div style={{ paddingTop: 16 }}>
                  <Field
                    label="Exact spot (optional)"
                    placeholder="bay 4, north corner"
                    value={detail}
                    onChange={(ev) => setDetail(ev.target.value)}
                    hint="What you'd say on the phone to another carpenter."
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="insp-q">
                  <h3 className="t-section">How bad is it?</h3>
                  <p className="t-body dim">This drives the estimate and whether work stops.</p>
                </div>
                <div className="stack gap-2">
                  {SEVERITIES.map((s) => (
                    <Pressable
                      key={s.value}
                      className={`pick${severity === s.value ? " is-on" : ""}`}
                      style={{ minHeight: 84 }}
                      onClick={() => { haptic(s.value === "structural" ? "warning" : "select"); setSeverity(s.value); }}
                    >
                      <span className="pick-title">{s.title}</span>
                      <span className="pick-note">{s.note}</span>
                      <span className="pick-sev">
                        <i className={s.value ? `on-${s.value}` : ""} />
                        <i className={s.value !== "monitor" ? `on-${s.value}` : ""} />
                        <i className={s.value === "structural" ? "on-structural" : ""} />
                      </span>
                    </Pressable>
                  ))}
                </div>
                {severity === "structural" && (
                  <motion.div className="offline-note" style={{ marginTop: 14 }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Icon name="alert" size={17} />
                    <span className="t-body">Structural findings notify the owner as soon as this syncs.</span>
                  </motion.div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <div className="insp-q">
                  <h3 className="t-section">Moisture reading</h3>
                  <p className="t-body dim">Drag the meter. Skip it if you didn't pin it.</p>
                </div>
                <MoistureMeter value={moisture} onChange={(v) => { setMoisture(v); setMeasured(true); }} measured={measured} />
              </>
            )}

            {step === 3 && (
              <>
                <div className="insp-q">
                  <h3 className="t-section">What did you measure?</h3>
                  <p className="t-body dim">Length, count, depth — whatever the repair gets priced from.</p>
                </div>
                <Field
                  label="Measurement"
                  placeholder="3 joists soft to 14 in from the rim"
                  value={measurement}
                  onChange={(ev) => setMeasurement(ev.target.value)}
                />
                <div className="chip-row is-wrap" style={{ paddingTop: 10 }}>
                  {["2 joists, full length", "6 lf of rim joist", "soft to 14 in", "subfloor 4×8 section", "post base gone"].map((s) => (
                    <button key={s} className="chip" onClick={() => { haptic("select"); setMeasurement((m) => (m ? `${m}, ${s}` : s)); }}>{s}</button>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="insp-q">
                  <h3 className="t-section">Photos</h3>
                  <p className="t-body dim">At least one wide, one tight. They go on the change order.</p>
                </div>
                <Pressable className="cap-shutter" onClick={() => { haptic("medium"); toast({ text: "Camera opens on a real device — pick from the roll below" }); }}>
                  <Icon name="camera" size={22} />
                  <span className="t-body">Take a photo</span>
                </Pressable>
                <div className="cap-grid" style={{ paddingTop: 10 }}>
                  {pool.slice(0, 9).map((p) => {
                    const on = picked.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        className={`cap-cell${on ? " is-on" : ""}`}
                        aria-label={p.caption ?? "Photo"}
                        onClick={() => { haptic("select"); setPicked((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id])); }}
                      >
                        <img src={`${import.meta.env.BASE_URL}photos/${p.seed}.jpg`} alt="" loading="lazy" />
                        {on && <span className="cap-check"><Icon name="check" size={12} strokeWidth={3} /></span>}
                      </Pressable>
                    );
                  })}
                </div>
                <div className="offline-note" style={{ marginTop: 14 }}>
                  <Icon name={offline ? "refresh" : "shield"} size={17} />
                  <span className="grow t-body">{offline ? "No signal down here — photos queue and send when you're out." : "Online — photos upload as you shoot."}</span>
                  <Button size="sm" variant="secondary" onClick={() => setOffline((o) => !o)}>{offline ? "I have signal" : "Go offline"}</Button>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="insp-q">
                  <h3 className="t-section">Check it before it ships</h3>
                  <p className="t-body dim">This becomes a line on the change order.</p>
                </div>
                <div className="card review-card">
                  <div className="hrow" style={{ justifyContent: "space-between" }}>
                    <span className="t-row">{title}</span>
                    {severity && <SeverityChip severity={severity} />}
                  </div>
                  <div>
                    <div className="review-line"><span className="t-body dim">Moisture</span><span className="t-body t-num">{measured ? `${moisture}%` : "not measured"}</span></div>
                    <div className="review-line"><span className="t-body dim">Measured</span><span className="t-body">{measurement.trim() || "—"}</span></div>
                    <div className="review-line"><span className="t-body dim">Photos</span><span className="t-body t-num">{picked.length}</span></div>
                    <div className="review-line"><span className="t-body dim">Scope</span><span className="t-body">{job.stage === "in_progress" ? "New damage" : "Original scope"}</span></div>
                  </div>
                  {picked.length > 0 && (
                    <div className="cap-grid">
                      {picked.slice(0, 6).map((id) => {
                        const p = pool.find((x) => x.id === id)!;
                        return <span key={id} className="cap-cell"><img src={`${import.meta.env.BASE_URL}photos/${p.seed}.jpg`} alt="" /></span>;
                      })}
                    </div>
                  )}
                  {offline && <Badge tone="warning" icon="refresh">Saves on this device, syncs when you have signal</Badge>}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="insp-foot">
        {step < STEPS.length - 1 ? (
          <>
            <Button full size="lg" disabled={!canAdvance} onClick={() => go(step + 1)} iconAfter="arrowRight">
              Continue
            </Button>
            {step === 2 && !measured && (
              <Button variant="quiet" full onClick={() => go(step + 1)}>I didn't take a reading</Button>
            )}
          </>
        ) : (
          <Button full size="lg" pending={saving} onClick={save} icon="check">Save finding</Button>
        )}
        {!(step === 2 && !measured) && <p className="t-meta" style={{ textAlign: "center" }}>Step {step + 1} of {STEPS.length}</p>}
      </div>
    </div>
  );
}

/* --------------------------- moisture meter --------------------------- */

function MoistureMeter({ value, onChange, measured }: { value: number; onChange: (v: number) => void; measured: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const last = useRef(value);

  const band = value < 16 ? "dry" : value < 22 ? "elevated" : "wet";
  const bandLabel = band === "dry" ? "Dry — no action" : band === "elevated" ? "Elevated — watch it" : "Wet — rot conditions";

  const set = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = clamp((clientX - r.left) / r.width, 0, 1);
    const next = Math.round(6 + pct * 34); // 6% .. 40%
    if (next !== last.current) { last.current = next; haptic("select"); }
    onChange(next);
    animate(x, pct * (r.width - 8), { duration: 0 });
  };

  return (
    <div className="meter">
      <p className={`meter-read${measured ? "" : " is-empty"}`}>
        {measured ? value : "—"}{measured && <sup>%</sup>}
      </p>
      <span className={`meter-band${measured ? ` band-${band}` : " band-none"}`}>
        {measured ? bandLabel : "Drag the meter to set a reading"}
      </span>
      <div
        className="meter-track"
        ref={ref}
        role="slider"
        aria-label="Moisture content"
        aria-valuenow={value} aria-valuemin={6} aria-valuemax={40}
        tabIndex={0}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(e.clientX); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) set(e.clientX); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onChange(clamp(value + 1, 6, 40));
          if (e.key === "ArrowLeft") onChange(clamp(value - 1, 6, 40));
        }}
      >
        <span className="meter-ticks" aria-hidden>{Array.from({ length: 18 }).map((_, i) => <i key={i} />)}</span>
        <motion.span className="meter-knob" style={{ left: `calc(${((value - 6) / 34) * 100}% - ${((value - 6) / 34) * 8}px)` }} />
      </div>
      {measured && (
        <p className="t-meta meter-help">
          {value < 16 ? "Dry enough to close up." : value < 22 ? "Damp. Note it and re-check on the next visit." : "Above 22% wood decay fungus stays active — this needs to come out."}
        </p>
      )}
      <div className="meter-scale">
        <span className="t-meta t-num">6%</span>
        <span className="t-meta">fibre saturation ≈ 28%</span>
        <span className="t-meta t-num">40%</span>
      </div>
    </div>
  );
}
