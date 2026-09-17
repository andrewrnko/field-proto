# GotRot Field

A working prototype of the phone app for the Got Rot founders. Not a clickable
mockup: real state, real gestures, real failure states. Fixture data only —
nothing here touches a customer.

```bash
npm install
npm run dev          # http://127.0.0.1:4825
npm run check        # typecheck
npm run shots        # real-browser screenshots, fails on any console error
```

On a desktop browser it renders inside a phone frame. Open the same URL on a
phone (same wifi) and the frame drops away — it runs full screen with safe-area
insets, so you can hold the actual thing.

## What it does

There is no tab bar. There is **Now**, and there is everything else.

| Surface | What it is |
| --- | --- |
| **Now** | The only home. Rebuilt on every open from who is holding the phone, what time it is, and what is actually unusual. Nothing is manufactured to fill space. |
| **The Deck** | Drag up the bottom bar and the business rises behind it: Jobs, Schedule, Money, Inbox, People, Media. Lateral movement, out of the way. |
| **Command** | The search button on the bar. A name, an address, an invoice number, or what you want to make. Results are objects, not links. |
| **Create** | The `+`. A palette expands from it and becomes the thing being made; committing morphs into a confirmation, not a new page. |
| **Descent** | Everything else is reached by opening an object and going deeper. The graph gets walked, never displayed. |

**Five lenses, one system.** Switch in the Deck. Marcus sees the decision blocking
a crew; Tino sees an address, a scope and a camera; Dre sees who has not been
called; the media operator sees which site, what to capture, and what is working.
See `EXPERIENCE.md` for the reasoning.

### The operating layer

The first build modelled the sales pipeline and stopped there. These are the
things that decide whether a rot job actually made money:

- **Hours against the estimate.** Crews clock in on site; the job record shows
  hours clocked against hours priced and the money that has gone with them.
  Aimee's deck is 14 h past its estimate — $952 out of the $9,490 of margin it
  was sold with, visible while the job is still open instead of at month end.
- **Materials and will-call.** What has to land before work continues, who is
  picking it up, and what is late. Marking a will-call picked up clears the
  job's blocker.
- **Moisture log.** Every reading on the job plotted against the 20% decay line,
  so "is it fixed" is a measurement, not an opinion — with the re-check booked
  against its baseline.
- **Coming back.** Warranty visits, moisture re-checks and the review ask, each
  with a due date. This is where repeat work and local ranking come from.
- **What's worth selling** (Money → the third line). Margin by the four jobs they
  actually sell, computed from their own estimates and clocked hours: crawl
  spaces price at 49% and win every bid; decks look busy and burn 25% more hours
  than they are priced with.

Flows worth opening:

- **Finding capture** (job → ⋮ → Log a finding). Location, severity, a draggable
  moisture meter, photos, review. Works offline and says so.
- **Change order** (job → ⋮ → Raise a change order). Starts from findings the
  crew already logged, prices them, states the schedule impact, sends for a
  recorded decision.
- **Estimate** (job → Money → the estimate). Two views of one document:
  *Internal* with cost and margin, *What they see* rendered as paper. Sending
  shows the recipient and the exact copy first.
- **New lead** (Today → +). Two taps and a name, because it gets typed while the
  customer is still on the phone.

## How it is built

- React 19 + Vite + TypeScript. `motion` for springs. No UI kit, no CSS
  framework — the design system is the CSS.
- `src/styles/tokens.css` is the whole palette and geometry. No component
  contains a hex value.
- `src/ui/` is the interaction kernel: a sheet engine with detents, velocity
  projection, rubber banding and scroll/drag handoff; a nav stack with an
  interactive edge-swipe back; pull to refresh; a photo viewer; one icon family.
- `src/data/` is the domain: `types.ts` keeps stage, next action, blocker,
  payment state and schedule state as five separate fields; `seed.ts` is
  hand-authored, referentially complete fixtures frozen at
  Thursday 17 September 2026, 7:12 am; `store.tsx` makes every write go through
  a `commit()` that can fail, so nothing claims "saved" before it is.
- `src/features/<area>/` owns its screens and its own CSS file.

Photos are frames from Got Rot's own published reels and raw cards, cropped
above the burned-in captions. No stock photography.

## What it is not

No backend, no auth, no real integrations. Data resets on reload. Every number
is a fixture. The client's branding is deliberately limited to the logo mark on
the customer-facing document.

See `CONTRACT.md` for the rules anyone adding a screen has to follow.
