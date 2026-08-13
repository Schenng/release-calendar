# V1 Implementation — Film Calendar (✅ complete)

The stateless MVP from [PLAN.md](PLAN.md), as built. Fully client-side, no
backend, no persistence. Static Vite build, deployable on Vercel.

## Stack
- **Vite + React + TypeScript.** Vercel auto-detects Vite; zero config.
- Hand-rolled CSS in `src/index.css` — no UI framework.
- No router, no state library. State is `bankedCount` (text input), `selectedDate`,
  and the visible month — all `useState` in `App.tsx`.

## Project structure (as built)
```
src/
  lib/
    schedule.ts        # all date/release math — pure functions, no DOM
    schedule.test.ts   # 18 unit tests (Vitest)
  components/
    BankedInput.tsx    # "Episodes banked" number input
    Calendar.tsx       # month grid + prev/next navigation
    DayCell.tsx        # one day; release/past/selected/covered states
    StatusPanel.tsx    # verdict pill + stat tiles for the selected release
  App.tsx
  main.tsx
index.html
.npmrc                 # points this project at the public npm registry
.claude/launch.json    # dev-server config (npm run dev, port 5173)
```

## Core logic (`schedule.ts`)
Pure functions on calendar dates (`{year, month, day}`) computed via UTC
timestamps — identical results in every timezone, immune to DST:

- `isReleaseDay(d)` — Monday or Thursday.
- `nextRelease(today)` — first slot **strictly after** today (a release dated
  today is treated as already out).
- `releasesOut(today, target)` — slots from `nextRelease(today)` through
  `target`, inclusive; throws on non-release or non-future targets.
- `status(banked, today, target)` → discriminated union:
  - `behind`: `need`, `daysLeft`, and `filmBy = target − EDIT_LEAD_DAYS (2)`
  - `ahead`: `surplus`
  - `onSchedule` (exact zero deficit — its own state, not "ahead by 0")
- Formatting helpers: `formatDay` ("Thursday, December 10"), `formatDayShort`
  ("Thu, Dec 10"), `monthName`.

## UI behavior (as built)
1. **Banked count input** at the top. Empty/invalid input → calendar renders,
   but selecting a date shows an "enter your banked count" hint instead of a status.
2. **Month grid**, weeks starting Sunday, ‹ › month navigation.
3. **Day cells:** future Mon/Thu are buttons; each carries a badge with its
   `releasesOut` number and is tinted green (`banked ≥ releasesOut`) or red.
   Past days, today, and non-release days are inert; today is underlined.
4. **Clicking a release day** selects it (click again to deselect) and shows the
   **StatusPanel**: date + verdict pill ("Film N more" / "Ahead by N" /
   "On schedule"), stat tiles (Releases out, Videos ready, and when behind:
   Still to film, plus a full-width Film-by tile), and a one-line footnote.
   The film-by date subtracts the 2-day edit lead time.

## Testing & verification
- `npm test` — 18 Vitest cases over `schedule.ts`: slot counting from every
  weekday, far-future counts, behind/ahead/exact-zero, rejection of invalid
  targets, DST-spanning ranges, formatting.
- Verified live in the browser: all three status states, badge/coloring
  correctness (hand-checked December counts), month navigation, and mobile
  (375px) layout.

## Running it
- `npm run dev` — dev server on port 5173.
- `npm test` — unit tests.
- `npm run build` — typecheck + production build to `dist/`.

## Notes / deviations from the original plan
- **Status message became a panel, not prose** — a verdict pill + stat tiles
  replaced the paragraph message for readability; the Film-by tile sits on its
  own row to avoid overflow.
- **`.npmrc` was required** — the machine's npm defaults to a private company
  registry; this project pins the public registry locally.
- **Deployment:** the folder has no git repo or Vercel link in it. The build is
  a static `dist/` that Vercel auto-detects; hook up the repo/CLI and it ships
  as-is.

