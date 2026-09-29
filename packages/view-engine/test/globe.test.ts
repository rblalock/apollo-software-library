import { describe, expect, it } from 'vitest';
import {
  add, axesFromBoresight, cross, dot, globeGeometry, globePrimitives, norm, scale, sub, toDeg, toRad, unit,
  unprojectGnomonic, type GlobeScene, type Primitive, type Vec3,
} from '../src/index';

const R = 1000;
const lines = (ps: Primitive[]) => ps.filter((p): p is Extract<Primitive, { kind: 'polyline' }> => p.kind === 'polyline');

/** A synthetic globe: body at the origin of a J2000-like frame, pole +Z, observer on +X at distance d. */
function scene(d: number, sunDir: Vec3, extra: Partial<GlobeScene> = {}): GlobeScene {
  const observer: Vec3 = [d, 0, 0];
  return {
    radiusKm: R,
    centreKm: [0, 0, 0],
    observerKm: observer,
    sunDir: unit(sunDir),
    bodyFixedToInertial: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    axes: axesFromBoresight(sub([0, 0, 0], observer), [0, 0, 1]),
    extentDeg: 45,
    ...extra,
  };
}
const plotDir = (s: GlobeScene, x: number, y: number) => unprojectGnomonic({ x, y }, s.axes);

describe('globe geometry', () => {
  it('draws the limb as the tangent circle: projected radius tan(asin(R/d)) about the centre', () => {
    const s = scene(5 * R, [0, 1, 0]);
    const g = globeGeometry(s);
    expect(g.radiusDeg).toBeCloseTo(toDeg(Math.tan(Math.asin(1 / 5))), 9);
    const limb = lines(globePrimitives(s, {}, { hatch: false, terminator: false }));
    expect(limb.length).toBeGreaterThan(0);
    for (const [x, y] of limb[0]!.points) expect(Math.hypot(x, y)).toBeCloseTo(g.radiusDeg, 6);
  });

  it('puts the terminator r·cos(phase) from the centre, away from the Sun, for a gibbous phase (distant observer)', () => {
    const phase = toRad(60);
    // Sun direction from the body making a 60° phase angle with the observer direction (+X), in the X–Y plane.
    const s = scene(1e7, [Math.cos(phase), Math.sin(phase), 0]);
    const g = globeGeometry(s);
    const term = lines(globePrimitives(s, {}, { hatch: false, limb: false })).flatMap((l) => l.points);
    const along = term.map(([x, y]) => x * g.sunPlot[0] + y * g.sunPlot[1]);
    // Its ends sit on the limb (0 along the Sun line); its middle bulges to −r·cos(phase), the lit side being larger.
    expect(Math.min(...along) / g.radiusDeg).toBeCloseTo(-Math.cos(phase), 3);
    expect(Math.max(...along) / g.radiusDeg).toBeCloseTo(0, 3);
  });

  it('hatches the night side with great circles through the Sun axis, every 15°', () => {
    const s = scene(8 * R, [0.2, 1, 0.3]);
    const g = globeGeometry(s);
    const hatch = lines(globePrimitives(s, {}, { limb: false, terminator: false }));
    const meridians = new Set<number>();
    let psi0: number | null = null;
    expect(hatch.length).toBeGreaterThan(4);
    for (const h of hatch) for (const [x, y] of h.points.slice(1, -1)) {
      const p = g.surfacePoint(plotDir(s, x, y))!;
      expect(p).not.toBeNull();
      expect(dot(p, s.sunDir)).toBeLessThan(1e-6 * R);
      // The point, the body centre and the Sun axis are coplanar: record the plane's azimuth about the axis.
      const q = sub(p, scale(s.sunDir, dot(p, s.sunDir)));
      const [u, v] = [unit(cross(s.sunDir, [1, 0, 0])), cross(s.sunDir, unit(cross(s.sunDir, [1, 0, 0])))];
      const psi = (toDeg(Math.atan2(dot(q, v), dot(q, u))) + 360) % 180;
      psi0 ??= psi;
      const k = (psi - psi0 + 180) / 15;
      meridians.add(Math.round(k) % 12);
      expect(Math.abs(k - Math.round(k))).toBeLessThan(0.02);
    }
    expect(meridians.size).toBeGreaterThan(4);
  });

  it('draws only the visible side of a surface line and cuts it at the limb', () => {
    const s = scene(3 * R, [1, 0, 0]);
    // The equator from lon −170 to +170 in 1° steps: the observer on +X sees longitudes within acos(1/3) ≈ 70.5°.
    const eq: [number, number][] = Array.from({ length: 341 }, (_, i) => [-170 + i, 0]);
    const g = globeGeometry(s);
    const drawn = lines(globePrimitives(s, { lines: [eq] }, { limb: false, terminator: false, hatch: false }));
    expect(drawn).toHaveLength(1);
    const ends = [drawn[0]!.points[0]!, drawn[0]!.points.at(-1)!];
    for (const [x, y] of ends) expect(Math.hypot(x, y)).toBeCloseTo(g.radiusDeg, 3);
  });

  it('draws a visible crater as a closed ring around its centre', () => {
    const s = scene(3 * R, [1, 0, 0]);
    const drawn = lines(globePrimitives(s, { circles: [{ lat: 10, lon: 5, diamKm: 100 }] }, { limb: false, terminator: false, hatch: false }));
    expect(drawn).toHaveLength(1);
    expect(drawn[0]!.closed).toBe(true);
  });

  it('labels only features on the visible side', () => {
    const s = scene(3 * R, [1, 0, 0]);
    const texts = globePrimitives(s, { labels: [{ text: 'Near', lat: 0, lon: 0 }, { text: 'Far', lat: 0, lon: 180 }] }, {})
      .filter((p) => p.kind === 'text').map((p) => (p.kind === 'text' ? p.text : ''));
    expect(texts).toEqual(['Near']);
  });

  it('surfacePoint returns the near-side intersection and null off the disc', () => {
    const s = scene(4 * R, [1, 0, 0]);
    const g = globeGeometry(s);
    const p = g.surfacePoint(plotDir(s, 0, 0))!;
    expect(p[0]).toBeCloseTo(R, 6);
    expect(g.surfacePoint(plotDir(s, g.radiusDeg * 1.01, 0))).toBeNull();
    expect(norm(cross(add(p, scale([1, 0, 0], 0)), [1, 0, 0]))).toBeCloseTo(0, 6);
  });
});
