/* Jobs — one list, two lenses.
 *
 * Leads and production work are the same object at different stages, so this is
 * one screen with a lens rather than two destinations that disagree about
 * counts. A row carries four things and no more: who, what, where it stands,
 * what it is worth. Everything else is on the record. */
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Screen } from "../../ui/Screen";
import { Icon } from "../../ui/Icon";
import { Button, Pressable, Segmented, SwipeRow, useToast } from "../../ui/primitives";
import { BLOCKER_SHORT, SheetHead, STAGE_HUE, Tag, type Hue } from "../../ui/domain";
import { useSheets, type SheetApi } from "../../ui/Sheet";
import { useNav } from "../../ui/Nav";
import { useDB, useEntities } from "../../data/store";
import { NOW } from "../../data/clock";
import { compactMoney, relative } from "../../lib/format";
import { SPRING } from "../../lib/motion";
import { haptic } from "../../lib/haptics";
import { LEAD_STAGES, STAGE_LABEL, type Job, type Stage } from "../../data/types";
import { JobDetail } from "./JobDetail";
import "./jobs.css";

type Lens = "leads" | "active" | "all";
type Sort = "attention" | "value" | "recent";

const isLead = (j: Job) => LEAD_STAGES.includes(j.stage);

export function JobsScreen() {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const { present } = useSheets();

  const [lens, setLens] = useState<Lens>("active");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("attention");
  const [stageFilter, setStageFilter] = useState<Stage[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query);

  const rows = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    let list = db.jobs.filter((j) => (lens === "all" ? true : lens === "leads" ? isLead(j) : !isLead(j) && j.stage !== "lost"));
    if (stageFilter.length) list = list.filter((j) => stageFilter.includes(j.stage));
    if (q) {
      list = list.filter((j) => {
        const c = e.customer(j.customerId);
        const p = e.property(j.propertyId);
        return [j.title, j.scopeSummary, c.name, p.address, p.city, STAGE_LABEL[j.stage]]
          .join(" ").toLowerCase().includes(q);
      });
    }
    const late = (j: Job) => !!j.nextAction && new Date(j.nextAction.dueAt) < NOW;
    const weight = (j: Job) => (late(j) ? 3 : 0) + (j.blocker ? 2 : 0) + (j.ownerId === null ? 1 : 0);
    const sorted = [...list].sort((a, b) =>
      sort === "value" ? b.valueCents - a.valueCents
        : sort === "recent" ? b.createdAt.localeCompare(a.createdAt)
          : weight(b) - weight(a) || a.title.localeCompare(b.title));
    if (sort !== "attention") return [{ title: "", jobs: sorted }];
    const needs = sorted.filter((j) => weight(j) > 0);
    const rest = sorted.filter((j) => weight(j) === 0);
    return [
      { title: "Needs attention", jobs: needs },
      { title: lens === "leads" ? "Warm" : "Moving", jobs: rest },
    ].filter((g) => g.jobs.length > 0);
  }, [db.jobs, lens, deferred, stageFilter, sort, e]);

  const counts = useMemo(() => ({
    leads: db.jobs.filter(isLead).length,
    active: db.jobs.filter((j) => !isLead(j) && j.stage !== "lost").length,
    all: db.jobs.length,
  }), [db.jobs]);

  const total = rows.reduce((n, g) => n + g.jobs.length, 0);
  const filtered = stageFilter.length > 0 || deferred.trim().length > 0;

  return (
    <Screen
      title="Jobs"
      subtitle={`${counts.leads} open leads · ${counts.active} in production`}
      actions={
        <>
          <Pressable
            className="round round-plain" style={{ width: 40, height: 40 }}
            aria-label="Search jobs" data-shot="search-jobs"
            onClick={() => { setSearching((s) => !s); setTimeout(() => inputRef.current?.focus(), 60); }}
          >
            <Icon name="search" size={22} />
          </Pressable>
          <Pressable
            className="round round-plain" style={{ width: 40, height: 40 }}
            aria-label="Sort and filter" data-shot="filter-jobs"
            onClick={() => present((api) => (
              <FilterSheet api={api} sort={sort} setSort={setSort} stageFilter={stageFilter} setStageFilter={setStageFilter} lens={lens} />
            ), { detents: ["auto"] })}
          >
            <Icon name="filter" size={22} />
            {stageFilter.length > 0 && <span className="dot-mark" aria-hidden />}
          </Pressable>
        </>
      }
      headerExtra={
        <div className="stack gap-2">
          <AnimatePresence initial={false}>
            {searching && (
              <motion.div
                className="jsearch"
                initial={{ height: 0, opacity: 0 }} animate={{ height: 48, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={SPRING.sheet}
              >
                <Icon name="search" size={19} className="dimmer" />
                <input ref={inputRef} value={query} placeholder="Customer, address, scope" onChange={(ev) => setQuery(ev.target.value)} aria-label="Search jobs" />
                {query && (
                  <Pressable className="round round-plain" style={{ width: 30, height: 30 }} aria-label="Clear search" onClick={() => setQuery("")}>
                    <Icon name="close" size={15} strokeWidth={2.4} />
                  </Pressable>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <Segmented
            value={lens} onChange={setLens}
            options={[
              { value: "leads", label: "Leads", count: counts.leads },
              { value: "active", label: "Active", count: counts.active },
              { value: "all", label: "All", count: counts.all },
            ]}
          />
        </div>
      }
    >
      {total === 0 ? (
        <div className="jempty">
          <span className="jempty-mark"><Icon name={filtered ? "search" : "jobs"} size={34} strokeWidth={1.5} /></span>
          <div className="stack gap-2">
            <p className="t-section">{filtered ? "Nothing matches" : lens === "leads" ? "No open leads" : "Nothing in production"}</p>
            <p className="t-body dim">
              {filtered
                ? "No job in this lens matches what you searched for."
                : "New work lands here the moment a lead is logged."}
            </p>
          </div>
          {filtered
            ? <Button variant="secondary" onClick={() => { setStageFilter([]); setQuery(""); }}>Clear filters</Button>
            : <Button icon="plus" onClick={() => setSearching(false)}>New lead</Button>}
        </div>
      ) : (
        rows.map((group) => (
          <div key={group.title || "all"}>
            {group.title && (
              <div className="jgroup">
                <h2>{group.title}</h2>
                <span>{group.jobs.length}</span>
              </div>
            )}
            {group.jobs.map((j) => (
              <JobRow key={j.id} job={j} onOpen={() => push(`job-${j.id}`, () => <JobDetail jobId={j.id} />)} />
            ))}
          </div>
        ))
      )}
    </Screen>
  );
}

/* ------------------------------- row ------------------------------- */

function JobRow({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const e = useEntities();
  const toast = useToast();
  const customer = e.customer(job.customerId);
  const property = e.property(job.propertyId);
  const late = !!job.nextAction && new Date(job.nextAction.dueAt) < NOW;

  const state: { text: string; hue: Hue; icon?: "alert" | "clock" | "wrench" } = job.blocker
    ? { text: BLOCKER_SHORT[job.blocker.kind] ?? "Blocked", hue: "amber", icon: "alert" }
    : late
      ? { text: job.nextAction!.label, hue: "coral", icon: "clock" }
      : job.schedule === "in_progress"
        ? { text: "On site now", hue: "teal", icon: "wrench" }
        : { text: STAGE_LABEL[job.stage], hue: STAGE_HUE[job.stage] };

  return (
    <SwipeRow
      actions={[
        { label: "Call", icon: "phone", onAction: () => toast({ text: `Calling ${customer.name}` }) },
        { label: "Assign", icon: "user", tone: "success", onAction: () => toast({ text: "Owner picker opens on the record" }) },
      ]}
    >
      <Pressable className="jrow" onClick={onOpen} scale={0.99}>
        <span className="grow">
          <span className="jrow-name truncate">{customer.name}</span>
          <span className="jrow-what truncate">{job.title} · {property.city}</span>
          <span className="jrow-tags"><Tag hue={state.hue} icon={state.icon}>{state.text}</Tag></span>
        </span>
        <span className="jrow-right">
          <span className="jrow-money">{compactMoney(job.valueCents)}</span>
          {late && <span className="jrow-when">{relative(job.nextAction!.dueAt, NOW)}</span>}
        </span>
      </Pressable>
    </SwipeRow>
  );
}

/* ----------------------------- filters ----------------------------- */

function FilterSheet({
  api, sort, setSort, stageFilter, setStageFilter, lens,
}: {
  api: SheetApi; sort: Sort; setSort: (s: Sort) => void;
  stageFilter: Stage[]; setStageFilter: (s: Stage[]) => void; lens: Lens;
}) {
  const stages = (lens === "leads" ? LEAD_STAGES : (Object.keys(STAGE_LABEL) as Stage[]))
    .filter((s) => lens !== "active" || !LEAD_STAGES.includes(s));
  return (
    <>
      <SheetHead api={api} title="Sort and filter" icon="filter" />
      <div className="sheet-body stack gap-4">
        <div className="stack gap-2">
          <p className="t-row">Sort by</p>
          <Segmented
            value={sort} onChange={setSort}
            options={[
              { value: "attention", label: "Attention" },
              { value: "value", label: "Value" },
              { value: "recent", label: "Newest" },
            ]}
          />
        </div>
        <div className="stack gap-2">
          <p className="t-row">Stage</p>
          <div className="chip-row is-wrap">
            {stages.map((s) => {
              const on = stageFilter.includes(s);
              return (
                <button
                  key={s} className={`chip${on ? " is-on" : ""}`}
                  onClick={() => { haptic("select"); setStageFilter(on ? stageFilter.filter((x) => x !== s) : [...stageFilter, s]); }}
                >
                  {STAGE_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" onClick={api.close}>Show results</Button>
        {stageFilter.length > 0 && <Button variant="quiet" full onClick={() => setStageFilter([])}>Clear stage filters</Button>}
      </div>
    </>
  );
}
