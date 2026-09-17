/* The command layer.
 *
 * The escape hatch for a system that is too big to memorise. Type a name, a
 * number, an address, or a verb. What comes back are objects and actions, not
 * links — selecting one opens the thing, or does the thing. */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "../ui/Icon";
import { Avatar, Pressable } from "../ui/primitives";
import { Obj, type ObjHue, type ObjName } from "../ui/Obj";
import { Tag, STAGE_HUE } from "../ui/domain";
import type { SheetApi } from "../ui/Sheet";
import { useNav } from "../ui/Nav";
import { useDB, useEntities } from "../data/store";
import { compactMoney, phone } from "../lib/format";
import { SPRING } from "../lib/motion";
import { haptic } from "../lib/haptics";
import { STAGE_LABEL } from "../data/types";
import { JobDetail } from "../features/jobs/JobDetail";
import { CustomerScreen } from "../features/jobs/CustomerScreen";
import { PersonScreen } from "../features/people/PersonScreen";
import "./command.css";

type Hit = {
  key: string;
  kind: "job" | "customer" | "person" | "invoice" | "reel" | "verb";
  title: string;
  note: string;
  obj?: ObjName; hue?: ObjHue;
  avatar?: string;
  tag?: { text: string; hue: Parameters<typeof Tag>[0]["hue"] };
  run: () => void;
};

const VERBS: Array<{ match: RegExp; title: string; note: string; obj: ObjName; hue: ObjHue }> = [
  { match: /^(new |add )?(lead|customer)/i, title: "New lead", note: "Two taps and a name", obj: "clipboard", hue: "indigo" },
  { match: /^(new |raise )?change ?order/i, title: "Raise a change order", note: "From findings on a job", obj: "warning", hue: "amber" },
  { match: /^(take |new )?payment/i, title: "Take a payment", note: "Card, bank, check or cash", obj: "coins", hue: "emerald" },
  { match: /^(log |new )?finding/i, title: "Log a finding", note: "Photo, location, severity", obj: "drop", hue: "cyan" },
];

export function CommandSheet({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const e = useEntities();
  const { push } = useNav();
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 120); return () => clearTimeout(t); }, []);

  const open = (key: string, node: React.ReactNode) => { api.close(); push(key, () => node); };

  const hits: Hit[] = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return [];
    const out: Hit[] = [];

    for (const v of VERBS) {
      if (v.match.test(s)) out.push({
        key: `verb-${v.title}`, kind: "verb", title: v.title, note: v.note, obj: v.obj, hue: v.hue,
        run: () => { haptic("medium"); api.close(); },
      });
    }
    for (const j of db.jobs) {
      const c = e.customer(j.customerId), p = e.property(j.propertyId);
      const hay = `${c.name} ${j.title} ${p.address} ${p.city} ${STAGE_LABEL[j.stage]}`.toLowerCase();
      if (hay.includes(s)) out.push({
        key: `job-${j.id}`, kind: "job", title: c.name, note: `${j.title} · ${compactMoney(j.valueCents)}`,
        obj: "house", hue: "blue", tag: { text: STAGE_LABEL[j.stage], hue: STAGE_HUE[j.stage] },
        run: () => open(`job-${j.id}`, <JobDetail jobId={j.id} />),
      });
    }
    for (const c of db.customers) {
      if (`${c.name} ${c.phone}`.toLowerCase().includes(s)) out.push({
        key: `cust-${c.id}`, kind: "customer", title: c.name, note: phone(c.phone),
        obj: "bubble", hue: "violet",
        run: () => open(`cust-${c.id}`, <CustomerScreen customerId={c.id} />),
      });
    }
    for (const p of db.people) {
      if (p.name.toLowerCase().includes(s)) out.push({
        key: `p-${p.id}`, kind: "person", title: p.name, note: p.role.replace("_", " "),
        avatar: p.name,
        run: () => open(`person-${p.id}`, <PersonScreen personId={p.id} />),
      });
    }
    for (const inv of db.invoices) {
      if (inv.number.toLowerCase().includes(s)) {
        const job = e.job(inv.jobId);
        out.push({
          key: `inv-${inv.id}`, kind: "invoice", title: inv.number,
          note: `${e.customer(job.customerId).name} · ${compactMoney(inv.amountCents - inv.paidCents)} open`,
          obj: "coins", hue: "emerald",
          run: () => open(`job-${job.id}`, <JobDetail jobId={job.id} />),
        });
      }
    }
    for (const r of db.reels) {
      if (`${r.title} ${r.format}`.toLowerCase().includes(s)) out.push({
        key: `reel-${r.id}`, kind: "reel", title: r.title, note: `${r.format} · ${r.leads} leads`,
        obj: "camera", hue: "teal",
        run: () => { haptic("light"); api.close(); },
      });
    }
    return out.slice(0, 14);
  }, [query, db, e]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = ["Jamal", "INV-2291", "new lead", "Tino", "cedar"];

  return (
    <>
      <div className="cmd-field">
        <Icon name="search" size={20} className="dimmer" />
        <input
          ref={inputRef} value={q} onChange={(ev) => setQ(ev.target.value)}
          placeholder="A name, an address, an invoice, or what you want to do"
          aria-label="Search everything"
        />
        {q && (
          <Pressable className="round round-tinted" style={{ width: 30, height: 30 }} aria-label="Clear" onClick={() => setQ("")}>
            <Icon name="close" size={15} strokeWidth={2.4} />
          </Pressable>
        )}
      </div>

      <div className="sheet-body scroll" data-sheet-scroll>
        {!query.trim() ? (
          <div className="cmd-empty">
            <p className="t-body dim">Everything in the business is one line away.</p>
            <div className="chip-row is-wrap" style={{ paddingTop: 4 }}>
              {suggestions.map((sug) => (
                <button key={sug} className="chip" onClick={() => { haptic("select"); setQ(sug); }}>{sug}</button>
              ))}
            </div>
          </div>
        ) : hits.length === 0 ? (
          <div className="cmd-empty">
            <p className="t-section">Nothing matches "{query.trim()}"</p>
            <p className="t-body dim">Try a customer, a street, an invoice number, or what you want to make.</p>
          </div>
        ) : (
          hits.map((h, i) => (
            <motion.div key={h.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.snap, delay: Math.min(i, 6) * 0.015 }}>
              <Pressable className="cmd-hit" onClick={h.run}>
                {h.avatar
                  ? <Avatar name={h.avatar} size={42} tone={2} />
                  : <Obj name={h.obj ?? "house"} hue={h.hue ?? "blue"} size={42} />}
                <span className="grow">
                  <span className="cmd-title">{h.title}</span>
                  <span className="cmd-note">{h.note}</span>
                </span>
                {h.tag && <Tag hue={h.tag.hue}>{h.tag.text}</Tag>}
                <Icon name={h.kind === "verb" ? "plus" : "chevron"} size={18} className="dimmer" />
              </Pressable>
            </motion.div>
          ))
        )}
      </div>
    </>
  );
}
