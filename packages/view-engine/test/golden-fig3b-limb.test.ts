import { describe, expect, it } from 'vitest';
import {
  angleBetween, APOLLO_11, bodyVectorFromPointKm, createMissionEphemeris, FIG_3B_SPEC, getToUtc, mxv, norm, parseGet,
  precessionMatrix, referenceToOptics, sctPlotAxes, toDeg, unit, unprojectAzimuthalEquidistant, type EventTable,
} from '../src/index';
import events from '../../../data/manual/a11-events.json';
import limb from '../../../data/derived/fig3b-limb.json';

// Pre-registered in the ledger (Item 5.7) before the limb was digitized: RMS ≤ 1.0°, max ≤ 2.0°.
const eph = createMissionEphemeris(events as EventTable, APOLLO_11.rangeZeroUtc);
const utc = getToUtc(APOLLO_11.rangeZeroUtc, FIG_3B_SPEC.get);
const csm = eph.state('csm', parseGet(FIG_3B_SPEC.get))!;
const toMoon = bodyVectorFromPointKm('moon', csm.r, utc);
const moonDir = mxv(referenceToOptics(FIG_3B_SPEC.refsmmat, FIG_3B_SPEC.gimbals), unit(mxv(precessionMatrix(FIG_3B_SPEC.referenceEpochJd), toMoon)));
const rho = toDeg(Math.asin(1737.4 / norm(toMoon)));
const axes = sctPlotAxes(0, 0);
const residuals = limb.points.map((p) => toDeg(angleBetween(unprojectAzimuthalEquidistant({ x: p.xDeg, y: p.yDeg }, axes), moonDir)) - rho);
const rms = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);
const max = Math.max(...residuals.map(Math.abs));

// MISSED (ledger: "Item 5.7"): the printed limb is an accurate small circle (free fit RMS 0.16°) of radius 37.8°
// centred 72.8° from the boresight, but the Moon seen from the CSM at 58 n.mi has radius 70.3° centred 101.4° away.
// No CSM position on the orbit gives a 37.8° Moon (that needs ~1,100 km altitude), and a 70.3° circle cannot follow
// the printed curve (best RMS 4.4°): the 1969 program drew the horizon differently. Recorded, not tuned.
describe('golden: Fig 3b Moon limb from the reconstructed CSM position', () => {
  it('records the model (regression guard)', () => {
    console.log(`CSM from ${csm.anchor}: Moon angular radius ${rho.toFixed(2)}°, centre ${toDeg(angleBetween(moonDir, axes.ez)).toFixed(2)}° from the boresight; limb residual RMS ${rms.toFixed(2)}°, max ${max.toFixed(2)}° over ${residuals.length} points`);
    expect(csm.anchor).toBe('docking-2');
    expect(rho).toBeCloseTo(70.32, 1);
    expect(toDeg(angleBetween(moonDir, axes.ez))).toBeCloseTo(101.43, 1);
    expect(rms).toBeCloseTo(8.8, 1);
  });
  it.skip('limb within RMS 1.0°, max 2.0° of the scan — MISSED, see ledger: Item 5.7', () => {});
});
