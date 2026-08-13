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

## v2 — User authentication (Supabase) — ✅ implemented
- **Auth only** — no data persistence yet. Users can sign up, log in, and log
  out; the calendar UI itself still works exactly as in v1 (banked count typed
  in per visit).
- Backed by **Supabase Auth**, project already created:
  - Project ID: `fotxyopxsqnvrqbizmpk` (URL: `https://fotxyopxsqnvrqbizmpk.supabase.co`)
  - Publishable key: `sb_publishable_dY63_yR4wVrMqqiZK5Z5fA_WwSYBAhe`
    (safe for client-side use by design; lives in `.env.local` as Vite env vars)
- Sets up the account foundation that v3 persistence attaches to.

## v3 — Persistence + blackout dates
- Store each logged-in user's **banked episode count** and **blackout dates**
  in Supabase, saved between visits.
- Non-release days become clickable too, so any day or range can be marked as
  **blackout** (vacation, busy).
- Because the count now persists but is only updated manually, a saved count
  goes stale as release dates pass. Store the count with an "as of" date and,
  on load, prompt: *"3 releases have gone out since you last updated — is 9
  still right?"* (Confirming/adjusting stays manual; nothing decrements on its own.)
- Calendar shows, for each release date, whether it's still reachable: are there
  enough non-blackout filming days before its filming deadline (`D − 2 days`),
  assuming a typical shoot yields 1–2 episodes?
- Warnings like (illustrative): *"To stay on schedule through your Dec 5–15
  vacation, you need 4 episodes banked by Dec 3."*

## v4 (stretch) — Calendar integration
- Pull both hosts' availability (e.g., Google Calendar) and auto-derive blackout
  dates from days that are already busy, instead of entering them by hand.
  This extends v3's blackout feature — days both hosts are free remain the
  implicit filming windows.

## Facts & decisions
1. **Episodes per shoot day:** variable, 1–N (usually 1 or 2) — used by v3's
   reachability check.
2. **Edit lead time:** ~1–2 days from filmed to release-ready — filming deadlines
   sit ~2 days before the release they cover.
3. **Storage:** none in v1 — the user enters the banked count each visit and the
   UI works from that input alone. Login (Supabase Auth) arrives in v2, auth
   only; persistence of the banked count and blackout dates arrives in v3.
4. **Banked count:** entered and updated manually; never auto-decremented. In v3
   the app may *prompt* for an update when the saved count looks stale, but the
   change is always the user's.
