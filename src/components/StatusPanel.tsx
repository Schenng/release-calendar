import { Episode } from "../hooks/useEpisodes";
import {
  compare,
  Day,
  formatDay,
  formatDayShort,
  status,
  statusWithAssignments,
} from "../lib/schedule";

interface Props {
  banked: number | null;
  today: Day;
  selected: Day | null;
  /** Episode assigned to the selected date, if any (logged in). */
  episode?: Episode | null;
  /** Unassigned episodes offered for assignment to the selected date (logged in). */
  unassigned?: Episode[];
  /** ISO dates that have an assigned episode; enables assignment-aware math. */
  assignedDates?: ReadonlySet<string>;
  onAssign?: (episodeId: string) => void;
  onUnassign?: (episodeId: string) => void;
}

export function StatusPanel({
  banked,
  today,
  selected,
  episode,
  unassigned,
  assignedDates,
  onAssign,
  onUnassign,
}: Props) {
  if (!selected) {
    return <p className="status-hint">Select a release date to see where you stand.</p>;
  }
  if (compare(selected, today) <= 0) {
    return (
      <section className="status-panel history-panel">
        <header className="status-header">
          <h3>{formatDay(selected)}</h3>
          <span className="verdict-pill">Past release</span>
        </header>
        {episode ? (
          <p className="status-episode">
            Episode assigned: <strong>{episode.name}</strong>
            {onUnassign && (
              <button
                type="button"
                className="auth-link unassign"
                onClick={() => onUnassign(episode.id)}
              >
                Unassign
              </button>
            )}
          </p>
        ) : onAssign && unassigned && unassigned.length > 0 ? (
          <div className="assign-block">
            <p className="assign-label">Assign the episode that actually released:</p>
            <div className="assign-options">
              {unassigned.map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  className="episode-chip"
                  onClick={() => onAssign(ep.id)}
                >
                  {ep.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="status-hint">No unassigned episodes are available for this date.</p>
        )}
      </section>
    );
  }
  if (banked === null) {
    return (
      <p className="status-hint">
        Enter how many episodes you have banked to check{" "}
        <strong>{formatDay(selected)}</strong>.
      </p>
    );
  }

  const s = assignedDates
    ? statusWithAssignments(unassigned?.length ?? 0, assignedDates, today, selected)
    : status(banked, today, selected);
  const videos = (n: number) => (n === 1 ? "video" : "videos");

  const verdict =
    s.kind === "behind"
      ? `Film ${s.need} more`
      : s.kind === "ahead"
        ? `Ahead by ${s.surplus}`
        : "On schedule";

  return (
    <section className={`status-panel ${s.kind}`}>
      <header className="status-header">
        <h3>{formatDay(selected)}</h3>
        <span className="verdict-pill">{verdict}</span>
      </header>

      {episode && (
        <p className="status-episode">
          Scheduled episode: <strong>{episode.name}</strong>
          {onUnassign && (
            <button
              type="button"
              className="auth-link unassign"
              onClick={() => onUnassign(episode.id)}
            >
              Remove
            </button>
          )}
        </p>
      )}

      {!episode && onAssign && unassigned && unassigned.length > 0 && (
        <div className="assign-block">
          <p className="assign-label">Assign an episode to this date:</p>
          <div className="assign-options">
            {unassigned.map((ep) => (
              <button
                key={ep.id}
                type="button"
                className="episode-chip"
                onClick={() => onAssign(ep.id)}
              >
                {ep.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <dl className="stats">
        <div className="stat">
          <dt>Releases out</dt>
          <dd>{s.releasesOut}</dd>
        </div>
        <div className="stat">
          <dt>Videos ready</dt>
          <dd>{banked}</dd>
        </div>
        {assignedDates && (
          <div className="stat">
            <dt>Unassigned</dt>
            <dd>{unassigned?.length ?? 0}</dd>
          </div>
        )}
        {s.kind === "behind" && (
          <>
            <div className="stat">
              <dt>Still to film</dt>
              <dd>{s.need}</dd>
            </div>
            <div className="stat wide">
              <dt>Film by</dt>
              <dd>{formatDayShort(s.filmBy)}</dd>
            </div>
          </>
        )}
      </dl>

      <p className="status-note">
        {s.kind === "behind" &&
          `Film ${s.need} more ${videos(s.need)} in the next ${s.daysLeft} ${
            s.daysLeft === 1 ? "day" : "days"
          } to stay on schedule through this date. The film-by date leaves time for editing.`}
        {s.kind === "ahead" &&
          `You're ahead of schedule by ${s.surplus} ${videos(s.surplus)} for this date.`}
        {s.kind === "onSchedule" &&
          "Every release through this date is covered — no filming needed."}
      </p>
    </section>
  );
}
