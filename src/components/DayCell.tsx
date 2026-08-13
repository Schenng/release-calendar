import { Day } from "../lib/schedule";

interface Props {
  day: Day;
  isToday: boolean;
  isRelease: boolean;
  clickable: boolean;
  /** How many release slots out this date is; null when not a clickable release day. */
  releasesOut: number | null;
  banked: number | null;
  selected: boolean;
  /** Name of the episode assigned to this date, if any (logged-in users). */
  episodeName: string | null;
  onClick: () => void;
}

export function DayCell({
  day,
  isToday,
  isRelease,
  clickable,
  releasesOut,
  banked,
  selected,
  episodeName,
  onClick,
}: Props) {
  const classes = ["day-cell"];
  if (isToday) classes.push("today");
  if (isRelease) classes.push("release");
  if (selected) classes.push("selected");
  if (episodeName) classes.push("has-episode");
  if (clickable && releasesOut !== null && banked !== null) {
    classes.push(banked >= releasesOut ? "covered" : "uncovered");
  }

  const episode = episodeName && (
    <span className="episode-label" title={episodeName}>
      {episodeName}
    </span>
  );

  if (!clickable) {
    return (
      <div className={classes.join(" ")}>
        <span className="day-number">{day.day}</span>
        {episode}
      </div>
    );
  }

  return (
    <button type="button" className={classes.join(" ")} onClick={onClick}>
      <span className="day-number">{day.day}</span>
      {releasesOut !== null && <span className="badge">{releasesOut}</span>}
      {episode}
    </button>
  );
}
