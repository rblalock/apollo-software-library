import { describe, expect, it } from 'vitest';
import {
  angleBetween, APOLLO_11, bodyGlobeScene, createMissionEphemeris, getToUtc, globeGeometry, globePrimitives, globeProject, parseGet,
  toRad, type EventTable, type Primitive,
} from '../src/index';
import events from '../../../data/manual/a11-events.json';
import coast from '../../../data/derived/earth-coastline.json';
import { degToPx, loadInk, matchTranslation, parallelOffsets, samplePx } from './helpers/scan';

// Pre-registered (roadmap item 2; ledger "Item 2"): disc and terminator within 2% of the disc diameter, named
// features within 3%. Orientation: plot +y = the spacecraft's inertial velocity, identified on 6(a) (ledger
// "Item 2.4") and applied unchanged to 6(b)–(d). Observer: the CSM from the mission state service at the printed GET.
const TOL_DISC = 0.02, TOL_FEATURE = 0.03, MAX_MATCH_PX = 3;
const PANELS = ['fig6a', 'fig6b', 'fig6c', 'fig6d'] as const;
const LANDMARKS = [
  { name: 'Cape Agulhas', lat: -34.83, lon: 20.0, km: 600 },
  { name: 'Cape Guardafui', lat: 11.83, lon: 51.28, km: 600 },
  { name: 'Madagascar', lat: -19.0, lon: 46.7, km: 700 },
  { name: 'Lake Victoria', lat: -1.0, lon: 32.9, km: 250 },
  { name: 'Ras al Hadd', lat: 22.53, lon: 59.8, km: 600 },
  { name: 'Kanyakumari', lat: 8.08, lon: 77.55, km: 600 },
  { name: 'Cape Verde', lat: 14.73, lon: -17.5, km: 600 },
  { name: 'Cabo de São Roque', lat: -5.48, lon: -35.26, km: 600 },
];

const eph = createMissionEphemeris(events as EventTable, APOLLO_11.rangeZeroUtc);
const earth = coast as unknown as { lines: [number, number][][]; lakes: [number, number][][] };
const allLines = [...earth.lines, ...earth.lakes];
const gc = (lat1: number, lon1: number, lat2: number, lon2: number) => angleBetween(
  [Math.cos(toRad(lat1)) * Math.cos(toRad(lon1)), Math.cos(toRad(lat1)) * Math.sin(toRad(lon1)), Math.sin(toRad(lat1))],
  [Math.cos(toRad(lat2)) * Math.cos(toRad(lon2)), Math.cos(toRad(lat2)) * Math.sin(toRad(lon2)), Math.sin(toRad(lat2))]) * 6371;
/** Consecutive runs of coastline vertices within `km` of a point. */
const near = (lat: number, lon: number, km: number) => allLines.flatMap((l) => {
  const runs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (const p of l) { if (gc(lat, lon, p[1], p[0]) <= km) cur.push(p); else if (cur.length) { runs.push(cur); cur = []; } }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length > 1);
});
const polylines = (ps: Primitive[]) => ps.flatMap((p) => (p.kind === 'polyline' ? [p.points] : []));

