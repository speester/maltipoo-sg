// Passport card booking logic. Pure functions, Singapore time (Asia/Singapore) throughout.
// Ported from buildDays / nextOpen in _passport-card-reference/pass-src.html.

export type Day = {
  key: string; // YYYY-MM-DD in SGT
  top: string; // 'Today' | 'Tmrw' | 'Sun' …
  date: number;
  mon: string;
  long: string; // 'Sat 21 Nov'
  closed: boolean;
  isToday: boolean;
};

export type Slot = { h: number; label: string; disabled: boolean };

// Opening hours are 11am to 6pm, so the slot starts run 11am … 5pm.
export const DEFAULT_HOURS: readonly number[] = [11, 12, 13, 14, 15, 16, 17];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SGT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

type SgtParts = { y: number; m: number; d: number; h: number; mi: number };

function sgtParts(now: Date): SgtParts {
  const parts = SGT.formatToParts(now);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') % 24, mi: g('minute') };
}

function minutesOfDay(now: Date): number {
  const t = sgtParts(now);
  return t.h * 60 + t.mi;
}

export function hr(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${h < 12 ? 'am' : 'pm'}`;
}

export function buildDays(now: Date, n = 8, closedDows: number[] = []): Day[] {
  const t = sgtParts(now);
  const out: Day[] = [];
  for (let k = 0; k < n; k++) {
    const dt = new Date(Date.UTC(t.y, t.m - 1, t.d + k));
    const dow = dt.getUTCDay();
    const date = dt.getUTCDate();
    const mon = MON[dt.getUTCMonth()];
    out.push({
      key: dt.toISOString().slice(0, 10),
      top: k === 0 ? 'Today' : k === 1 ? 'Tmrw' : DOW[dow],
      date,
      mon,
      long: `${DOW[dow]} ${date} ${mon}`,
      closed: closedDows.includes(dow),
      isToday: k === 0,
    });
  }
  return out;
}

// A slot is disabled when the day is closed, or when it is today and the slot has already started.
export function slotsFor(day: Day, now: Date, hours: readonly number[] = DEFAULT_HOURS): Slot[] {
  const nowMins = day.isToday ? minutesOfDay(now) : -1;
  return hours.map((h) => ({
    h,
    label: hr(h),
    disabled: day.closed || (day.isToday && nowMins >= h * 60),
  }));
}

export function earliestOpen(
  days: readonly Day[],
  now: Date,
  hours: readonly number[] = DEFAULT_HOURS,
): { key: string; h: number } | null {
  for (const d of days) {
    if (d.closed) continue;
    const open = slotsFor(d, now, hours).find((s) => !s.disabled);
    if (open) return { key: d.key, h: open.h };
  }
  return null;
}
