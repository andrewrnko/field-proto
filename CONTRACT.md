# GotRot Field — build contract

The prototype of the Got Rot founders' field app. Everything here is binding for
anyone (human or agent) adding a screen.

## What this app is

A phone-first operations app for a rot-repair contractor. Its users are the two
founders (owner + owner/estimator), a coordinator, and crew. It is used standing
in a crawl space, in a truck, and on a customer's porch — one-handed, in gloves,
in bad light, on bad signal.

Branding rule from the client: **the only branded element is the logo mark**.
No company name in headings, no slogan, no brand colour theming. The product is
the brand.

## Source of truth

- Visual system: `GOTROT_DESIGN_SYSTEM.md` v2 (monochrome workspace, soft UI
  surfaces, restrained skeuomorphic depth). Tokens live in `src/styles/tokens.css`.
- Domain model: `src/data/types.ts`. Stage, next action, blocker, payment state
  and schedule state are **five separate fields** — never collapse them.
- Fixtures: `src/data/seed.ts`, deterministic, frozen at `src/data/clock.ts`
  (`NOW` = Thursday 17 Sep 2026, 7:12 am). Never call `Date.now()` or
  `Math.random()` anywhere in the app.

## Non-negotiables

1. **No new hex values.** Use tokens. If you need a colour that does not exist,
   the design is wrong — pick the token that carries the meaning.
2. **One icon family**: `src/ui/Icon.tsx`. Add a path there; never an emoji.
3. **One of each primitive**: Button, Field, Badge, Row, Sheet, Toast, Segmented,
   EmptyState live in `src/ui/`. Reuse them. A second Button is a bug.
4. **44px minimum touch target.** Field use, gloves.
5. **Every list has five states**: loading (skeleton that matches the layout),
   populated, empty ("No X yet" + the action that creates one), no-filter-match
   ("No X match these filters" + Clear filters), and failed ("Couldn't load X" +
   Retry). They are different states with different copy.
6. **Writes go through `commit()`** from `src/data/store.tsx` and show
   Saving… / Saved / Couldn't save. Retry. Never render success before the
   promise resolves.
7. **Money is integer cents**, formatted with `money()`. Right-aligned, tabular.
8. **Destructive or customer-facing actions confirm**, naming the object and the
   consequence — use `useConfirm()`. Anything sent to a customer shows the
   recipient and the document version before it goes.
9. **Motion explains a change.** Springs from `src/lib/motion.ts` only. No
   decorative looping, no spring overshoot on data lists, no entrance animation
   on every row. Respect `prefers-reduced-motion` (handled globally, don't fight it).
10. **Haptics** on state changes that matter: `haptic()` from `src/lib/haptics.ts`.
    Selection = "select", commit = "medium", success = "success", destructive = "warning".

## Interaction kernel (already built — use it, don't rebuild it)

| Need | Use |
| --- | --- |
| Push a detail screen | `useNav().push(key, () => <Thing/>)`; edge-swipe back is free |
| Bottom sheet, any size | `useSheets().present(api => …, { detents: ["auto"] })` |
| Multi-step sheet | `api.push(…)` / `api.pop()` inside the sheet; `<SheetHead api …/>` |
| Big draggable sheet | `detents: [0.5, 0.94]` — drag between them is continuous |
| Scrollable sheet content | put `data-sheet-scroll` on the scroller; drag handoff is automatic |
| Confirm something | `useConfirm()({ title, body, confirmLabel, tone: "danger", onConfirm })` |
| Toast with undo | `useToast()({ text, tone, undo })` |
| Full-screen photos | `<PhotoViewer photos index onClose />` |
| Screen chrome | `<Screen title subtitle actions headerExtra back>` — the large title collapses for you |

## Screenshot hooks

Put `data-shot="<name>"` on anything the verification script needs to tap.
`node scripts/shots.mjs` drives the real browser and **fails on any console
error**. A screen is not done until its shot is clean.

## Definition of done for a screen

- `npm run check` clean (no `any`, no unused).
- `node scripts/shots.mjs <name>` clean, light **and** `--dark`.
- The five list states exist and are reachable.
- Every control does something real against the store, or is not there.
- Nothing on screen is decorative filler: every row answers "what job, what's
  blocking, who owns it, when, what can I do".
