import { describe, expect, it } from 'vitest';
import {
  AOT_DETENTS, APOLLO_11, angleBetween, bodyDirection, dot, FIG_4_GET, FIG_4_LM_BODY_FROM_REF, fitPlotAxes, getToUtc,
  lmAttitudeFromAotFit, resolveCatalog, siteFrame, toDeg, type Agc37File, type BscFile, type RtccFile, type Vec3,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import panelA from '../../../data/derived/fig4a-points.json';

// The LM's surface attitude is not printed, so it is fitted on TN D-6853 Fig 4(a) ONLY and frozen;
// panels (b)–(f) are then predicted with no further parameters (golden-fig4.test.ts).
const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
const utc = getToUtc(APOLLO_11.rangeZeroUtc, FIG_4_GET);
const epoch = APOLLO_11.referenceEpochJd;
const dir = (id: string): Vec3 =>
  id === 'Earth' ? bodyDirection('earth', 'moon', utc, epoch)
    : id === 'Saturn' ? bodyDirection('saturn', 'moon', utc, epoch)
      : stars.find((s) => s.name === id)!.direction;
const fit = fitPlotAxes(panelA.points.map((p) => ({ id: p.id, x: p.xDeg, y: p.yDeg, direction: dir(p.id) })));
const lm = lmAttitudeFromAotFit(fit.axes, AOT_DETENTS.front);
const row = (m: readonly (readonly number[])[], i: number) => m[i] as unknown as Vec3;

describe('LM surface attitude from Fig 4(a)', () => {
  it('fits panel (a) as seen (not mirrored) within the scan precision', () => {
    expect(fit.mirror).toBe(false);
    expect(fit.rmsDeg).toBeLessThan(1.0);
  });
  it('matches the frozen FIG_4_LM_BODY_FROM_REF', () => {
    for (let i = 0; i < 3; i++) expect(toDeg(angleBetween(row(lm, i), row(FIG_4_LM_BODY_FROM_REF, i)))).toBeLessThan(0.01);
  });
  it('is physically plausible: +X within 5° of the landing-site vertical, +Z heading west (planned 270°)', () => {
    const site = siteFrame(0.67416, 23.47314, utc, epoch);
    const x = row(FIG_4_LM_BODY_FROM_REF, 0), z = row(FIG_4_LM_BODY_FROM_REF, 2);
    expect(toDeg(angleBetween(x, site.up))).toBeLessThan(5);
    const az = (toDeg(Math.atan2(dot(z, site.east), dot(z, site.north))) + 360) % 360;
    expect(Math.abs(az - 270)).toBeLessThan(5);
  });
  it('agrees with the 1969 Lunar landing site REFSMMAT (69-FM-197 Table II(c)) to within the Moon\'s 2-hour rotation', () => {
    for (let i = 0; i < 3; i++) {
      const sep = toDeg(angleBetween(row(FIG_4_LM_BODY_FROM_REF, i), row(APOLLO_11.refsmmat.landingSite, i)));
      expect(sep).toBeLessThan(3);
    }
  });
});
