# Mobile reset — audit and system

The first build was a faithful translation of a desktop CRM brief onto a phone:
correct information, wrong instrument. This document is the reset. It is the
governing spec; `CONTRACT.md` still holds for engineering rules.

**Desktop is a workspace. A phone is a decision instrument.**

---

## 1. Audit of what exists

Judged against one question per screen: *what decision is this screen for?*

### Today — WORST OFFENDER
- Objective: know what to do before driving anywhere.
- Currently shows: scope bar, weather card, 8 attention cards (each a 4-row
  panel with nested card + button), a full appointment list, two money stats,
  an unassigned list, a footer. ~14 competing blocks, four levels of nesting.
- Primary info should be: the single most urgent thing, and how many others
  there are.
- Primary action: do that one thing (call, send, re-run).
- Hide: the whole board (a line, then a sheet), money stats (one line), the
  unassigned queue (a line), the weather card (a line attached to the board).
- Card abuse: attention cards are cards inside cards with a button inside.
- Verdict: **rebuild as a single ranked decision, then a quiet queue.**

### Jobs — badge soup
- Objective: find a job and open it.
- Currently: every row carries title, money, stage chip, blocker badge,
  unassigned badge, next action line, owner, relative time — six competing
  weights per row, all boxed in a bordered list.
- Should be: name, one line of context, money, one status signal. Everything
  else on the record.
- Filters and sort already live in a sheet — keep that, drop the chip rail.
- Verdict: **rebuild as a typographic list with grouping, no boxes.**

### Job record — closest to right, still dense
- Three state badges, a money number, an owner line, a blocker, a next action,
  a scope card, a visit card, a findings card, a crew card — nine blocks before
  a decision.
- Should open with: what this job *is* (photo of the property), where it stands
  in one line, and the one action.
- Findings deserve photography, not a text list. Activity belongs behind a tap.
- Verdict: **rebuild with a media hero and progressive sections.**

### Schedule — the timeline is right, the chrome is not
- The timeline is genuinely the hero; keep it.
- The day strip is a raised card inside a raised card; conflicts and unscheduled
  work compete with it.
- Verdict: **keep the timeline composition, strip everything around it, move
  conflict resolution into a sheet.**

### Money — one number is right, the rest is a dashboard
- Hero block is correct in spirit (one dominant number) but sits inside a card
  with two sub-stats and a note, then an attention card with two buttons, then
  a grouped invoice list.
- Verdict: **keep the dominant number, reduce to "what is stuck", sheets for
  the rest.**

### Inbox — nearly right
- Rows are good; the boxed list, the heavy channel tile and the amber "asking"
  pill are three visual systems in one row.
- Verdict: **lighten; the ask line is the row's subtitle, not a badge.**

### Systemic faults
1. Everything is a bordered rectangle. Borders do the work typography should.
2. One spacing value (16) repeated everywhere — no rhythm, no grouping.
3. 12px metadata carrying real meaning.
4. Every screen uses the same template: title → scope bar → list of cards.
5. Colour used decoratively (three status chips in a row on the job record).
6. Actions permanently visible instead of contextual.

---

## 2. The new system

### Surfaces — three levels, almost no borders
| Level | Token | Use |
| --- | --- | --- |
| 0 canvas | `--canvas` | the page. Nothing sits *on* it without purpose |
| 1 raised | `--surface` | objects that can be acted on; soft shadow, no border |
| 2 sheet | `--surface` + `--sheet-shadow` | the current decision, over dimmed context |

A hairline (`--border`) separates rows *inside* one object. It never outlines an
object. If a thing needs an outline to be legible, the spacing is wrong.

### Spacing — a rhythm, not a constant
`4 · 8 · 12 · 20 · 32 · 52 · 80`

- 4–8: inside a line (icon to label)
- 12: between lines of one thought
- 20: between rows of a list
- 32: between a heading and its content
- 52: between sections
- 80: above a section that starts a new idea, and under a hero

Screen gutter: 22px. Hero blocks may go full bleed.

### Type — comfortable, weighted, fewer sizes
| Role | Size / line | Weight |
| --- | --- | --- |
| Hero statement | 32 / 38 | 640, −1.0 tracking |
| Big number | 44 / 46 | 660, −1.8, tabular |
| Page title | 30 / 36 | 640, −0.8 |
| Section | 20 / 26 | 620, −0.4 |
| Object title | 17 / 23 | 580, −0.2 |
| Body | 16 / 23 | 430 |
| Meta | 13.5 / 19 | 500, secondary colour |

10–12px is gone. Uppercase micro-labels are used once per screen at most.

### Colour — one accent, semantics only
- Ink and surfaces carry the design. `--action` (near-black) is the only
  "brand" colour and belongs to primary actions.
- Amber = something is blocked. Red = overdue or failed. Green = settled.
  Blue = a document object. Nothing else is coloured, ever.
- A status is usually a **word plus a dot**, not a filled pill. Filled pills are
  reserved for states that need interpretation at a glance.

### Depth
Shadow communicates layer, not decoration:
- raised object: `0 1px 2px rgb(20 20 30 / 4%), 0 8px 24px -14px rgb(20 20 30 / 18%)`
- lifted (pressed, dragged, selected): the same, doubled in blur and offset
- sheet: the existing `--sheet-shadow` over a 32% scrim and a scaled-back root

### Controls
- Primary action: 56px, pill, full width, one per screen.
- Secondary: 48px, quiet surface, no border.
- Row tap target: 64px minimum with 20px vertical rhythm.
- Icon button: 44px hit area, 22px glyph, no circle unless it floats.

### Composition — each screen gets its own
| Screen | Hero | Then | Everything else |
| --- | --- | --- | --- |
| Today | the one thing that needs you, with its action | a quiet ranked queue | board / money / unassigned as one line each, opening sheets |
| Jobs | nothing — the list is the screen | grouped typographic rows | filters, sort, search in sheets |
| Job record | property photograph + identity | state in one line + the action | scope, findings strip, money line, activity behind taps |
| Schedule | the timeline | the day strip above it | conflicts, unscheduled, detail in sheets |
| Money | one enormous number | what is stuck | invoices, payments, estimates in sheets |
| Inbox | nothing — the list is the screen | name / ask / time rows | thread is a screen; templates and actions in sheets |

### Interaction
- The sheet is the default surface for a decision. The context behind it stays
  visible, dimmed and scaled back.
- Actions are contextual: one visible action per object, the rest behind
  long-press, swipe, or the overflow sheet.
- Motion: 150–250ms for micro states, spring for anything spatial. Motion
  answers "what just happened" and nothing else.

### The density test, applied to every screen
Remove half of what is visible. If the primary task still completes, the half
stays removed. Repeat until removing more breaks the task.
