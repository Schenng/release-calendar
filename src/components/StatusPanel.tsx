import { useState } from "react";
import { Episode } from "../hooks/useEpisodes";
import {
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
  const [assignId, setAssignId] = useState("");
  if (!selected) {
    return <p className="status-hint">Select a release date to see where you stand.</p>;
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
        <div className="assign-row">
          <select
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
            aria-label="Episode to assign"
          >
            <option value="">Choose episode…</option>
            {unassigned.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="auth-submit"
            disabled={assignId === ""}
            onClick={() => {
              onAssign(assignId);
              setAssignId("");
            }}
          >
            Assign to this date
          </button>
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
