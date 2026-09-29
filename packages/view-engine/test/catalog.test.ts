import { describe, expect, it } from 'vitest';
import {
  angleBetween, besselianEpochToJd, IDENTITY, J2000_JD, orthonormalityError, precessionMatrix,
  radecToVec, starDirection, toDeg, toVec3, vecToRadec, type CatalogStar,
} from '../src/index';

describe('precession (IAU 1976)', () => {
  it('is the identity at J2000 and orthonormal elsewhere', () => {
    const p = precessionMatrix(J2000_JD);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(p[i]![j]).toBeCloseTo(IDENTITY[i]![j]!, 15);
    expect(orthonormalityError(precessionMatrix(besselianEpochToJd(1970)))).toBeLessThan(1e-14);
  });
  it('reproduces Meeus Example 21.b (θ Persei to 2028 Nov 13.19 TD)', () => {
    const thetaPer: CatalogStar = {
      hr: 0, name: 'the Per',
      raDeg: (2 + 44 / 60 + 11.986 / 3600) * 15, decDeg: 49 + 13 / 60 + 42.48 / 3600,
      pmRaArcsecPerYr: 0.03425 * 15 * Math.cos((49.2285 * Math.PI) / 180), pmDecArcsecPerYr: -0.0895, vmag: 4.1,
    };
    const got = starDirection(thetaPer, 2462088.69);
    const expected = radecToVec((2 + 46 / 60 + 11.331 / 3600) * 15, 49 + 20 / 60 + 54.54 / 3600);
    expect(toDeg(angleBetween(got, expected)) * 3600).toBeLessThan(0.5);
  });
  it('round-trips RA/Dec', () => {
    const { raDeg, decDeg } = vecToRadec(radecToVec(301.25, -12.5));
    expect(raDeg).toBeCloseTo(301.25, 12);
    expect(decDeg).toBeCloseTo(-12.5, 12);
  });
});

import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';

describe('AGC nav-star epoch', () => {
  const byHr = new Map((bsc.stars as CatalogStar[]).map((s) => [s.hr, s]));
  const maxSepArcsec = (epochJd: number) => Math.max(...agc.stars.map((s) =>
    toDeg(angleBetween(toVec3(s.vector), starDirection(byHr.get(s.hr)!, epochJd))) * 3600));

  it('AGC vectors are mean equator/equinox of B1970.0 with proper motion (≤ 0.01°)', () => {
    expect(agc.stars).toHaveLength(37);
    expect(maxSepArcsec(besselianEpochToJd(1970))).toBeLessThan(36);
  });
  it('B1970.0 fits better than neighboring epochs', () => {
    const at1970 = maxSepArcsec(besselianEpochToJd(1970));
    for (const b of [1969.0, 1969.5, 1970.5]) expect(at1970).toBeLessThan(maxSepArcsec(besselianEpochToJd(b)));
  });
});
