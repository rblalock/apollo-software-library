import { describe, expect, it } from 'vitest';
import {
  add, angleBetween, APOLLO_11, bodyVectorFromPointKm, createMissionEphemeris, cross, fitPlotAxes, getToUtc, mxv, norm, parseGet,
  precessionMatrix, projectAzimuthalEquidistant, resolveCatalog, scale, stateToEarthEvent, toDeg, toRad, unit,
  unprojectAzimuthalEquidistant, type Agc37File, type BscFile, type EventTable, type RtccFile, type Vec3,
} from '../src/index';
import events from '../../../data/manual/a11-events.json';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import p1 from '../../../data/derived/fig1-points.json';
import p2 from '../../../data/derived/fig2-points.json';
import a1 from '../../../data/derived/fig1-arcs.json';
import a2 from '../../../data/derived/fig2-arcs.json';
import c1 from '../../../data/manual/figures/fig1.json';
import c2 from '../../../data/manual/figures/fig2.json';

// Pre-registered (ledger "Item 3"): attitude from labelled stars only; time where the reconstructed altitude equals
// the printed one; the Earth's horizon (and Fig 1's terminator) then predicted with no further parameters, within
// RMS 1.0° and max 2.0° of the traced arcs; the Fig 2 window outline within 2° of Fig 1's at every vertex.
const eph = createMissionEphemeris(events as EventTable, APOLLO_11.rangeZeroUtc);
const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
const P = precessionMatrix(APOLLO_11.referenceEpochJd);
const R_EARTH = 6378.137;

/** GET (s) in [from, to] where the reconstructed geodetic altitude equals `statMi`. */
function atAltitude(from: string, to: string, statMi: number): number {
  const alt = (t: number) => (stateToEarthEvent(eph.state('csm', t)!, getToUtc(APOLLO_11.rangeZeroUtc, t)).altNmi * 1.852) / 1.609344;
  let a = parseGet(from), b = parseGet(to);
  const rising = alt(b) > alt(a);
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if ((alt(m) < statMi) === rising) a = m; else b = m; }
  return a;
}

type Points = { points: { id: string; kind: string; xDeg: number; yDeg: number }[] };
type Arcs = { arcs: Record<string, { xDeg: number; yDeg: number }[]> };
function view(points: Points, t: number) {
  const utc = getToUtc(APOLLO_11.rangeZeroUtc, t), r = eph.state('csm', t)!.r;
  const fit = fitPlotAxes(points.points.filter((p) => p.kind === 'star').map((p) => ({ id: p.id, x: p.xDeg, y: p.yDeg, direction: stars.find((s) => s.name === p.id)!.direction })));
  const nadir = unit(mxv(P, scale(r, -1))), rho = toDeg(Math.asin(R_EARTH / norm(r)));
  const sun = unit(mxv(P, bodyVectorFromPointKm('sun', [0, 0, 0], utc)));
  return { fit, r: mxv(P, r), nadir, rho, sun, utc };
}
const stats = (xs: number[]) => ({ rms: Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length), max: Math.max(...xs.map(Math.abs)) });

// MISSED (ledger: "Item 3.3"): the printed horizons are accurate small circles (free fits 0.23/0.29° RMS) of radius
// 43.7° (Fig 1) and 39.1° (Fig 2), centred 69°/72° from the plot centre, where the Earth seen from 192 and 302 stat. mi.
// is 72.5°/68.3° in radius and centred 95.8°/100.1° away — the same pattern as the Moon on Fig 3b (38.0° vs 70.3°).
// Fig 1's terminator follows the misdrawn Earth. Recorded with pinned values, not tuned.
const MEASURED = { fig1: { horizonRms: 8.50, terminatorRms: 20.30 }, fig2: { horizonRms: 8.38, terminatorRms: NaN } } as const;

