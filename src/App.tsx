import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { BankedInput } from "./components/BankedInput";
import { Calendar } from "./components/Calendar";
import { EpisodesTab, isReleased } from "./components/EpisodesTab";
import { StatusPanel } from "./components/StatusPanel";
import { useEpisodes } from "./hooks/useEpisodes";
import { compare, Day, fromISO, fromLocalDate, sameDay, toISO } from "./lib/schedule";
import { supabase } from "./lib/supabase";

type Tab = "calendar" | "episodes";

export default function App() {
  const today = fromLocalDate(new Date());
  const [bankedText, setBankedText] = useState("");
  const [selected, setSelected] = useState<Day | null>(null);
  const [visible, setVisible] = useState({ year: today.year, month: today.month });
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("calendar");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { episodes, loading, error, create, update, remove } = useEpisodes(session);

  const unreleasedEpisodes = episodes.filter((e) => !isReleased(e, today));
  const readyEpisodes = unreleasedEpisodes.filter(
    (e) => e.filmed_date !== null && compare(fromISO(e.filmed_date), today) <= 0,
  );
  const estimatedEpisodes = unreleasedEpisodes.filter(
    (e) => e.filmed_date !== null && compare(fromISO(e.filmed_date), today) > 0,
  );
  const estimatedBySelectedDate = selected
    ? estimatedEpisodes.filter(
        (e) => e.filmed_date !== null && compare(fromISO(e.filmed_date), selected) <= 0,
      ).length
    : estimatedEpisodes.length;

  // Logged in: only filmed episodes count as ready. Logged out: use the typed count.
  const parsed = Number.parseInt(bankedText, 10);
  const banked = session
    ? readyEpisodes.length
    : Number.isInteger(parsed) && parsed >= 0
      ? parsed
      : null;

  const episodesByDate = new Map(
    episodes.flatMap((e) => (e.release_date !== null ? [[e.release_date, e] as const] : [])),
  );
  const filmedEpisodesByDate = new Map<string, (typeof episodes)[number][]>();
  for (const episode of episodes) {
    if (episode.filmed_date === null) continue;
    const filmedThatDay = filmedEpisodesByDate.get(episode.filmed_date) ?? [];
    filmedThatDay.push(episode);
    filmedEpisodesByDate.set(episode.filmed_date, filmedThatDay);
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Film Calendar</h1>
          <p className="tagline">Releases every Monday &amp; Thursday</p>
        </div>
        <AuthPanel session={session} />
      </header>

      {session && (
        <nav className="tabs">
          <button
            type="button"
            className={tab === "calendar" ? "active" : ""}
            onClick={() => setTab("calendar")}
          >
            Calendar
          </button>
          <button
            type="button"
            className={tab === "episodes" ? "active" : ""}
            onClick={() => setTab("episodes")}
          >
            Episodes
          </button>
        </nav>
      )}

      {session && tab === "episodes" ? (
        <EpisodesTab
          today={today}
          episodes={episodes}
          loading={loading}
          error={error}
          onCreate={create}
          onUpdate={update}
          onRemove={remove}
        />
      ) : (
        <>
          {!session && <BankedInput value={bankedText} onChange={setBankedText} />}
          {session && (
            <p className="banked-summary">
              <strong>{readyEpisodes.length}</strong> videos ready ·{" "}
              <strong>{estimatedBySelectedDate}</strong> videos to be filmed
            </p>
          )}

          <Calendar
            today={today}
            banked={banked}
            visible={visible}
            onNavigate={setVisible}
            selected={selected}
            onSelect={(day) =>
              setSelected(selected && sameDay(day, selected) ? null : day)
            }
            episodesByDate={session ? episodesByDate : undefined}
            filmingDates={
              session
                ? new Set(episodes.flatMap((e) => (e.filmed_date ? [e.filmed_date] : [])))
                : undefined
            }
          />

          <StatusPanel
            banked={banked}
            estimatedVideos={session ? estimatedBySelectedDate : undefined}
            today={today}
            selected={selected}
            filmedEpisodes={
              session && selected
                ? filmedEpisodesByDate.get(toISO(selected)) ?? []
                : undefined
            }
            episode={
              session && selected ? (episodesByDate.get(toISO(selected)) ?? null) : null
            }
            unassigned={
              session
                ? readyEpisodes.filter((e) => e.release_date === null)
                : undefined
            }
            estimatedUnassigned={
              session
                ? estimatedEpisodes.filter((e) => e.release_date === null)
                : undefined
            }
            assignedDates={
              session
                ? new Set(
                    readyEpisodes.flatMap((e) =>
                      e.release_date === null ? [] : [e.release_date],
                    ),
                  )
                : undefined
            }
            onAssign={
              session && selected
                ? (id) => update(id, { release_date: toISO(selected) })
                : undefined
            }
            onUnassign={session ? (id) => update(id, { release_date: null }) : undefined}
          />
        </>
      )}
    </main>
  );
}
