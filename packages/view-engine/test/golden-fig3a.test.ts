import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, buildScene, FIG_3A_SPEC, fitPlotAxes, impliedSctAngles, resolveCatalog,
  type Agc37File, type BscFile, type RtccFile,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import scan from '../../../data/derived/fig3a-points.json';

const RMS_MAX_DEG = 1.0;
const WORST_MAX_DEG = 2.0;

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
const dl = buildScene(FIG_3A_SPEC, { stars });
const rows = scan.points.map((p) => {
  const b = dl.placed.find((q) => q.label === p.id);
  if (!b) throw new Error(`${p.id} is labeled on the 1972 figure but not placed by the recreation`);
  return { id: p.id, scanX: p.xDeg, scanY: p.yDeg, modelX: b.x, modelY: b.y, dist: Math.hypot(b.x - p.xDeg, b.y - p.yDeg), direction: b.direction };
});
const rms = Math.sqrt(rows.reduce((s, r) => s + r.dist ** 2, 0) / rows.length);
const worst = Math.max(...rows.map((r) => r.dist));

describe('golden: TN D-6853 Figure 3a from 1969 inputs', () => {
  it('covers every labeled body', () => {
    expect(rows.length).toBe(12);
  });
  it(`matches the 1972 scan (RMS ≤ ${RMS_MAX_DEG}°, max ≤ ${WORST_MAX_DEG}°)`, () => {
    console.table(rows.map(({ direction: _d, ...r }) => ({ ...r, dist: +r.dist.toFixed(2) })));
    console.log(`RMS ${rms.toFixed(3)}°, max ${worst.toFixed(3)}°`);
    expect(rms).toBeLessThanOrEqual(RMS_MAX_DEG);
    expect(worst).toBeLessThanOrEqual(WORST_MAX_DEG);
  });
  it('an unconstrained fit of the scan recovers the SCT at rest (trunnion ≈ 0°, shaft ≈ 0°, as-seen)', () => {
    const fit = fitPlotAxes(rows.map((r) => ({ id: r.id, x: r.scanX, y: r.scanY, direction: r.direction })));
    const a = impliedSctAngles(fit.axes);
    console.log(`fit: mirror=${fit.mirror} shaft=${a.shaftDeg.toFixed(2)}° trunnion=${a.trunnionDeg.toFixed(2)}° rms=${fit.rmsDeg.toFixed(3)}°`);
    expect(fit.mirror).toBe(false);
    expect(a.trunnionDeg).toBeLessThan(3);
    expect(Math.abs(a.shaftDeg)).toBeLessThan(5);
  });
});
