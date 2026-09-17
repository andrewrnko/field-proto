# The operating environment

Not an app for a rot company. The environment Got Rot runs inside.

This document replaces the screen-first thinking that produced the current
build. `MOBILE_V2.md` stays true as visual law; this one governs what the
software *is*.

---

## 0. What is wrong with what exists

The current app is competent and dead. The diagnosis, honestly:

| Symptom | Root cause |
| --- | --- |
| Five tabs named Today / Jobs / Schedule / Money / Inbox | **The database schema became the navigation.** Those are tables, not moments in a person's day. |
| Every screen opens with a title and a list | One template, repeated. The app has no idea what time it is, who is holding it, or what they are in the middle of. |
| The same app for the owner, the estimator and the carpenter | No role lens. A carpenter in a crawl space is shown an invoice ledger. |
| Tasks rendered as rows with a chevron | A $4,850 change order, a call to a homeowner, and a photo to shoot are all "a row". Different things, same clothes. |
| Information is wide, not deep | You see a lot at level 0 and there is almost nothing underneath. Tap a name and you get… a page with the same facts. |
| Nothing anticipates | The app never says "you are here", "you are behind", "this is unusual". It waits to be asked. |
| Transitions are slides | Objects do not come from anywhere. Nothing morphs. Nothing remembers where it was. |
| Creation is a form | `+` opens a list that opens a form that saves and navigates away. |

Everything below is the correction.

---

## 1. The people and their days

Five lenses on one system. The lens is chosen by who signs in, and the *content*
by what time it is and what is happening.

### Marcus — owner/operator
- **05:50** in the truck. Wants: is the day covered, is anyone stuck, did money land.
- **07:10** first coffee. Wants: the one decision that is blocking a crew.
- **11:30** between calls. Wants: is the pace right for the month; who is producing.
- **16:00** wants: what happened today, what closes tomorrow, what needs a signature.
- Never wants: a list of every job.

### Dre — owner/estimator
- **07:00** who has not been called, what estimate is rotting, what is worth chasing.
- **10:00** standing on a porch: this property, this scope, the price, send it.
- **17:00** what came back today; the one that went quiet for six days.

### Tino — lead carpenter
- **06:20** where am I, what is the scope, what am I missing, who is with me.
- **all day** found something → photograph it → keep working. Nothing else.
- **15:40** close the day: hours, what got done, what stops tomorrow.

### Bea — coordinator
- unassigned work, schedule conflicts, customers waiting on a reply, deposits.

### The media operator (Magnetic, filming Got Rot)
- **06:30** which jobsite, what is the objective, which formats, what is new.
- **on site** capture progress, references, what remains.
- **after** what performed, what to shoot more of.

This last lens is not decoration. Got Rot's pipeline runs on its own jobsite
footage; a finding photographed in a crawl space becomes a reel that produces a
lead that becomes a job. **The system closes that loop, and the loop is the
product's best argument.**

---

## 2. The objects

Not pages. Objects, each of which can be expanded to five depths.

```
Person ── Crew ── Shift ── Hours
Customer ── Property ── Job ── Finding ── Photo ── Reel ── Lead
                         │        └── Change order
                         ├── Estimate ── Invoice ── Payment
                         ├── Appointment
                         ├── Material
                         └── Callback
Shoot ── Format ── Capture
Conversation ── Message ── Call
```

Every object answers the same five questions at increasing depth:

| Depth | The question | The surface |
| --- | --- | --- |
| **L0 — Glance** | Does this need me right now? | a line, a chip, a badge on Now |
| **L1 — Context** | What is it, in one breath? | an expanded object: identity + state + one action |
| **L2 — Detail** | Let me understand it. | a sheet dragged to its second detent |
| **L3 — Operate** | Change it. | inline controls inside that sheet; a pushed flow if multi-step |
| **L4 — System** | Show me everything behind it. | a full screen: history, money, related objects |

**Rule:** the user chooses the depth. Nothing at L0 may require L2 to be
understood, and nothing at L3 may be reachable only by memory.

Worked example, the one that proves the model:

```
Now → "Tino found something at the Halvorsens"      L0
   → the finding, with the photo and the severity   L1
   → measurements, moisture, where it sits in scope L2
   → add it to a change order, price it, send it    L3
   → the whole job: hours, margin, the reel that
     came from this same crawl space, the lead it
     produced last month                            L4
```

---

## 3. Navigation: the Deck

**The tab bar is removed.** Five tabs named after tables is the architecture
leaking. In its place:

1. **Now** — the only home. It reorganises itself by role, time and state.
2. **The Deck** — drag up from the bottom bar (or tap it) and the business rises
   over Now as a translucent surface: People, Jobs, Schedule, Money, Inbox,
   Media, Settings. Lateral movement lives here, out of the way, one thumb-drag
   from anywhere. It is a *drawer of the system*, not a permanent menu.
3. **Command** — the same bar holds search. Type a name, a number, an invoice, a
   verb ("new change order", "call Dana"). Results are objects, not links.
4. **Descent** — everything else is reached by opening an object and going
   deeper. Objects link to objects; the graph is walked, never displayed.

Back is always spatial: a surface returns to the thing it came from.

---

## 4. The interaction language

