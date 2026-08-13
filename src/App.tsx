import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./components/AuthPanel";
import { BankedInput } from "./components/BankedInput";
import { Calendar } from "./components/Calendar";
import { EpisodesTab, isReleased } from "./components/EpisodesTab";
import { StatusPanel } from "./components/StatusPanel";
import { useEpisodes } from "./hooks/useEpisodes";
import { Day, fromLocalDate, sameDay, toISO } from "./lib/schedule";
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

  // Logged in: banked = number of unreleased episodes. Logged out: typed count.
  const parsed = Number.parseInt(bankedText, 10);
  const banked = session
    ? episodes.filter((e) => !isReleased(e, today)).length
    : Number.isInteger(parsed) && parsed >= 0
      ? parsed
      : null;

  const episodesByDate = new Map(
    episodes.flatMap((e) => (e.release_date !== null ? [[e.release_date, e] as const] : [])),
  );

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
              <strong>{banked}</strong> episode{banked === 1 ? "" : "s"} banked
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
          />

          <StatusPanel
            key={selected ? toISO(selected) : "none"}
            banked={banked}
            today={today}
            selected={selected}
            episode={
              session && selected ? (episodesByDate.get(toISO(selected)) ?? null) : null
            }
            unassigned={
              session ? episodes.filter((e) => e.release_date === null) : undefined
            }
            assignedDates={session ? new Set(episodesByDate.keys()) : undefined}
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
