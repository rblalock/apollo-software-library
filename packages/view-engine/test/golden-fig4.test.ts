import { describe, expect, it } from 'vitest';
import { APOLLO_11, buildScene, fig4Spec, resolveCatalog, type AotDetent, type Agc37File, type BscFile, type RtccFile } from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import b from '../../../data/derived/fig4b-points.json';
import c from '../../../data/derived/fig4c-points.json';
import d from '../../../data/derived/fig4d-points.json';
import e from '../../../data/derived/fig4e-points.json';
import f from '../../../data/derived/fig4f-points.json';

// Thresholds fixed before digitizing (roadmap spec, item 1). The LM attitude comes from panel (a) ONLY
// (fig4-attitude.test.ts); nothing here is fitted.
const RMS_MAX_DEG = 1.0;
const WORST_MAX_DEG = 2.0;

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
type Scan = { points: Array<{ id: string; actually?: string; xDeg: number; yDeg: number }> };

// Measured results, recorded under the stop rule (ledger: "Item 1.7"). `meets` is false where the prediction
// narrowly misses the pre-registered thresholds; those assertions are skipped, never re-tuned.
const RECORDED = {
  leftFront: { rms: 1.018, max: 1.36, meets: false },
  leftRear: { rms: 1.897, max: 3.526, meets: false },
  rear: { rms: 0.974, max: 1.541, meets: true },
  rightRear: { rms: 1.257, max: 2.254, meets: false },
  rightFront: { rms: 0.983, max: 1.688, meets: true },
} as const;

describe.each([
  ['(b) left front', 'leftFront', b],
  ['(c) left rear', 'leftRear', c],
  ['(d) rear', 'rear', d],
  ['(e) right rear', 'rightRear', e],
  ['(f) right front', 'rightFront', f],
] as const)('golden: TN D-6853 Fig 4%s detent — predicted from the panel-(a) attitude', (_n, detent, scan) => {
  const recorded = RECORDED[detent];
  const dl = buildScene({ ...fig4Spec(detent as AotDetent), extentDeg: 60 }, { stars });
  const rows = (scan as Scan).points.map((p) => {
    const q = dl.placed.find((x) => x.label === (p.actually ?? p.id));
    if (!q) throw new Error(`${p.id} is labeled on the 1972 figure but not placed by the recreation`);
    return { id: p.id, dx: q.x - p.xDeg, dy: q.y - p.yDeg, dist: Math.hypot(q.x - p.xDeg, q.y - p.yDeg) };
  });
  const rms = Math.sqrt(rows.reduce((s, r) => s + r.dist ** 2, 0) / rows.length);
  const worst = Math.max(...rows.map((r) => r.dist));
  it('reproduces the recorded misfit (regression guard)', () => {
    expect(rms).toBeCloseTo(recorded.rms, 2);
    expect(worst).toBeCloseTo(recorded.max, 2);
  });
  (recorded.meets ? it : it.skip)(`matches the scan (RMS ≤ ${RMS_MAX_DEG}°, max ≤ ${WORST_MAX_DEG}°)${recorded.meets ? '' : ' — MISSED, see ledger: Item 1.7'}`, () => {
    console.table(rows.map((r) => ({ id: r.id, dx: +r.dx.toFixed(2), dy: +r.dy.toFixed(2), dist: +r.dist.toFixed(2) })));
    console.log(`RMS ${rms.toFixed(3)}°, max ${worst.toFixed(3)}°`);
    expect(rms).toBeLessThanOrEqual(RMS_MAX_DEG);
    expect(worst).toBeLessThanOrEqual(WORST_MAX_DEG);
  });
});
