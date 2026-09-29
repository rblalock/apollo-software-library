import { describe, expect, it } from 'vitest';
import { parseBscCatalog } from '../lib/bsc';

const SIRIUS = '2491  9Alp CMaBD-16 1591  48915151881 257I   5423           064044.6-163444064508.9-164258227.22-08.88-1.46   0.00 -0.05 -0.03   A1Vm               -0.553-1.205 +.375-008SBO    13 10.3  11.2AB   ';

describe('parseBscCatalog', () => {
  it('parses J2000 position, magnitude and proper motion', () => {
    const [s] = parseBscCatalog(SIRIUS);
    expect(s!.hr).toBe(2491);
    expect(s!.name).toBe('9Alp CMa');
    expect(s!.raDeg).toBeCloseTo((6 + 45 / 60 + 8.9 / 3600) * 15, 9);
    expect(s!.decDeg).toBeCloseTo(-(16 + 42 / 60 + 58 / 3600), 9);
    expect(s!.vmag).toBe(-1.46);
    expect(s!.pmRaArcsecPerYr).toBe(-0.553);
    expect(s!.pmDecArcsecPerYr).toBe(-1.205);
  });
  it('skips entries without a J2000 position', () => {
    // HR 182 is the M 31 supernova placeholder in BSC5: it has no position fields.
    expect(parseBscCatalog(' 182 M 31  And                                     S And')).toHaveLength(0);
  });
});