| Gesture | Meaning | Feedback |
| --- | --- | --- |
| Tap an object | open it at L1 | light haptic, the object compresses 1.5% then morphs into the surface |
| Drag the surface up | descend to L2/L3 | continuous; the content behind scales back and dims |
| Drag down / fling | ascend; release past the line dismisses | rubber band, velocity projected |
| Long-press an object | its three most likely actions, from the object | medium haptic, menu scales from the point touched |
| Swipe a row | the one action that row usually needs | select haptic at the threshold |
| Drag the bottom bar up | the Deck | light haptic on arm, medium on open |
| Press and hold a number | what it is made of | light haptic, the number expands into its parts |

**Haptic language** (already wired in `lib/haptics.ts`, now given meaning):

- `select` — changing a lens, a filter, a chip, a detent
- `light` — opening a surface, revealing, arming a gesture
- `medium` — a commitment: clocking in, sending, assigning, creating
- `success` — money settled, approved, sent, shoot complete
- `warning` — destructive confirmation, a decline, a conflict appearing
- `error` — a wrong PIN, a failed write

Never on scroll. Never twice for one event.

**Motion contract:** every transition answers *where did this come from*. A card
that becomes a sheet keeps its geometry (`layoutId`). A sheet that dismisses
returns to its origin. Nothing fades in from nowhere.

---

## 5. What Now looks like

Not a dashboard. A sentence, an object, and a short list of what is unusual.

```
Thursday · 7:12

Morning, Marcus.
Three crews out. Rain until eleven.

┌─────────────────────────────────────┐
│  [the house]                        │   ← the live object: the one thing
│  Jamal Whitaker · deposit declined  │     that decides the next hour
│  Crew pencilled Friday              │
│  [ Re-run the deposit ]             │
└─────────────────────────────────────┘

NEEDS YOU          3
  Priya, never called          1d 16h
  EST-1152, gone quiet            6d
  Jesse never clocked out    yesterday

ON THE GROUND
  [Tino ●] [Jesse ●] 6:20 · Halvorsen crawl
  [Marcus ●] 8:00 · Trimble water damage

MONEY
  $19,314 out there · $6.4k overdue
```

When nothing is wrong, Now is four lines and a lot of air. **The absence of
noise is the feature.** It never manufactures metrics to fill space.

Role changes it entirely: Tino's Now is the address, the scope, the crew, and a
camera. The media operator's Now is the shoot, the objective, and the formats
left to capture.

---

## 6. Three slices, built to the bone

Everything else is restyled only after these three are right.

**Slice 1 — the morning.** Open → understand the day → open the one object →
act → return. Includes the Deck and the role lens.

**Slice 2 — the descent.** A signal on Now → the department → the person → their
activity → the underlying object → an action. Proves L0→L4 in one thumb.

**Slice 3 — creation.** Hold `+` → a palette expands from the button → pick →
the same surface becomes the creation interface → commit → confirmation that
morphs into the created object → back where you started. No routes, no forms
that navigate away.

---

## 7. What each existing feature becomes

| Today | Feature | Now belongs to |
| --- | --- | --- |
| Today tab | the ranked queue | **Now**, as "Needs you" — three lines, no cards |
| Jobs tab | the list | the **Deck → Jobs**, and inside customer/property objects |
| Job record | tabs | one object, depths L1–L4; tabs deleted |
| Schedule tab | timeline | **Now → On the ground** (today) and Deck → Schedule (the week) |
| Money tab | invoices | **Now → Money** one line; the ledger at L4 |
| Inbox tab | threads | **Now → Needs you** when a reply is owed; Deck → Inbox otherwise |
| Speed to lead | card | the live object on Now when it is the most urgent thing |
| Close out | flow | Tino's Now after 15:00, and nowhere else |
| Hours/cost | section | L2 of a job; the *anomaly* (never clocked out) is L0 |
| Materials | section | L2 of a job; a late material is L0 on the day it blocks |
| Moisture | chart | L2 of a job; a rising reading is L0 |
| What's worth selling | sheet | L4 of the business, reached from Money |
| Findings | strip | objects that link a job to a photo to a reel |
| Photos marked for the reel | flag | the **Media** lens: shoot → format → capture |

Nothing is deleted. Things stop being permanently visible.


---

## 8. The visual devices

The architecture was right and the surface was grey. These are the concrete
devices that carry colour and character, each doing a job:

| Device | Where | What it does |
| --- | --- | --- |
| **Glossy object tiles** (`ui/Obj.tsx`) | every signal, material, callback, invoice, conversation, Deck cell | colour says *what kind of thing this is*, fixed per kind — money is always emerald, moisture always cyan, blocked always amber |
| **Baked maps** (`ui/MapView.tsx`, `scripts/maps.mjs`) | the job record, the crew's card | a real map of the real address, composited from OpenStreetMap tiles at build time so it works with no key and no signal; the pin pulses green when someone is standing on it |
| **Time-of-day sky** | Now | dawn / day / dusk wash behind the greeting — the only decorative surface, and it is telling you the hour |
| **Meaningful action colour** | the one primary per screen | calling is blue, money green, capture teal; everything else stays near-black |
| **Success mark** (`ui/Success.tsx`) | payment settled, estimate sent, lead created, day closed | a glossy badge that springs in once and glows once. Never loops |
| **Heatmap** (`ui/Heatmap.tsx`) | People | thirteen weeks of clocked hours, one hue, five steps, every cell tappable for its real number |
| **Arrival strip** | the crew's card | "On site in 18 minutes", or the clock that is already running |
| **Pastel tags** | job rows, inbox asks, material states | a chip with a glyph, in the hue of its meaning |
| **Property photography** | Now, the record, the board, media | their own jobsite frames, so a founder recognises the house before reading the name |
