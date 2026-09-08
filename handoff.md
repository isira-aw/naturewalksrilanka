# Handoff — custom-tour layout & responsive optimisation

## Goal

Improve the UI/UX of `/[locale]/custom-tour` without changing any functionality.

The specific complaint: on desktop the wizard left large unused margins on the left and
right. Every step except Interests and the AI assistant was clamped to `max-w-3xl` and
left-aligned beside the progress rail, so on a 1440–1920px screen roughly half the width
sat empty. The brief was to use the full screen intelligently on desktop and make sure
nothing is cramped, clipped or hard to reach on tablet and mobile.

Explicitly out of scope: the questions, steps, fields, customisation logic, validation,
reducer state, API behaviour, navigation semantics and all copy. This is an optimisation
of the existing journey, not a new custom-tour system. No other page was touched.

## Current state

Done and verified. `tsc --noEmit` and `eslint` are clean on the changed paths.

The full 7-step flow was walked against the dev server on `localhost:3000` at three
viewports — 1280×720, 834×1112 and 375×812 — including one live AI itinerary generation
with the Leaflet map. `document.documentElement.scrollWidth === window.innerWidth` at all
three sizes (no horizontal overflow), no clipped content, and Back/Continue reachable
without hunting on every step.

## Active files

| File | Role |
| --- | --- |
| `app/[locale]/custom-tour/page.tsx` | Page shell: hero, section ground, container width |
| `components/custom-tour/WizardShell.tsx` | Reducer, validation, step routing, layout shell, nav actions |
| `components/custom-tour/StepProgress.tsx` | Desktop rail + mobile/tablet progress bar |
| `components/custom-tour/SuggestionsPanel.tsx` | Journey-idea cards on the Interests step |
| `components/custom-tour/steps/TravelersStep.tsx` | Step 1 |
| `components/custom-tour/steps/DatesStep.tsx` | Step 2 (unchanged — the calendar simply fills the wider card) |
| `components/custom-tour/steps/InterestsStep.tsx` | Step 3 |
| `components/custom-tour/steps/AccommodationStep.tsx` | Step 4 |
| `components/custom-tour/steps/AIAssistantStep.tsx` | Step 5 (feature-flagged by `isAiAssistantEnabled()`) |
| `components/custom-tour/steps/ContactStep.tsx` | Step 6 |
| `components/custom-tour/steps/ReviewStep.tsx` | Step 7 + WhatsApp hand-off |
| `content/<locale>/ui.json` | Wizard copy — **not** modified, but see Next steps |

`components/custom-tour/DateRangeCalendar.tsx`, `ExperienceDialog.tsx`,
`steps/StepHeading.tsx`, `steps/ai-assistant/*` and `components/ui/*` were read but not
modified.

## Changes made

**Page shell** — container widened from `max-w-7xl` to `max-w-[92rem]` with `xl:px-12`;
vertical rhythm tightened (`py-16 md:py-24` → `py-10 md:py-14 lg:py-16`) so the form sits
closer to the fold; section ground moved to `bg-stone/25` so the wizard reads as a card on
a page rather than as loose text on a flat field.

**Wizard shell** — the step panel is now a bordered card that fills the content column,
and the per-step `max-w-3xl` clamp is gone: each step lays itself out across the full
width. The rail column widened (`13.5rem` → `15rem`, `17rem` at xl) and carries the
"Step n of 7" label using the existing `stepOf` translation. The mobile/tablet progress bar
is pinned under the site header and bleeds to the viewport edge at every breakpoint.
Desktop Back/Continue moved onto the card's own footer line, spanning its full width
instead of stopping at 48rem.

**Mobile action bar bug** — the docked bar used `-mx-6` inside a `px-4` container, which
pushed it past the viewport and caused horizontal scroll on phones. Now `-mx-4`/`px-4`
with `pb-[max(0.75rem,env(safe-area-inset-bottom))]`. On the Review step the bar is no
longer docked, so the WhatsApp button owns the bottom of the screen.

**Progress rail** — markers connected by one continuous vertical line, wrapped in a
labelled `<nav>`, larger hit areas. Click-back-to-a-completed-step behaviour unchanged.

