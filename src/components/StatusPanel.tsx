import { Day, formatDay, status } from "../lib/schedule";

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
  const plural = (n: number) => (n === 1 ? "video" : "videos");

  return (
    <section className={`status-panel ${s.kind}`}>
      <h3>{formatDay(selected)}</h3>
      {s.kind === "behind" && (
        <p>
          This release is <strong>{s.releasesOut}</strong> {plural(s.releasesOut)} out. You
          currently have <strong>{banked}</strong> {plural(banked)} ready. You need to film an
          additional <strong>{s.need}</strong> {plural(s.need)} in the next{" "}
          <strong>{s.daysLeft}</strong> {s.daysLeft === 1 ? "day" : "days"} to have one for this
          date <em>(film by {formatDay(s.filmBy)} to leave time for editing)</em>.
        </p>
      )}
      {s.kind === "ahead" && (
        <p>
          This release is <strong>{s.releasesOut}</strong> {plural(s.releasesOut)} out. You have{" "}
          <strong>{banked}</strong> {plural(banked)} ready. You're ahead of schedule by{" "}
          <strong>{s.surplus}</strong> {plural(s.surplus)}.
        </p>
      )}
      {s.kind === "onSchedule" && (
        <p>
          This release is <strong>{s.releasesOut}</strong> {plural(s.releasesOut)} out and you
          have exactly <strong>{banked}</strong> {plural(banked)} ready. You're on schedule — no
          filming needed for this date.
        </p>
      )}
    </section>
  );
}
