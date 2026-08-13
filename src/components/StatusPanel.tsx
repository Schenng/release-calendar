import { Day, formatDay, formatDayShort, status } from "../lib/schedule";

interface Props {
  banked: number | null;
  today: Day;
  selected: Day | null;
}

export function StatusPanel({ banked, today, selected }: Props) {
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

  const s = status(banked, today, selected);
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

      <dl className="stats">
        <div className="stat">
          <dt>Releases out</dt>
          <dd>{s.releasesOut}</dd>
        </div>
        <div className="stat">
          <dt>Videos ready</dt>
          <dd>{banked}</dd>
        </div>
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
          } to stay on schedule. The film-by date leaves time for editing.`}
        {s.kind === "ahead" &&
          `You're ahead of schedule by ${s.surplus} ${videos(s.surplus)} for this date.`}
        {s.kind === "onSchedule" &&
          "Exactly enough banked — no filming needed for this date."}
      </p>
    </section>
  );
}
