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
  onClick,
}: Props) {
  const classes = ["day-cell"];
  if (isToday) classes.push("today");
  if (isRelease) classes.push("release");
  if (selected) classes.push("selected");
  if (clickable && releasesOut !== null && banked !== null) {
    classes.push(banked >= releasesOut ? "covered" : "uncovered");
  }

  if (!clickable) {
    return (
      <div className={classes.join(" ")}>
        <span className="day-number">{day.day}</span>
      </div>
    );
  }

  return (
    <button type="button" className={classes.join(" ")} onClick={onClick}>
      <span className="day-number">{day.day}</span>
      {releasesOut !== null && <span className="badge">{releasesOut}</span>}
    </button>
  );
}
