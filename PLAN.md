# Film Calendar — Plan

## The problem
The show releases 2 episodes per week, every **Monday and Thursday**. Filming happens
erratically on random off days, so the backlog of ready episodes swings between
"almost out" and "5–10 banked." The goal is a calendar that answers: *"are we on
pace, and how many episodes do we need before X date?"* — especially around
vacations and busy stretches.

## Core idea
A digital calendar where **release dates (Mondays and Thursdays) are clickable**.
Clicking a future release date shows its status based on how many episodes are
currently banked (numbers below are illustrative — the app computes the real ones):

- Behind: *"This release is 15 videos out. You currently have 4 videos ready.
  You need to film an additional 11 videos in the next 50 days to have one for this date."*
- Ahead: *"This release is 3 videos out. You have 10 videos ready.
  You're ahead of schedule by 7 videos."*

### The math
For a clicked release date `D`:
- `releasesOut` = number of Mon/Thu release slots from the next upcoming release through `D` (inclusive)
- `deficit` = `releasesOut − episodesReady`
- `daysLeft` = days between today and `D`
- If `deficit > 0` → behind by `deficit`; else ahead by `−deficit`.

Refinement (uses the facts below): an episode takes ~1–2 days to edit after
filming, so the *filming* deadline for release `D` is really `D − 2 days`. The
"behind" message should count days to that deadline, not to `D` itself.

## MVP (v1) — ✅ complete
- Single-page web app, fully client-side — **no storage layer, no backend, no sync**.
- On load, the user types in **episodes currently banked**; the UI is immediately
  usable from there. Nothing persists between visits.
- Month-view calendar; Mondays/Thursdays visually marked as release days, and
  they are the only interactive days in v1.
- Click any future release date → status panel with a verdict pill ("Film N more" /
  "Ahead by N" / "On schedule") and stat tiles instead of a prose message.
- Each release-day cell shows a badge with how many releases out it is, colored
  green/red by whether the banked count covers it.
- See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the as-built details.

## v2 — User authentication (Supabase) — ✅ complete
- **Auth only** — no data persistence yet. Users can sign up, log in, and log
  out; the calendar UI itself still works exactly as in v1 (banked count typed
  in per visit).
- Backed by **Supabase Auth**, project already created:
  - Project ID: `fotxyopxsqnvrqbizmpk` (URL: `https://fotxyopxsqnvrqbizmpk.supabase.co`)
  - Publishable key: `sb_publishable_dY63_yR4wVrMqqiZK5Z5fA_WwSYBAhe`
    (safe for client-side use by design; lives in `.env.local` as Vite env vars)
- Sets up the account foundation that v3 persistence attaches to.

## v3 — Episodes (persistence for logged-in users)
The banked *count* becomes banked *episodes*: named records stored in Supabase.

**Logged out:** unchanged v1 behavior — type in a banked count, nothing stored.

**Logged in:** the banked-count input is replaced by two tabs:

### Calendar tab
- Same calendar as v1/v2, plus: a release day with an assigned episode shows
  that episode's name on/under the cell.
- The banked count is now **derived from episodes** instead of typed in:
  it's simply the **number of unreleased episodes** (unassigned, or assigned
  to a future date). The v1 status math is unchanged — it just receives this
  derived number.

### Episodes tab
- List of the user's episodes with create / edit / delete.
- **Create:** name required; optionally assign to a release date (a future
  Mon/Thu). Assignment can also be added, changed, or removed later via edit.
- **Delete:** with a confirm step.
- At most **one episode per release date**, and each episode has at most one
  date (it's one video per release slot).
- Only **future** Mon/Thu dates are assignable.
- When an assigned date passes, the episode counts as **released**: it drops
  out of the banked pool and moves to a "Released" section of the list (kept
  as history, still deletable). Unassigned episodes never expire.

### Storage (Supabase)
- Table `episodes`: `id`, `user_id`, `name`, `release_date` (nullable date),
  `created_at`. Row-level security: owner-only. Uniqueness enforced on
  `(user_id, release_date)` for non-null dates.

Note: the old "staleness prompt" idea is obsolete — the episode model replaces
the raw count, and release status is derived from assigned dates, so nothing
goes stale.

## v4 — Blackout dates
- Mark days/ranges as **blackout** (vacation, busy); stored per user.
- Calendar shows, for each release date, whether it's still reachable: are there
  enough non-blackout filming days before its filming deadline (`D − 2 days`),
  assuming a typical shoot yields 1–2 episodes?
- Warnings like (illustrative): *"To stay on schedule through your Dec 5–15
  vacation, you need 4 episodes banked by Dec 3."*

## v5 (stretch) — Calendar integration
- Pull both hosts' availability (e.g., Google Calendar) and auto-derive blackout
  dates from days that are already busy, instead of entering them by hand.
  This extends v4's blackout feature — days both hosts are free remain the
  implicit filming windows.

## Facts & decisions
1. **Episodes per shoot day:** variable, 1–N (usually 1 or 2) — used by v4's
   reachability check.
2. **Edit lead time:** ~1–2 days from filmed to release-ready — filming deadlines
   sit ~2 days before the release they cover.
3. **Storage:** none in v1 — the user enters the banked count each visit and the
   UI works from that input alone. Login (Supabase Auth) arrives in v2, auth
   only; episode persistence arrives in v3 for logged-in users (logged-out
   keeps the v1 manual count).
4. **Banked inventory:** never auto-decremented as a number. In v3 the count is
   *derived* — unassigned episodes plus assigned-and-not-yet-released ones —
   and an episode leaves the pool only when its assigned release date passes.