## V2 — Supabase authentication (✅ complete)
V2 is **auth only** — sign up / log in / log out. No data is persisted yet;
the calendar keeps its v1 behavior and stays usable logged in or out.

- Supabase project: `fotxyopxsqnvrqbizmpk`
  (`https://fotxyopxsqnvrqbizmpk.supabase.co`). Client config lives in
  `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) — the
  publishable key is client-safe by design. **Set the same vars in Vercel's
  project settings for deploys.**
- `src/lib/supabase.ts` — shared `@supabase/supabase-js` client; throws early
  with a clear message if the env vars are missing.
- `src/components/AuthPanel.tsx` — header UI: logged out shows a "Sign in"
  button that opens a **modal** (dimmed backdrop; closes on ×, backdrop click,
  Escape, or successful sign-in) with Sign in / Sign up tabs (email + password,
  min 6 chars); logged in shows the user's email + Sign out. Sign-up without an
  immediate session shows "Check your email for a confirmation link" (Supabase
  email confirmation is on by default).
- `App.tsx` holds the `Session` state: `getSession()` on mount plus an
  `onAuthStateChange` subscription.
- Verified: UI states render, tests/build pass, and the project's auth API
  answers with the configured key (`/auth/v1/health` → 200). The live
  signup → confirm-email → sign-in loop needs a real inbox, so that final
  pass is manual.

## V3 — Episodes (✅ implemented; schema applied)
V3 replaces the banked *count* with banked *episodes* for logged-in users.
Logged out, the app behaves exactly like v1 (typed count, nothing stored).

**Schema:** managed as Supabase CLI migrations in `supabase/migrations/`
(project is linked to `fotxyopxsqnvrqbizmpk`; apply future changes with
`supabase migration new <name>` + `supabase db push`). Applied so far:
- `create_episodes` — the `episodes` table, owner-only RLS policy, and a
  partial unique index enforcing one episode per release date per user.
- `episodes_grants` — explicit `GRANT` to the `authenticated` role (tables
  created via the CLI's login role miss the project's default grants; `anon`
  intentionally gets nothing).

As built:
- `src/hooks/useEpisodes.ts` — `Episode` type (`id`, `name`,
  `release_date: string | null` as ISO) + CRUD against Supabase; reloads the
  list after each mutation; surfaces errors as a message string.
- `src/components/EpisodesTab.tsx` — create form (name required, optional
  release-date select), inline row editing (rename / assign / unassign /
  reassign), delete with a confirm dialog. The date select offers the next 24
  Mon/Thu slots minus dates already taken. Episodes whose assigned date has
  passed (release dated today counts as out, matching v1's rule) move to a
  dimmed "Released" section — kept as history, still deletable. `isReleased`
  is exported and reused by `App` for the banked count.
- `App.tsx` — logged in, a Calendar | Episodes tab bar replaces `BankedInput`;
  the banked count is derived (`episodes` not yet released) and shown as
  "N episodes banked" above the calendar. Logged out, the v1 input path is
  untouched.
- `Calendar`/`DayCell` — an `episodesByDate` map (ISO date → episode) puts the
  assigned episode's name inside its release-day cell (truncated, full name on
  hover). Logged in, only dates with an assigned episode read as filled; the
  unassigned pool never tints cells. Logged out keeps the v1 count-based tint.
- Status panel (logged in) — shows the scheduled episode with a Remove
  (unassign) button, or an assign dropdown of unassigned episodes when the
  date is empty; uses `statusWithAssignments` (covered slots + unassigned
  pool; later-dated episodes never fill earlier gaps) instead of the plain
  count math, plus an "Unassigned" stat tile.
- `schedule.ts` grew `toISO`/`fromISO`, `upcomingReleases(today, n)`, and
  `statusWithAssignments`, all unit-tested (27 tests total).

Verified: tests + build pass, logged-out UI unchanged in the browser. The
logged-in flow needs a signed-in session, so the live CRUD pass is manual
(after running the schema).
