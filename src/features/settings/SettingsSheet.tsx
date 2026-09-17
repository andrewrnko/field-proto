/* Account and settings.
 *
 * Only the settings a founder actually changes in the field. Anything that
 * belongs to the office lives on the desktop product, not here. */
import { useState } from "react";
import { motion } from "motion/react";
import { Icon, type IconName } from "../../ui/Icon";
import { Avatar, Badge, Button, Pressable, Toggle, useToast } from "../../ui/primitives";
import { SheetHead, useConfirm } from "../../ui/domain";
import type { SheetApi } from "../../ui/Sheet";
import { useDB, useEntities } from "../../data/store";
import { useTheme } from "../../shell/theme";
import { setHaptics, setHapticAudio, haptic } from "../../lib/haptics";
import { SPRING } from "../../lib/motion";
import "./settings.css";

export function SettingsSheet({ api }: { api: SheetApi }) {
  const { db } = useDB();
  const e = useEntities();
  const me = e.person(db.me)!;
  const toast = useToast();
  const confirm = useConfirm();
  const { mode, setMode } = useTheme();
  const [hapticsOn, setHapticsOn] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  const queued = db.photos.filter((p) => p.syncState !== "synced").length;

  return (
    <>
      <SheetHead api={api} title="Account" subtitle="Settings" icon="settings" />
      <div className="sheet-body scroll" data-sheet-scroll style={{ maxHeight: 560 }}>
        <div className="set-profile">
          <Avatar name={me.name} size={48} tone={me.avatarTone} />
          <div className="grow">
            <p className="t-row">{me.name}</p>
            <p className="t-meta">Owner · signed in on this phone</p>
          </div>
          <span className="t-meta">Online</span>
        </div>

        <p className="t-meta sec-title" style={{ padding: "6px 2px" }}>Appearance</p>
        <div className="theme-grid">
          {([
            { value: "light", label: "Day", cls: "sw-light" },
            { value: "auto", label: "Auto", cls: "sw-auto" },
            { value: "dark", label: "Night", cls: "sw-dark" },
          ] as const).map((t) => (
            <Pressable
              key={t.value}
              className={`theme-card${mode === t.value ? " is-on" : ""}`}
              onClick={() => { haptic("select"); setMode(t.value); }}
              aria-label={`${t.label} appearance`}
            >
              <span className={`theme-swatch ${t.cls}`} />
              <span className="theme-label">{t.label}</span>
            </Pressable>
          ))}
        </div>
        <p className="t-meta" style={{ padding: "8px 2px 0" }}>
          Night is what the crew uses under a house. Auto follows the phone.
        </p>

        <p className="t-meta sec-title" style={{ padding: "18px 2px 6px" }}>Feedback</p>
        <div className="list">
          <SettingRow icon="phone" title="Haptics" note="A tap when something actually changed">
            <Toggle checked={hapticsOn} label="Haptics" onChange={(v) => { setHapticsOn(v); setHaptics(v); }} />
          </SettingRow>
          <SettingRow icon="mic" title="Tap sounds" note="Off by default — most jobsites are loud">
            <Toggle checked={soundOn} label="Tap sounds" onChange={(v) => { setSoundOn(v); setHapticAudio(v); }} />
          </SettingRow>
        </div>

        <p className="t-meta sec-title" style={{ padding: "18px 2px 6px" }}>Alerts</p>
        <div className="list">
          <Pressable className="row" onClick={() => api.push((a) => <NotificationPrimer api={a} />)}>
            <span className="row-lead action-icon"><Icon name="bell" size={19} /></span>
            <span className="row-body">
              <span className="t-row">What wakes your phone</span>
              <span className="t-meta">Structural findings, payments, customer replies</span>
            </span>
            <Icon name="chevron" size={17} className="dimmer" />
          </Pressable>
          <Pressable className="row" onClick={() => api.push((a) => <LocationPrimer api={a} />)}>
            <span className="row-lead action-icon"><Icon name="pin" size={19} /></span>
            <span className="row-body">
              <span className="t-row">Location</span>
              <span className="t-meta">Drive times and arrival windows</span>
            </span>
            <Badge tone="warning">Not allowed</Badge>
          </Pressable>
        </div>

        <p className="t-meta sec-title" style={{ padding: "18px 2px 6px" }}>This device</p>
        <div className="list">
          <SettingRow icon="refresh" title="Waiting to sync" note={queued ? `${queued} photos saved here, no signal yet` : "Everything is up to date"}>
            {queued > 0
              ? <Button size="sm" variant="secondary" onClick={() => toast({ text: "Retrying upload…" })}>Retry</Button>
              : <Icon name="check" size={18} className="tone-success" />}
          </SettingRow>
          <SettingRow icon="shield" title="Prototype data" note="Fixtures only — nothing here reaches a customer" />
        </div>

        <div style={{ padding: "18px 0 6px" }}>
          <Button
            variant="destructive" full
            onClick={() => confirm({
              title: "Sign out of this phone?",
              body: `${queued} photos are still saved on this device and have not synced. Signing out deletes them and they cannot be recovered.`,
              confirmLabel: "Sign out",
              tone: "danger",
              icon: "lock",
              onConfirm: () => { toast({ text: "Prototype — sign out is disabled", tone: "danger" }); },
            })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </>
  );
}

function SettingRow({ icon, title, note, children }: { icon: IconName; title: string; note: string; children?: React.ReactNode }) {
  return (
    <div className="row">
      <span className="row-lead action-icon"><Icon name={icon} size={19} /></span>
      <span className="row-body">
        <span className="t-row">{title}</span>
        <span className="t-meta">{note}</span>
      </span>
      <span className="row-trail">{children}</span>
    </div>
  );
}

/* --------------------- permission primers --------------------- *
 * Asked in context, with the reason first and the OS prompt second —
 * never a cold system dialog on launch. */

function NotificationPrimer({ api }: { api: SheetApi }) {
  const toast = useToast();
  const [on, setOn] = useState<Record<string, boolean>>({ structural: true, payment: true, reply: true, digest: false });
  const items: Array<{ key: string; icon: IconName; cls: string; title: string; note: string }> = [
    { key: "structural", icon: "alert", cls: "pi-alert", title: "Structural findings", note: "A crew found load-bearing damage" },
    { key: "payment", icon: "money", cls: "pi-money", title: "Money in", note: "A deposit or invoice clears" },
    { key: "reply", icon: "message", cls: "pi-msg", title: "Customer replies", note: "Someone answers on a job you own" },
    { key: "digest", icon: "today", cls: "pi-msg", title: "Evening recap", note: "One summary at 6 pm instead of pings" },
  ];
  return (
    <>
      <SheetHead api={api} title="What wakes your phone" icon="bell" />
      <div className="sheet-body primer">
        <p className="t-body dim">Four things are worth a buzz on a jobsite. Everything else waits for the recap.</p>
        <div className="primer-list">
          {items.map((it) => (
            <div key={it.key} className="primer-row">
              <span className={`primer-icon ${it.cls}`}><Icon name={it.icon} size={16} /></span>
              <span className="grow">
                <span className="t-body block">{it.title}</span>
                <span className="t-meta">{it.note}</span>
              </span>
              <Toggle checked={on[it.key]} label={it.title} onChange={(v) => setOn((s) => ({ ...s, [it.key]: v }))} />
            </div>
          ))}
        </div>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" onClick={() => { haptic("success"); toast({ text: "Alerts updated", tone: "success" }); api.close(); }}>
          Turn these on
        </Button>
        <Button variant="quiet" full onClick={api.close}>Not now</Button>
      </div>
    </>
  );
}

function LocationPrimer({ api }: { api: SheetApi }) {
  const toast = useToast();
  return (
    <>
      <SheetHead api={api} title="Location" icon="pin" />
      <div className="sheet-body primer">
        <div className="primer-art" aria-hidden>
          <motion.div className="primer-card" style={{ top: 30 }} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.sheet}>
            <span className="primer-icon pi-msg"><Icon name="truck" size={16} /></span>
            <span>
              <span className="t-body block" style={{ fontSize: 13, fontWeight: 600 }}>Tino is 22 min out</span>
              <span className="t-meta">Arrival window sent to the Halvorsens</span>
            </span>
          </motion.div>
          <motion.div className="primer-card" style={{ top: 86 }} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 0.8 }} transition={{ ...SPRING.sheet, delay: 0.06 }}>
            <span className="primer-icon pi-money"><Icon name="clock" size={16} /></span>
            <span>
              <span className="t-body block" style={{ fontSize: 13, fontWeight: 600 }}>Drive time between jobs</span>
              <span className="t-meta">Stops the 8:00 and 8:30 double-book</span>
            </span>
          </motion.div>
        </div>
        <h2 className="t-section">Used for drive times</h2>
        <p className="t-body dim">
          While the app is open, so the schedule can warn you about a booking you can't physically reach and text a real arrival window.
          It is never shared with customers as a live position.
        </p>
      </div>
      <div className="sheet-foot">
        <Button full size="lg" icon="pin" onClick={() => { haptic("medium"); toast({ text: "The system prompt appears here on a real device" }); api.close(); }}>
          Allow while using the app
        </Button>
        <Button variant="quiet" full onClick={api.close}>Not now</Button>
      </div>
    </>
  );
}
