import { describe, expect, it } from 'vitest';
import { angleBetween, APOLLO_11, descentPosition, getToUtc, LANDING_SITE_2_RADIUS_KM, moonFixedToJ2000, moonState, mxv, norm, NMI_KM, parseGet, sub, toDeg, transpose, type DescentProfile } from '../src/index';

const profile: DescentProfile = {
  pdiGet: '102:35:40',
  points: [{ tfiS: 0, rangeNmi: 262, altNmi: 7.5 }, { tfiS: 300, rangeNmi: 50, altNmi: 5 }, { tfiS: 714, rangeNmi: 0, altNmi: 0 }],
};
const landing = { latDeg: 0.6875, lonDeg: 23.4333 }, pdi = { latDeg: 1.02, lonDeg: 39.39 };
const selen = (tfi: number) => {
  const t = parseGet(profile.pdiGet) + tfi, utc = getToUtc(APOLLO_11.rangeZeroUtc, t);
  const rel = sub(descentPosition(profile, landing, pdi, APOLLO_11.rangeZeroUtc, t), moonState(utc).r);
  const f = mxv(transpose(moonFixedToJ2000(utc)), rel);
  return { f, alt: (norm(rel) - LANDING_SITE_2_RADIUS_KM) / NMI_KM };
};
const fixed = (lat: number, lon: number) => [Math.cos(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180), Math.cos(lat * Math.PI / 180) * Math.sin(lon * Math.PI / 180), Math.sin(lat * Math.PI / 180)] as const;

describe('descentPosition', () => {
  it('is over the landing point at touchdown and on the ground', () => {
    const s = selen(714);
    expect(toDeg(angleBetween(s.f, fixed(landing.latDeg, landing.lonDeg)))).toBeLessThan(1e-9);
    expect(s.alt).toBeCloseTo(0, 9);
  });
  it('follows the great circle toward the PDI point at the profile’s range and altitude', () => {
    const s = selen(300);
    expect(toDeg(angleBetween(s.f, fixed(landing.latDeg, landing.lonDeg))) * (Math.PI / 180) * LANDING_SITE_2_RADIUS_KM / NMI_KM).toBeCloseTo(50, 6);
    expect(s.alt).toBeCloseTo(5, 9);
    const sep = toDeg(angleBetween(fixed(landing.latDeg, landing.lonDeg), fixed(pdi.latDeg, pdi.lonDeg)));
    // In the landing–PDI plane: angle to landing + angle to PDI = the whole arc.
    expect(toDeg(angleBetween(s.f, fixed(landing.latDeg, landing.lonDeg))) + toDeg(angleBetween(s.f, fixed(pdi.latDeg, pdi.lonDeg)))).toBeCloseTo(sep, 9);
  });
  it('interpolates linearly in time between profile points', () => {
    expect(selen(150).alt).toBeCloseTo(7.5 + (5 - 7.5) * 0.5, 9);
  });
});
