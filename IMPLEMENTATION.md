# V1 Implementation Plan — Film Calendar

Scope: the stateless MVP from [PLAN.md](PLAN.md). Fully client-side, no backend,
no persistence. Deployed as a static site on Vercel (already hooked up).

## Stack
- **Vite + React + TypeScript.** Vercel auto-detects Vite and builds/deploys with
  zero config. React keeps the calendar grid + status panel trivial to render,
  and the structure grows cleanly into v2 (login/persistence) later.
- **No UI framework needed** — one page, hand-rolled CSS (or Tailwind if preferred).
- **No router, no state library.** Two pieces of state: `bankedCount` and
  `selectedDate` (plus the visible month for navigation). `useState` covers it.

## Project structure
```
src/
  lib/
    schedule.ts        # all date/release math — pure functions, no DOM
    schedule.test.ts   # unit tests for the math
  components/
    BankedInput.tsx    # "How many episodes are banked?" number input
    Calendar.tsx       # month grid + prev/next month navigation
    DayCell.tsx        # one day; knows if it's a release day / past / selected
    StatusPanel.tsx    # the behind/ahead/on-schedule message
  App.tsx
  main.tsx
index.html
```

## Core logic (`schedule.ts`)
Pure functions, all operating on **local dates** (year/month/day triples or
date-only strings — never raw `Date` math across timezones/DST):

- `isReleaseDay(date)` — Monday or Thursday.
- `nextRelease(today)` — first release slot **strictly after** today. (A release
  dated today is treated as already out; simple and unambiguous.)
- `releasesOut(today, target)` — count of release slots from `nextRelease(today)`
  through `target`, inclusive. Target is guaranteed to be a future release day
  by the UI.
- `daysUntil(today, target)`.
- `status(bankedCount, today, target)` → one of:
  - `{ kind: "behind", releasesOut, need, daysLeft }` where `need = releasesOut − banked`
  - `{ kind: "ahead", releasesOut, surplus }`
  - `{ kind: "onSchedule", releasesOut }` when `deficit === 0`

Note: PLAN.md's edit-lead-time refinement (`D − 2 days` filming deadline) affects
the *wording* of days remaining. For v1, show `daysLeft` to the release date and
add "(film by <D − 2 days>)" in the behind message — it's one subtraction, no
extra model complexity.

## UI behavior
1. **Banked count input** pinned at the top. Empty/invalid input → calendar still
   renders but release days show "enter your banked count" instead of a status.
   Count is a non-negative integer; clamp/reject anything else.
2. **Month grid** for the current month, with ‹ › navigation. Weeks start Sunday
   (or Monday — pick one, cosmetic).
3. **Day cells:**
   - Release days (Mon/Thu) in the future: visually highlighted, clickable.
   - Past days and non-release days: rendered flat, not clickable (v1 rule from PLAN.md).
   - Today gets a subtle marker.
4. **Clicking a future release day** selects it and shows the StatusPanel with
   the behind/ahead/on-schedule message. Clicking another day moves the selection.
5. **Bonus (cheap, high value):** on release-day cells, render a small badge with
   that date's `releasesOut` number so the whole month reads at a glance.
   Optionally color cells green/red based on whether `banked ≥ releasesOut`.

## Edge cases to handle
- Today is a release day → it counts as already released; `nextRelease` skips it.
- `deficit === 0` → distinct "on schedule, no filming needed" message (from the
  original spec), not "ahead by 0".
- Banked count larger than any visible deficit → every visible release shows ahead.
- Month navigation far into the future must stay correct (the math is pure
  counting, so it will — cover with tests).
- DST boundaries: avoided entirely by using date-only arithmetic, verified by a
  test spanning a DST transition.

## Testing
- **Vitest** unit tests for `schedule.ts` only — that's where all correctness
  risk lives. Table-driven cases: each weekday as "today", targets 1 and many
  slots out, deficit/ahead/exact-zero, DST-spanning range.
- UI is simple enough to verify manually; no component tests in v1.

## Deployment
- Standard Vite build (`npm run build` → `dist/`). Vercel auto-detects; no
  `vercel.json` needed.
- Static output only — confirms the "no backend" constraint at deploy time.

## Build order
1. Scaffold Vite + React + TS; commit the clean scaffold.
2. Write `schedule.ts` + tests; get the math green first.
3. Calendar grid + month navigation, release-day highlighting.
4. Banked input + StatusPanel wired to `status()`.
5. Badges/coloring polish, empty-input state, mobile-width pass.
6. Deploy to Vercel and sanity-check the live date math (device timezone).

## Acceptance criteria
- Entering a banked count and clicking any future Mon/Thu shows a correct
  behind / ahead / on-schedule message.
- Non-release days and past days are inert.
- Refreshing the page resets everything (expected — no storage by design).
- Works on a phone screen.