describe.each([
  ['fig1', p1 as Points, a1 as Arcs, atAltitude('2:44:17', '2:50:03', 192)],
  ['fig2', p2 as Points, a2 as Arcs, atAltitude('194:49:13', '195:03:05', 302)],
] as const)('golden: TN D-6853 %s (CM window view)', (id, points, arcs, t) => {
  const v = view(points, t);
  it('attitude from the labelled stars', () => {
    console.log(`${id} at GET ${(t / 3600).toFixed(4)} h: star fit RMS ${v.fit.rmsDeg.toFixed(3)}°, max ${v.fit.maxDeg.toFixed(3)}°, mirror ${v.fit.mirror}`);
    expect(v.fit.mirror).toBe(false);
  });
  it('Earth horizon: records the model (regression guard)', () => {
    const res = arcs.arcs.horizon!.map((p) => toDeg(angleBetween(unprojectAzimuthalEquidistant({ x: p.xDeg, y: p.yDeg }, v.fit.axes), v.nadir)) - v.rho);
    const s = stats(res);
    console.log(`${id}: nadir ${toDeg(angleBetween(v.nadir, v.fit.axes.ez)).toFixed(2)}° from the plot centre at azimuth ${toDeg(Math.atan2(-(v.nadir[0]*v.fit.axes.ex[0]+v.nadir[1]*v.fit.axes.ex[1]+v.nadir[2]*v.fit.axes.ex[2]), v.nadir[0]*v.fit.axes.ey[0]+v.nadir[1]*v.fit.axes.ey[1]+v.nadir[2]*v.fit.axes.ey[2])).toFixed(1)}°`);
    console.log(`${id}: horizon (radius ${v.rho.toFixed(2)}°) residual RMS ${s.rms.toFixed(3)}°, max ${s.max.toFixed(3)}° over ${res.length} points`);
    expect(s.rms).toBeCloseTo(MEASURED[id].horizonRms, 1);
  });
  it.skip('Earth horizon within RMS 1.0°, max 2.0° — MISSED, see ledger: Item 3.3', () => {});
  if (arcs.arcs.terminator) it('terminator: records the model (regression guard)', () => {
    // The visible part of the terminator great circle, as seen from the spacecraft, projected like the stars.
    const s = v.sun, u = unit(cross(s, Math.abs(s[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), w = cross(s, u);
    const model = Array.from({ length: 7200 }, (_, i) => {
      const p = scale(add(scale(u, Math.cos(toRad(i / 20))), scale(w, Math.sin(toRad(i / 20)))), R_EARTH);
      const rel = add(p, scale(v.r, -1));
      // Visible from the spacecraft when the point faces it (p·r > R²).
      return p[0] * v.r[0] + p[1] * v.r[1] + p[2] * v.r[2] > R_EARTH ** 2 ? projectAzimuthalEquidistant(unit(rel), v.fit.axes) : null;
    }).filter((q): q is { x: number; y: number } => q !== null);
    const res = arcs.arcs.terminator!.map((p) => Math.min(...model.map((q) => Math.hypot(q.x - p.xDeg, q.y - p.yDeg))));
    const st = stats(res);
    console.log(`${id}: terminator residual RMS ${st.rms.toFixed(3)}°, max ${st.max.toFixed(3)}° over ${res.length} points (${model.length} model points)`);
    expect(st.rms).toBeCloseTo(MEASURED[id].terminatorRms, 1);
  });
  if (arcs.arcs.terminator) it.skip('terminator within RMS 1.0°, max 2.0° — MISSED, see ledger: Item 3.3', () => {});
});

describe('golden: the commander’s window outline is the same on Figs 1 and 2', () => {
  const deg = (c: { outlineVerticesPx: Record<string, number[]> }, pts: { frame?: unknown }, name: string) => {
    const f = (pts as unknown as { frame: { leftX: number; rightX: number; topY: number; bottomY: number } }).frame, [x, y] = c.outlineVerticesPx[name]!;
    return [-50 + (100 * (x! - f.leftX)) / (f.rightX - f.leftX), 50 - (100 * (y! - f.topY)) / (f.bottomY - f.topY)] as const;
  };
  it.each(Object.keys(c1.outlineVerticesPx))('%s within 2°', (name) => {
    const a = deg(c1, p1, name), b = deg(c2, p2, name), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    console.log(`outline ${name}: Fig 1 (${a[0].toFixed(2)}, ${a[1].toFixed(2)})°, Fig 2 (${b[0].toFixed(2)}, ${b[1].toFixed(2)})°, ${d.toFixed(2)}°`);
    expect(d).toBeLessThanOrEqual(2);
  });
});
