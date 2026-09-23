import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysBetween, formatAge, formatDate } from '../src/format.ts';

describe('formatDate', () => {
  it('formats dates as ISO calendar dates in UTC', () => {
    assert.equal(
      formatDate(new Date('2026-02-25T23:59:59.000Z')),
      '2026-02-25',
    );
  });
});

describe('daysBetween', () => {
  it('counts completed days', () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    assert.equal(daysBetween(new Date('2026-09-23T00:00:00.000Z'), now), 0);
    assert.equal(daysBetween(new Date('2026-09-22T12:00:00.000Z'), now), 1);
    assert.equal(daysBetween(new Date('2025-09-23T12:00:00.000Z'), now), 365);
  });

  it('clamps future dates to zero', () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    assert.equal(daysBetween(new Date('2026-09-24T12:00:00.000Z'), now), 0);
  });
});

describe('formatAge', () => {
  it('formats day counts', () => {
    assert.equal(formatAge(0), '< 1 day');
    assert.equal(formatAge(1), '1 day');
    assert.equal(formatAge(210), '210 days');
  });
});