describe.each(PANELS)('golden: TN D-6853 %s (Earth, translunar coast)', async (id) => {
  const g = (await import(`../../../data/derived/${id}-globe.json`)).default as {
    image: { path: string }; frame: { leftX: number; rightX: number; topY: number; bottomY: number }; extentDeg: number; get: string;
    limb: { cxDeg: number; cyDeg: number; rDeg: number };
  };
  const t = parseGet(g.get), utc = getToUtc(APOLLO_11.rangeZeroUtc, t);
  const scene = bodyGlobeScene('earth', utc, eph.state('csm', t)!, g.extentDeg);
  const geo = globeGeometry(scene);
  const ink = loadInk(new URL(`../../../${g.image.path}`, import.meta.url).pathname);
  const toPx = degToPx(g.frame, g.extentDeg);
  const pxPerDeg = ((g.frame.rightX - g.frame.leftX) + (g.frame.bottomY - g.frame.topY)) / (4 * g.extentDeg);
  const diameterDeg = 2 * g.limb.rDeg;

  it('disc diameter and centre within 2% of the diameter', () => {
    const dD = Math.abs(2 * geo.radiusDeg - diameterDeg) / diameterDeg, dC = Math.hypot(g.limb.cxDeg, g.limb.cyDeg) / diameterDeg;
    console.log(`${id}: disc ${(2 * geo.radiusDeg).toFixed(4)}° vs scan ${diameterDeg.toFixed(4)}° (${(100 * dD).toFixed(2)}%), scan centre offset ${(100 * dC).toFixed(2)}%`);
    expect(dD).toBeLessThanOrEqual(TOL_DISC);
    expect(dC).toBeLessThanOrEqual(TOL_DISC);
  });

  /**
   * The model terminator, optionally shifted along the projected Sun line by `shift` (fraction of the diameter), kept
   * within 85% of the disc radius: a terminator meets the limb tangentially, so near its ends it cannot be told from
   * the limb.
   */
  const terminatorPx = (shift = 0) => {
    const d = shift * diameterDeg, [sx, sy] = geo.sunPlot;
    const lines = polylines(globePrimitives(scene, {}, { limb: false, hatch: false })).map((l) => l.map(([x, y]) => [x + d * sx, y + d * sy] as const));
    const [cx, cy] = toPx(geo.centre.x, geo.centre.y), rPx = geo.radiusDeg * pxPerDeg;
    return samplePx(lines, toPx, 4).filter(([x, y]) => Math.hypot(x - cx, y - cy) <= 0.85 * rPx);
  };
  /** Median offset (fraction of the diameter) to the printed terminator, and the share of points that found it. */
  const measureTerminator = (pts: [number, number][]) => {
    const offs = parallelOffsets(ink, pts).filter((o): o is number => o !== null).map(Math.abs).sort((a, b) => a - b);
    return { median: offs.length ? offs[Math.floor(offs.length / 2)]! / pxPerDeg / diameterDeg : Infinity, coverage: offs.length / pts.length };
  };
  const accepted = (m: { median: number; coverage: number }) => m.coverage >= 0.5 && m.median <= TOL_DISC;

  it('the terminator measure rejects a misplaced terminator (mutation check)', () => {
    for (const shift of [0.12, -0.08, 0.04]) {
      const m = measureTerminator(terminatorPx(shift));
      console.log(`${id}: terminator shifted ${100 * shift}%: median ${(100 * m.median).toFixed(2)}%, coverage ${(100 * m.coverage).toFixed(0)}%`);
      expect(accepted(m), `shift ${shift}`).toBe(false);
    }
  });

  it('terminator within 2% of the diameter (median offset along its normals)', () => {
    const pts = terminatorPx(), m = measureTerminator(pts);
    console.log(`${id}: terminator median offset ${(100 * m.median).toFixed(2)}% of the diameter, coverage ${(100 * m.coverage).toFixed(0)}% of ${pts.length} points`);
    expect(accepted(m)).toBe(true);
  });

  const visible = LANDMARKS.filter((l) => {
    const p = globeProject(scene, l.lat, l.lon);
    return p !== null && Math.hypot(p.x - geo.centre.x, p.y - geo.centre.y) <= 0.9 * geo.radiusDeg;
  });
  it.each(visible.map((l) => [l.name, l] as const))('landmark %s within 3% of the diameter', (_, l) => {
    const p = globeProject(scene, l.lat, l.lon)!;
    const tmpl = samplePx(polylines(globePrimitives(scene, { lines: near(l.lat, l.lon, l.km) }, { limb: false, terminator: false, hatch: false })), toPx, 3);
    const m = matchTranslation(ink, tmpl);
    const off = Math.hypot(m.dx, m.dy) / pxPerDeg / diameterDeg;
    console.log(`${id}: ${l.name} at (${p.x.toFixed(3)}, ${p.y.toFixed(3)})°: shift (${m.dx}, ${m.dy}) px = ${(100 * off).toFixed(2)}% of the diameter, match ${m.score.toFixed(2)} px over ${tmpl.length} points`);
    expect(m.score).toBeLessThanOrEqual(MAX_MATCH_PX);
    expect(off).toBeLessThanOrEqual(TOL_FEATURE);
  });
});
