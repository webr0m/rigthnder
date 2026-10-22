import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birthdateError, birthdateBounds, ageOf } from '../server/birthdate.mjs';

test('birthdate rejects ancient years, incomplete, impossible, future and underage dates', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  for (const value of [
    '',
    '1093-01-01',
    '2000-1-01',
    '2001-02-29',
    '2000-02-30',
    '2027-01-01',
    '2008-10-23',
  ])
    assert.ok(birthdateError(value, now), value);
  for (const value of ['2008-10-22', '2000-02-29', '1925-10-23'])
    assert.equal(birthdateError(value, now), '', value);
  assert.ok(birthdateError('1925-10-22', now));
});

test('date input bounds match server age validation, including leap days and birthdays', () => {
  for (const today of ['2026-10-22', '2024-02-29', '2026-03-01']) {
    const now = new Date(today + 'T12:00:00Z'),
      bounds = birthdateBounds(now);
    assert.equal(ageOf(bounds.max, now), 18);
    assert.equal(ageOf(bounds.min, now), 100);
    for (const [date, delta] of [
      [bounds.max, 1],
      [bounds.min, -1],
    ]) {
      const outside = new Date(date + 'T00:00:00Z');
      outside.setUTCDate(outside.getUTCDate() + delta);
      assert.ok(birthdateError(outside.toISOString().slice(0, 10), now));
    }
  }
});
