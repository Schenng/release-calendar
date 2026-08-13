import { DayCell } from "./DayCell";
import { Episode } from "../hooks/useEpisodes";
import {
  compare,
  Day,
  dayOfWeek,
  isReleaseDay,
  monthName,
  releasesOut,
  sameDay,
  toISO,
} from "../lib/schedule";

interface Props {
  today: Day;
  banked: number | null;
  visible: { year: number; month: number };
  onNavigate: (v: { year: number; month: number }) => void;
  selected: Day | null;
  onSelect: (day: Day) => void;
  /** ISO date → assigned episode, for logged-in users. */
  episodesByDate?: Map<string, Episode>;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function Calendar({
  today,
  banked,
  visible,
  onNavigate,
  selected,
  onSelect,
  episodesByDate,
}: Props) {
  const { year, month } = visible;
  const firstDow = dayOfWeek({ year, month, day: 1 });
  const total = daysInMonth(year, month);

  const cells: (Day | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: total }, (_, i) => ({ year, month, day: i + 1 })),
  ];

  const prev = () =>
    onNavigate(month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });
  const next = () =>
    onNavigate(month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });

  return (
    <section className="calendar">
      <header className="calendar-header">
        <button type="button" onClick={prev} aria-label="Previous month">
          ‹
        </button>
        <h2>
          {monthName(month)} {year}
        </h2>
        <button type="button" onClick={next} aria-label="Next month">
          ›
        </button>
      </header>

      <div className="calendar-grid" role="grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} className="weekday-label">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;
          const future = compare(day, today) > 0;
          const clickable = future && isReleaseDay(day);
          const out = clickable ? releasesOut(today, day) : null;
          const episodeName = episodesByDate?.get(toISO(day))?.name ?? null;

          // Logged in (episodesByDate present): only dates with an assigned
          // episode read as filled — the unassigned pool never auto-populates
          // cells. Logged out: tint from the typed banked count, as in v1.
          let coverage: "covered" | "uncovered" | null = null;
          if (episodesByDate) {
            if (clickable && episodeName) coverage = "covered";
          } else if (clickable && out !== null && banked !== null) {
            coverage = banked >= out ? "covered" : "uncovered";
          }

          return (
            <DayCell
              key={day.day}
              day={day}
              isToday={sameDay(day, today)}
              isRelease={isReleaseDay(day)}
              clickable={clickable}
              releasesOut={out}
              coverage={coverage}
              selected={selected !== null && sameDay(day, selected)}
              episodeName={episodeName}
              onClick={() => onSelect(day)}
            />
          );
        })}
      </div>

      <p className="legend">
        Click a highlighted <strong>Mon</strong>/<strong>Thu</strong> release date to check the
        schedule. The badge is how many releases out that date is.
      </p>
    </section>
  );
}
