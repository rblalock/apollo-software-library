import { describe, expect, it } from 'vitest';
import {
  besselianEpochToJd, formatGet, getToUtc, InvalidGetError, jdToBesselianEpoch, julianDate, parseGet,
} from '../src/index';

describe('GET', () => {
  it('parses and formats hhh:mm:ss', () => {
    expect(parseGet('124:40:00')).toBe(448800);
    expect(parseGet(' 02:44:18.5 ')).toBe(9858.5);
    expect(formatGet(448800)).toBe('124:40:00');
    expect(formatGet(9858)).toBe('02:44:18');
  });
  it('rejects malformed GETs with a typed error', () => {
    for (const bad of ['abc', '124:61:00', '', '124:40', '-1:00:00']) {
      expect(() => parseGet(bad)).toThrow(InvalidGetError);
    }
  });
  it('converts Apollo 11 GET to UTC', () => {
    expect(getToUtc('1969-07-16T13:32:00Z', '124:40:00').toISOString()).toBe('1969-07-21T18:12:00.000Z');
  });
  it('handles very large GETs', () => {
    expect(getToUtc('1969-07-16T13:32:00Z', '9999:00:00').getUTCFullYear()).toBe(1970);
  });
});

describe('epochs', () => {
  it('computes Julian dates', () => {
    expect(julianDate(new Date('2000-01-01T12:00:00Z'))).toBe(2451545);
  });
  it('converts Besselian epochs (B1950.0 = JD 2433282.4235)', () => {
    expect(besselianEpochToJd(1950)).toBeCloseTo(2433282.4235, 4);
    expect(jdToBesselianEpoch(besselianEpochToJd(1970))).toBeCloseTo(1970, 12);
  });
});
