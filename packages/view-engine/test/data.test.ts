import { describe, expect, it } from 'vitest';
import { APOLLO_11, norm, resolveCatalog, type Agc37File, type BscFile, type RtccFile } from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';

describe('rtcc1970.json', () => {
  it('has 148 stars numbered 1..148 with unique HR numbers', () => {
    expect(rtcc.stars.map((s) => s.seq)).toEqual(Array.from({ length: 148 }, (_, i) => i + 1));
    expect(new Set(rtcc.stars.map((s) => s.hr)).size).toBe(148);
  });
  it('verifies every row: a printed position within 0.05° of its BSC star', () => {
    for (const s of rtcc.stars) {
      expect(s.printedRaDeg, `row ${s.seq}`).not.toBeNull();
      expect(s.printedDecDeg, `row ${s.seq}`).not.toBeNull();
      expect(s.separationDeg, `row ${s.seq}`).not.toBeNull();
      expect(s.separationDeg!, `row ${s.seq}`).toBeLessThanOrEqual(0.05);
    }
  });
  it('rows 1–37 are the Apollo nav stars', () => {
    for (const n of agc.stars) expect(rtcc.stars[n.navStar - 1]!.hr).toBe(n.hr);
  });
});

describe('resolveCatalog', () => {
  const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
  it('resolves every RTCC star to a unit vector, naming the nav stars', () => {
    expect(stars).toHaveLength(148);
    for (const s of stars) expect(norm(s.direction)).toBeCloseTo(1, 12);
    expect(stars[2]!.name).toBe('Navi');
    expect(stars[40]!.name).toBeNull();
  });
});
