import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDays, slotsFor, earliestOpen, hr } from '../src/lib/passport-booking.ts';

// 2026-11-20 is a Friday. Singapore is UTC+8, so 09:30Z is 17:30 SGT.

test('buildDays gives 8 days starting today in SGT, labelled Today / Tmrw / weekday', () => {
  const days = buildDays(new Date('2026-11-20T03:00:00Z'));
  assert.equal(days.length, 8);
  assert.equal(days[0].key, '2026-11-20');
  assert.equal(days[0].top, 'Today');
  assert.equal(days[0].isToday, true);
  assert.equal(days[1].top, 'Tmrw');
  assert.equal(days[2].top, 'Sun');
});

test('after 5pm SGT every slot today is disabled and the earliest visit rolls to tomorrow 11am', () => {
  const now = new Date('2026-11-20T09:30:00Z');
  const days = buildDays(now);
  const slots = slotsFor(days[0], now);
  assert.ok(slots.length > 0);
  assert.ok(slots.every((s) => s.disabled));
  assert.deepEqual(earliestOpen(days, now), { key: '2026-11-21', h: 11 });
});

test('at 1:10pm SGT the 11am, 12pm and 1pm slots are disabled and 2pm is earliest', () => {
  const now = new Date('2026-11-20T05:10:00Z');
  const days = buildDays(now);
  const disabled = slotsFor(days[0], now)
    .filter((s) => s.disabled)
    .map((s) => s.label);
  assert.deepEqual(disabled, ['11am', '12pm', '1pm']);
  assert.deepEqual(earliestOpen(days, now), { key: '2026-11-20', h: 14 });
});

test('the day key rolls over at SGT midnight without a reload', () => {
  // 15:59Z is 23:59 SGT on 20 Nov. 16:01Z is 00:01 SGT on 21 Nov.
  assert.equal(buildDays(new Date('2026-11-20T15:59:00Z'))[0].key, '2026-11-20');
  assert.equal(buildDays(new Date('2026-11-20T16:01:00Z'))[0].key, '2026-11-21');
});

test('closed weekdays are marked closed and earliestOpen skips them', () => {
  // Monday 23 Nov 2026. Closed Mondays use closedDows [1].
  const now = new Date('2026-11-22T02:00:00Z'); // Sun 22 Nov, 10am SGT
  const days = buildDays(now, 8, [1]);
  const mon = days.find((d) => d.key === '2026-11-23');
  assert.ok(mon);
  assert.equal(mon.closed, true);
  assert.ok(slotsFor(mon, now).every((s) => s.disabled));
  // 22 Nov is not closed, so Sunday 11am is still the earliest slot.
  assert.deepEqual(earliestOpen(days, now), { key: '2026-11-22', h: 11 });

  const sunEvening = new Date('2026-11-22T11:00:00Z'); // Sun 22 Nov, 7pm SGT
  const days2 = buildDays(sunEvening, 8, [1]);
  assert.deepEqual(earliestOpen(days2, sunEvening), { key: '2026-11-24', h: 11 });
});

test('hr() formats 11am, 12pm, 1pm and 5pm', () => {
  assert.equal(hr(11), '11am');
  assert.equal(hr(12), '12pm');
  assert.equal(hr(13), '1pm');
  assert.equal(hr(17), '5pm');
});
