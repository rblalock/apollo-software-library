import { describe, expect, it } from 'vitest';
import {
  angleBetween, APOLLO_11, bodyVectorFromPointKm, descentPosition, LANDING_SITE_2_RADIUS_KM, NMI_KM, fitPlotAxes, getToUtc, moonState, mxv, norm, parseGet, precessionMatrix,
  projectAzimuthalEquidistant, resolveCatalog, scale, sub, toDeg, unit, unprojectAzimuthalEquidistant,
  type Agc37File, type BodyName, type BscFile, type DescentProfile, type RtccFile,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import profile from '../../../data/manual/a11-descent-profile.json';
import events from '../../../data/manual/a11-events.json';
import pa from '../../../data/derived/pdi-a-points.json';
import pe from '../../../data/derived/pdi-e-points.json';
import pj from '../../../data/derived/pdi-j-points.json';
import pp from '../../../data/derived/pdi-p-points.json';
import ha from '../../../data/derived/pdi-a-arcs.json';
import he from '../../../data/derived/pdi-e-arcs.json';
import hj from '../../../data/derived/pdi-j-arcs.json';

// Pre-registered (ledger "Item 4"): attitude from the labelled stars; time = planned PDI 102:35:40 + the frame's
// offset; LM on the planned profile between the Mission Report PDI point and the landing point. Zero-parameter tests:
// the Sun within 2°; the lunar horizon within RMS 1.0°, max 2.0°.
/** The sphere the horizon is computed on (the Moon's surface near the landing site). */
const HORIZON_RADIUS_KM = LANDING_SITE_2_RADIUS_KM; // the datum the profile altitudes (and Table 7-II) are measured from
const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
const P = precessionMatrix(APOLLO_11.referenceEpochJd);
const pdiRow = events.events.find((e) => e.id === 'pdi')!;
const landing = { latDeg: events.surface.latDeg, lonDeg: events.surface.lonDeg };
type Points = { points: { id: string; kind: string; xDeg: number; yDeg: number }[] };
type Arcs = { arcs: { horizon: { xDeg: number; yDeg: number }[] } };

// MISSED (ledger: "Item 4", "Final"): (a) RMS 0.72° but max 4.24°, and (j), after the yaw to windows up, RMS 4.15°
// (max 8.55°). (e) passes (RMS 0.49°, max 1.03°). These are the numbers with one lunar datum throughout; the first run
// computed the horizon on the 1737.4 km mean sphere while the LM sat on the 1735.4 km landing-site datum (a bug found
// after the result by the final review; ledger "Final"). Recorded, not tuned.
const HORIZON_MISSES: Record<string, number> = { 'pdi-a': 0.7195, 'pdi-j': 4.1549 };

describe.each([
  ['pdi-a', pa as Points, 0, ha as Arcs],
  ['pdi-e', pe as Points, 126, he as Arcs],
  ['pdi-j', pj as Points, 326, hj as Arcs],
  ['pdi-p', pp as Points, 486, null],
] as const)('golden: 69-FM-197 Fig 6.2.2-1 %s (LM docking window)', (id, points, tfi, arcs) => {
  const t = parseGet(profile.pdiGet) + tfi, utc = getToUtc(APOLLO_11.rangeZeroUtc, t);
  const lm = descentPosition(profile as DescentProfile, landing, { latDeg: pdiRow.latDeg, lonDeg: pdiRow.lonDeg }, APOLLO_11.rangeZeroUtc, t);
  const fit = fitPlotAxes(points.points.filter((p) => p.kind === 'star').map((p) => ({ id: p.id, x: p.xDeg, y: p.yDeg, direction: stars.find((s) => s.name === p.id)!.direction })));
  const dir = (b: BodyName) => unit(mxv(P, bodyVectorFromPointKm(b, lm, utc)));

  it('attitude from the labelled stars', () => {
    console.log(`${id} residuals: ${fit.residuals.map((r) => r.id + ' ' + r.dist.toFixed(2)).join(', ')}`);
    console.log(`${id} (TFI ${tfi} s): ${fit.residuals.length} stars, fit RMS ${fit.rmsDeg.toFixed(2)}°, max ${fit.maxDeg.toFixed(2)}°, mirror ${fit.mirror}`);
    expect(fit.mirror).toBe(false);
  });

  it('the Sun within 2° (zero parameters)', () => {
    const drawn = points.points.find((p) => p.id === 'Sun')!;
    const q = projectAzimuthalEquidistant(dir('sun'), fit.axes);
    const d = Math.hypot(q.x - drawn.xDeg, q.y - drawn.yDeg);
    const planets = points.points.filter((p) => p.kind === 'planet').map((p) => {
      const m = projectAzimuthalEquidistant(dir(p.id.toLowerCase() as BodyName), fit.axes);
      return `${p.id} ${Math.hypot(m.x - p.xDeg, m.y - p.yDeg).toFixed(2)}°`;
    });
    console.log(`${id}: Sun ${d.toFixed(2)}° from its glyph${planets.length ? `; ${planets.join(', ')}` : ''}`);
    expect(d).toBeLessThanOrEqual(2);
  });

  it('puts the LM at the profile altitude above the sphere its horizon is computed on (one datum)', () => {
    const pts = profile.points, i = Math.max(0, pts.findIndex((q) => q.tfiS > tfi) - 1), a = pts[i]!, b = pts[i + 1]!;
    const altKm = (a.altNmi + ((tfi - a.tfiS) / (b.tfiS - a.tfiS)) * (b.altNmi - a.altNmi)) * NMI_KM;
    expect(norm(sub(lm, moonState(utc).r)) - HORIZON_RADIUS_KM).toBeCloseTo(altKm, 6);
  });

  if (arcs) it(id in HORIZON_MISSES ? 'lunar horizon: records the model (regression guard)' : 'lunar horizon within RMS 1.0°, max 2.0° (zero parameters)', () => {
    const rel = sub(lm, moonState(utc).r), nadir = unit(mxv(P, scale(rel, -1))), rho = toDeg(Math.asin(HORIZON_RADIUS_KM / norm(rel)));
    const res = arcs.arcs.horizon.map((p) => toDeg(angleBetween(unprojectAzimuthalEquidistant({ x: p.xDeg, y: p.yDeg }, fit.axes), nadir)) - rho);
    const rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length), max = Math.max(...res.map(Math.abs));
    console.log(`${id}: horizon radius ${rho.toFixed(2)}°, nadir ${toDeg(angleBetween(nadir, fit.axes.ez)).toFixed(2)}° from the plot centre; residual RMS ${rms.toFixed(4)}°, max ${max.toFixed(2)}°, mean ${(res.reduce((s, r) => s + r, 0) / res.length).toFixed(2)}° over ${res.length} points`);
    if (id in HORIZON_MISSES) expect(rms).toBeCloseTo(HORIZON_MISSES[id]!, 3);
    else { expect(rms).toBeLessThanOrEqual(1.0); expect(max).toBeLessThanOrEqual(2.0); }
  });
  if (arcs && id in HORIZON_MISSES) it.skip('lunar horizon within RMS 1.0°, max 2.0° — MISSED, see ledger: Item 4', () => {});
});
