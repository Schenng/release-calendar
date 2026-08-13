import { describe, expect, it } from "vitest";
import {
  addDays,
  Day,
  daysUntil,
  formatDay,
  fromISO,
  isReleaseDay,
  nextRelease,
  releasesOut,
  status,
  statusWithAssignments,
  toISO,
  upcomingReleases,
} from "./schedule";

const d = (year: number, month: number, day: number): Day => ({ year, month, day });

// Anchors (verified): 2026-08-13 is a Thursday, 2026-08-17 is a Monday.
const THU = d(2026, 8, 13);
const MON = d(2026, 8, 17);

describe("isReleaseDay", () => {
  it("is true only for Mondays and Thursdays", () => {
    expect(isReleaseDay(MON)).toBe(true);
    expect(isReleaseDay(THU)).toBe(true);
    expect(isReleaseDay(d(2026, 8, 11))).toBe(false); // Tuesday
    expect(isReleaseDay(d(2026, 8, 15))).toBe(false); // Saturday
    expect(isReleaseDay(d(2026, 8, 16))).toBe(false); // Sunday
  });
});

describe("nextRelease", () => {
  it.each<[string, Day, Day]>([
    ["Sunday → Monday", d(2026, 8, 16), d(2026, 8, 17)],
    ["Monday → Thursday (same-day release already out)", d(2026, 8, 17), d(2026, 8, 20)],
    ["Tuesday → Thursday", d(2026, 8, 11), d(2026, 8, 13)],
    ["Wednesday → Thursday", d(2026, 8, 12), d(2026, 8, 13)],
    ["Thursday → Monday (same-day release already out)", THU, MON],
    ["Friday → Monday", d(2026, 8, 14), MON],
    ["Saturday → Monday", d(2026, 8, 15), MON],
  ])("%s", (_label, today, expected) => {
    expect(nextRelease(today)).toEqual(expected);
  });
});

describe("releasesOut", () => {
  it("is 1 for the next upcoming release", () => {
    expect(releasesOut(THU, MON)).toBe(1);
  });

  it("counts consecutive slots", () => {
    expect(releasesOut(THU, d(2026, 8, 20))).toBe(2); // Mon 17, Thu 20
    expect(releasesOut(THU, d(2026, 8, 24))).toBe(3);
    expect(releasesOut(THU, d(2026, 8, 27))).toBe(4);
  });

  it("counts 2 slots per full week far into the future", () => {
    // 10 weeks after Mon 8/17 is Mon 10/26: 1 + 10*2 = 21 slots.
    expect(releasesOut(THU, addDays(MON, 70))).toBe(21);
  });

  it("rejects non-release targets and past/today targets", () => {
    expect(() => releasesOut(THU, d(2026, 8, 18))).toThrow(); // Tuesday
    expect(() => releasesOut(THU, THU)).toThrow(); // today
    expect(() => releasesOut(THU, d(2026, 8, 10))).toThrow(); // past Monday
  });

  it("is unaffected by DST transitions", () => {
    // US DST starts 2026-03-08 (Sunday). Thu 2026-03-05 → Mon 2026-03-09 spans it.
    expect(releasesOut(d(2026, 3, 5), d(2026, 3, 9))).toBe(1);
    expect(daysUntil(d(2026, 3, 5), d(2026, 3, 9))).toBe(4);
  });
});

describe("status", () => {
  it("behind: reports need, days left, and film-by date", () => {
    // 4 slots out (Mon 17 … Thu 27), 1 banked.
    const s = status(1, THU, d(2026, 8, 27));
    expect(s).toEqual({
      kind: "behind",
      releasesOut: 4,
      need: 3,
      daysLeft: 14,
      filmBy: d(2026, 8, 25),
    });
  });

  it("ahead: reports surplus", () => {
    const s = status(10, THU, d(2026, 8, 20));
    expect(s).toEqual({ kind: "ahead", releasesOut: 2, surplus: 8 });
  });

  it("onSchedule when banked exactly covers the slots", () => {
    const s = status(2, THU, d(2026, 8, 20));
    expect(s).toEqual({ kind: "onSchedule", releasesOut: 2 });
  });

  it("zero banked episodes is behind by the full slot count", () => {
    const s = status(0, THU, MON);
    expect(s.kind).toBe("behind");
    if (s.kind === "behind") expect(s.need).toBe(1);
  });
});

describe("statusWithAssignments", () => {
  // Slots after THU (2026-08-13): Mon 17, Thu 20, Mon 24, Thu 27, Mon 31.
  const iso = (day: number) => toISO(d(2026, 8, day));

  it("a skipped slot between assignments is behind by 1 (reported bug)", () => {
    // Three episodes assigned to slots 1, 2, and 4 — slot 3 (Mon 24) skipped.
    const assigned = new Set([iso(17), iso(20), iso(27)]);
    const s = statusWithAssignments(0, assigned, THU, d(2026, 8, 24));
    expect(s.kind).toBe("behind");
    if (s.kind === "behind") expect(s.need).toBe(1);
  });

  it("an unassigned episode fills a skipped slot", () => {
    const assigned = new Set([iso(17), iso(20), iso(27)]);
    const s = statusWithAssignments(1, assigned, THU, d(2026, 8, 24));
    expect(s).toEqual({ kind: "onSchedule", releasesOut: 3 });
  });

  it("episodes assigned beyond the target don't cover earlier gaps", () => {
    // Only slot 5 (Mon 31) assigned; clicking slot 2 (Thu 20) with empty pool.
    const assigned = new Set([iso(31)]);
    const s = statusWithAssignments(0, assigned, THU, d(2026, 8, 20));
    expect(s.kind).toBe("behind");
    if (s.kind === "behind") expect(s.need).toBe(2);
  });

  it("fully assigned range is on schedule with an empty pool", () => {
    const assigned = new Set([iso(17), iso(20)]);
    expect(statusWithAssignments(0, assigned, THU, d(2026, 8, 20))).toEqual({
      kind: "onSchedule",
      releasesOut: 2,
    });
  });

  it("spare unassigned episodes count as ahead", () => {
    const assigned = new Set([iso(17)]);
    const s = statusWithAssignments(3, assigned, THU, d(2026, 8, 20));
    expect(s).toEqual({ kind: "ahead", releasesOut: 2, surplus: 2 });
  });

  it("matches plain status when nothing is assigned", () => {
    expect(statusWithAssignments(2, new Set(), THU, d(2026, 8, 20))).toEqual(
      status(2, THU, d(2026, 8, 20)),
    );
  });
});

describe("formatDay", () => {
  it("formats with weekday and month", () => {
    expect(formatDay(d(2026, 12, 10))).toBe("Thursday, December 10");
  });
});

describe("ISO round-trip", () => {
  it("pads and parses", () => {
    expect(toISO(d(2026, 8, 5))).toBe("2026-08-05");
    expect(fromISO("2026-08-05")).toEqual(d(2026, 8, 5));
    expect(fromISO(toISO(d(2026, 12, 31)))).toEqual(d(2026, 12, 31));
  });
});

describe("upcomingReleases", () => {
  it("lists slots strictly after today, alternating Mon/Thu", () => {
    expect(upcomingReleases(THU, 4)).toEqual([
      d(2026, 8, 17),
      d(2026, 8, 20),
      d(2026, 8, 24),
      d(2026, 8, 27),
    ]);
  });

  it("returns exactly count slots", () => {
    expect(upcomingReleases(d(2026, 8, 12), 16)).toHaveLength(16);
  });
});
