import { describe, expect, it } from 'vitest';
import { APOLLO_11, norm, resolveVerifiedCatalog, type Agc37File, type VerifiedCatalogFile } from '../src/index';
import agc from '../../../data/derived/agc37.json';
import cat from '../../../data/derived/cat1078.json';

describe('cat1078.json (69-FM-107 Table I, verified rows)', () => {
  it('records its epoch and keeps only rows verified within 20″, one per star', () => {
    expect(cat.epoch).toBe('B1965.0');
    expect(cat.tableRows).toBe(1078);
    for (const s of cat.stars) expect(s.separationDeg * 3600).toBeLessThanOrEqual(20);
    expect(new Set(cat.stars.map((s) => s.hr)).size).toBe(cat.stars.length);
  });
  it('verifies 826 of the 1,078 rows (recorded; the target of 1,000 was missed — ledger, item 7)', () => {
    expect(cat.stars.length).toBe(826);
  });
});

describe('resolveVerifiedCatalog', () => {
  const stars = resolveVerifiedCatalog(cat as VerifiedCatalogFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
  it('resolves every verified star to a unit vector and names the Apollo nav stars', () => {
    expect(stars).toHaveLength(cat.stars.length);
    for (const s of stars) expect(norm(s.direction)).toBeCloseTo(1, 12);
    expect(stars.find((s) => s.hr === 2326)?.name).toBe('Canopus');
    expect(stars.filter((s) => s.navStar !== null).length).toBe(26); // 11 nav rows unreadable (ledger, item 7)
  });
});
