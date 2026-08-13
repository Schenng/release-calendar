// All date math is done on calendar dates (year/month/day) via UTC timestamps,
// so results are identical in every timezone and immune to DST.

export interface Day {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

const MS_PER_DAY = 86_400_000;
const MONDAY = 1;
const THURSDAY = 4;
/** Days between filming and release-ready (edit lead time). */
export const EDIT_LEAD_DAYS = 2;

function toMs(d: Day): number {
  return Date.UTC(d.year, d.month - 1, d.day);
}

function fromMs(ms: number): Day {
  const dt = new Date(ms);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/** The calendar date where the given Date falls in the machine's local timezone. */
export function fromLocalDate(d: Date): Day {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(d: Day): number {
  return new Date(toMs(d)).getUTCDay();
}

export function compare(a: Day, b: Day): number {
  return toMs(a) - toMs(b);
}

export function sameDay(a: Day, b: Day): boolean {
  return compare(a, b) === 0;
}

export function addDays(d: Day, n: number): Day {
  return fromMs(toMs(d) + n * MS_PER_DAY);
}

export function daysUntil(from: Day, to: Day): number {
  return Math.round((toMs(to) - toMs(from)) / MS_PER_DAY);
}

export function isReleaseDay(d: Day): boolean {
  const dow = dayOfWeek(d);
  return dow === MONDAY || dow === THURSDAY;
}

/** First release slot strictly after `today` (a release dated today is already out). */
export function nextRelease(today: Day): Day {
  let d = addDays(today, 1);
  while (!isReleaseDay(d)) d = addDays(d, 1);
  return d;
}

/**
 * Number of release slots from nextRelease(today) through target, inclusive.
 * `target` must be a release day strictly after `today`.
 */
export function releasesOut(today: Day, target: Day): number {
  if (!isReleaseDay(target) || compare(target, today) <= 0) {
    throw new Error("target must be a release day after today");
  }
  let count = 1;
  for (let d = nextRelease(today); !sameDay(d, target); d = nextRelease(d)) {
    count++;
  }
  return count;
}

export type Status =
  | { kind: "behind"; releasesOut: number; need: number; daysLeft: number; filmBy: Day }
  | { kind: "ahead"; releasesOut: number; surplus: number }
  | { kind: "onSchedule"; releasesOut: number };

export function status(banked: number, today: Day, target: Day): Status {
  const out = releasesOut(today, target);
  const deficit = out - banked;
  if (deficit > 0) {
    return {
      kind: "behind",
      releasesOut: out,
      need: deficit,
      daysLeft: daysUntil(today, target),
      filmBy: addDays(target, -EDIT_LEAD_DAYS),
    };
  }
  if (deficit < 0) return { kind: "ahead", releasesOut: out, surplus: -deficit };
  return { kind: "onSchedule", releasesOut: out };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** e.g. "Thursday, December 10" */
export function formatDay(d: Day): string {
  return `${WEEKDAYS[dayOfWeek(d)]}, ${monthName(d.month)} ${d.day}`;
}

/** e.g. "Thu, Dec 10" */
export function formatDayShort(d: Day): string {
  return `${WEEKDAYS[dayOfWeek(d)].slice(0, 3)}, ${monthName(d.month).slice(0, 3)} ${d.day}`;
}

/** e.g. "2026-12-10" (Postgres `date` wire format) */
export function toISO(d: Day): string {
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${d.year}-${mm}-${dd}`;
}

export function fromISO(s: string): Day {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
}

/** The next `count` release slots strictly after `today`, in order. */
export function upcomingReleases(today: Day, count: number): Day[] {
  const out: Day[] = [];
  let d = today;
  for (let i = 0; i < count; i++) {
    d = nextRelease(d);
    out.push(d);
  }
  return out;
}