**Per-step layouts** (all content preserved, only arrangement changed):

- Travelers: counter and quick-pick chips side by side from `sm` up.
- Interests: category chips run the full width; matching ideas sit below in a 1/2/3-column
  grid. `SuggestionsPanel` lost its nested `max-h` scroll box (at most 8 ideas ever match,
  and a scroll area inside a scrolling page hid them); cards are equal-height with
  bottom-aligned actions.
- Accommodation and Contact: the optional free-text box moves into a second column at
  `lg`, so each step fits one screen instead of stacking into a tall ribbon.
- Review: summary table beside a sticky send action, instead of the action sitting below a
  table long enough to push it off-screen.
- AI assistant: map column re-proportioned (`20rem`, `26rem` at xl) and the "other
  options" grid capped at two columns — at three, cards beside the map rendered ~160px
  wide and were unreadable.

**Encoding repair** — the en/em dashes in `ReviewStep.tsx` were mangled to `â€"` while
reformatting (see Failed attempts) and have been restored; the date range renders as
`September 15, 2026 – September 26, 2026` again.

## Failed attempts

- **Second dev server.** `preview_start` launched `next dev` on port 56374; it exited with
  code 1 because a `next dev` was already running on :3000. All testing used the existing
  server on :3000. Do not start a second one.
- **PowerShell reindentation corrupted UTF-8.** Three step files were reindented with
  `Get-Content` / `Set-Content`. In Windows PowerShell 5.1 `Get-Content` reads a BOM-less
  UTF-8 file as ANSI, so the en dash and em dash in `ReviewStep.tsx` came back as
  mojibake, and `-Encoding utf8` wrote BOMs into all three files. Both were repaired
  (dashes fixed via the Edit tool, BOMs stripped with `UTF8Encoding($false)`). Use the
  Edit tool, or `[System.IO.File]::ReadAllText`/`WriteAllText`, for any future bulk
  reindentation here.
- **Browser-pane screenshots after JS scrolling.** `window.scrollTo` followed by a
  screenshot returned stale or blank frames that looked like broken layout — a pane
  compositing artifact, not a page bug. Element geometry read through
  `getBoundingClientRect` was always correct.
- **JS-driven step transitions stall while the pane is hidden.** `AnimatePresence
  mode="wait"` will not mount the next step until the previous one's exit animation
  finishes, and framer-motion's frames stop when the pane is not painting. A programmatic
  click then leaves the progress bar on step *n+1* while the panel still shows step *n*.
  This is a harness artifact — a real visible browser is fine. Workaround: interleave
  small `computer{action:"screenshot"}` calls between step clicks to force paints, and
  temporarily `display:none` the hero section so the wizard sits at the top of the
  viewport at `scrollY === 0`.
- **Clicking the AI "Generate my itinerary" button by coordinate** silently did nothing;
  clicking by `ref` from `find` worked.
- **Two calendar day clicks in one JS tick** select only the second date — React batches
  the updates, so the second `handleDayClick` still sees `value.start === null`. Click the
  arrival, let a frame pass, then click the departure.

## Next steps

1. **Copy nuance (needs a decision).** `interestsHint` reads "Pick one or more. Matching
   journey ideas appear alongside." The ideas now appear directly *below* the chips. The
   string was left alone because it is translated content in `content/{en,da,es,fi,nl}/ui.json`;
   reword all five if the mismatch matters.
2. **AI step at wide and narrow widths.** The `ready` state was verified with a real
   itinerary only at 1280px. Worth one pass at ≥1536px and one on a phone with a generated
   itinerary, since that step is the widest thing in the wizard.
3. **Long Interests list on mobile.** Removing the nested scroll box means selecting four
   categories produces a long scroll (8 cards). Reachable and thumb-friendly, but consider
   whether a "show more" affordance is wanted.
4. **Leaflet HMR noise (pre-existing, dev-only).** Editing files while the AI step is
   mounted logs `Map container is being reused by another instance` and can leave the tab
   non-interactive until a hard reload. Not triggered by production navigation.
5. Delete this file before merge if the team does not keep handoff notes in-tree.
