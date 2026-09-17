/* Media — the loop that makes this business unusual.
 *
 * A carpenter photographs rot in a crawl space. That shot becomes a reel. The
 * reel brings a homeowner who books a job. Most contractors never see that line
 * connect; here it is one screen, and every reel says what it actually brought
 * back. */
import { useState } from "react";
import { motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Pressable, Segmented, useToast } from "../../ui/primitives";
import { SheetHead, Tag, photoSrc } from "../../ui/domain";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { compactMoney, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import type { Reel } from "../../data/types";
import { JobDetail } from "../jobs/JobDetail";
import "./media.css";

const views = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export function MediaScreen() {
  const { db } = useDB();
  const e = useEntities();
  const { present } = useSheets();
  const [lens, setLens] = useState<"working" | "marked">("working");

  const reels = [...db.reels].sort((a, b) => b.leads - a.leads);
  const marked = db.photos.filter((p) => p.forReel);
  const bestFormat = reels.reduce((m, r) => {
    m[r.format] = (m[r.format] ?? 0) + r.leads;
    return m;
  }, {} as Record<string, number>);
  const topFormat = Object.entries(bestFormat).sort((a, b) => b[1] - a[1])[0];
  const booked = reels.reduce((s, r) => s + r.bookedCents, 0);

  return (
    <Screen
      title="Media"
      subtitle={`${reels.length} published · ${compactMoney(booked)} booked from them`}
      headerExtra={
        <Segmented
          value={lens} onChange={setLens}
          options={[
            { value: "working", label: "What's working", count: reels.length },
            { value: "marked", label: "Marked", count: marked.length },
          ]}
        />
      }
    >
      {lens === "working" ? (
        <>
          <p className="t-body dim med-lede">
            {topFormat?.[0]} brings the most work back — {topFormat?.[1]} of the {reels.reduce((s, r) => s + r.leads, 0)} leads
            these reels produced. Shoot more of it.
          </p>
          <div className="med-list">
            {reels.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.sheet, delay: 0.03 * i }}>
                <Pressable className="med-reel" onClick={() => present((api) => <ReelSheet api={api} reel={r} />, { detents: ["auto"] })}>
                  <span className="med-thumb"><img src={photoSrc({ seed: r.photoSeed })} alt="" loading="lazy" /></span>
                  <span className="grow">
                    <span className="med-title">{r.title}</span>
                    <span className="med-meta">{r.format} · {relative(r.publishedAt, NOW)}</span>
                    <span className="med-stats">
                      <span>{views(r.views)} views</span>
                      <span className={r.leads > 0 ? "is-good" : ""}>{r.leads} leads</span>
                      {r.bookedCents > 0 && <span className="is-good">{compactMoney(r.bookedCents)} booked</span>}
                    </span>
                  </span>
                  <Icon name="chevron" size={18} className="dimmer" />
                </Pressable>
              </motion.div>
            ))}
          </div>
        </>
      ) : marked.length === 0 ? (
        <div className="med-empty">
          <Icon name="camera" size={34} className="dimmer" />
          <p className="t-section">Nothing marked yet</p>
          <p className="t-body dim">
            Crews flag a shot while they are standing in front of it, during the day close-out. Those land here.
          </p>
        </div>
      ) : (
        <>
          <p className="t-body dim med-lede">
            Flagged on site by the crew, at the moment it was worth flagging.
          </p>
          <div className="med-grid">
            {marked.map((p) => {
              const job = e.job(p.jobId);
              return (
                <Pressable
                  key={p.id} className="med-cell"
                  onClick={() => present((api) => <MarkedSheet api={api} photoId={p.id} />, { detents: ["auto"] })}
                  aria-label={p.caption ?? "Marked shot"}
                >
                  <img src={photoSrc(p)} alt="" loading="lazy" />
                  <span className="med-cell-tag">{e.customer(job.customerId).name.split(" ")[0]}</span>
                </Pressable>
              );
            })}
          </div>
        </>
      )}
    </Screen>
  );
}

function ReelSheet({ api, reel }: { api: SheetApi; reel: Reel }) {
  const e = useEntities();
  const { push } = useNav();
  const toast = useToast();
  const job = reel.jobId ? e.job(reel.jobId) : null;

  return (
    <>
      <SheetHead api={api} title={reel.title} subtitle={reel.format} />
      <div className="sheet-body stack gap-3">
        <span className="med-hero"><img src={photoSrc({ seed: reel.photoSeed })} alt="" /></span>
        <div className="med-figs">
          <div><p className="med-fig">{views(reel.views)}</p><p className="t-meta">views</p></div>
          <div><p className="med-fig">{reel.leads}</p><p className="t-meta">leads</p></div>
          <div><p className="med-fig">{compactMoney(reel.bookedCents)}</p><p className="t-meta">booked</p></div>
        </div>
        {job && (
          <Pressable className="rec-open" onClick={() => { api.close(); push(`job-${job.id}`, () => <JobDetail jobId={job.id} />); }}>
            <span className="grow">
              <span className="rec-open-t">Shot on {e.customer(job.customerId).name}'s job</span>
              <span className="rec-open-s">{job.title}</span>
            </span>
            <Icon name="chevron" size={18} className="dimmer" />
          </Pressable>
        )}
      </div>
      <div className="sheet-foot">
        <button className="btn btn-primary btn-lg btn-full" onClick={() => { haptic("medium"); toast({ text: `Queued another ${reel.format.toLowerCase()} for the next shoot`, tone: "success", undo: () => {} }); api.close(); }}>
          Shoot more like this
        </button>
      </div>
    </>
  );
}

function MarkedSheet({ api, photoId }: { api: SheetApi; photoId: string }) {
  const { db } = useDB();
  const e = useEntities();
  const toast = useToast();
  const photo = db.photos.find((p) => p.id === photoId)!;
  const job = e.job(photo.jobId);
  const by = e.person(photo.by);

  return (
    <>
      <SheetHead api={api} title={photo.caption ?? "Marked shot"} subtitle={e.customer(job.customerId).name} />
      <div className="sheet-body stack gap-3">
        <span className="med-hero"><img src={photoSrc(photo)} alt="" /></span>
        <div className="hrow" style={{ gap: 8, flexWrap: "wrap" }}>
          <Tag hue="teal" icon="camera">Marked for a reel</Tag>
          {photo.syncState !== "synced" && <Tag hue="amber" icon="refresh">Waiting to sync</Tag>}
        </div>
        <p className="t-meta">Shot by {by?.name ?? "—"} · {relative(photo.capturedAt, NOW)}</p>
      </div>
      <div className="sheet-foot">
        <button className="btn btn-primary btn-lg btn-full" onClick={() => { haptic("success"); toast({ text: "Sent to the edit queue", tone: "success" }); api.close(); }}>
          Send to the edit queue
        </button>
      </div>
    </>
  );
}
