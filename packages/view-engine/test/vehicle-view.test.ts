import { describe, expect, it } from 'vitest';
import { axesFromBoresight, box, projectGnomonic, toDeg, toRad, vehiclePrimitives, type Primitive } from '../src/index';

const lines = (ps: Primitive[]) => ps.filter((p): p is Extract<Primitive, { kind: 'polyline' }> => p.kind === 'polyline');

describe('gnomonic projection', () => {
  const axes = axesFromBoresight([0, 0, 1], [0, 1, 0]);
  it('puts the boresight at the origin and keeps straight lines straight (tangent-plane units, in degrees)', () => {
    expect(projectGnomonic([0, 0, 1], axes)).toEqual({ x: 0, y: 0 });
    // Looking along +z with +y up, the as-seen right (plot +x) is world −x.
    const p = projectGnomonic([-Math.sin(toRad(10)), 0, Math.cos(toRad(10))], axes)!;
    expect(p.x).toBeCloseTo(toDeg(Math.tan(toRad(10))), 12);
    expect(p.y).toBeCloseTo(0, 12);
  });
  it('returns null behind the eye', () => expect(projectGnomonic([0, 0, -1], axes)).toBeNull());
});

describe('vehiclePrimitives', () => {
  const cube = box('cube', [-1, -1, -1], [1, 1, 1]);
  it('draws each visible edge as a two-point polyline inside the frame', () => {
    const ps = lines(vehiclePrimitives([cube], { eye: [5, 4, 3], target: [0, 0, 0], up: [0, 0, 1], extentDeg: 30 }));
    expect(ps).toHaveLength(9);
    for (const p of ps) {
      expect(p.points).toHaveLength(2);
      for (const [x, y] of p.points) expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(30 + 1e-9);
    }
  });
  it('clips lines to the plot frame', () => {
    const ps = lines(vehiclePrimitives([{ kind: 'wire', name: 'w', segments: [[[-100, 0, 0], [100, 0, 0]]] }], { eye: [0, 0, 10], target: [0, 0, 0], up: [0, 1, 0], extentDeg: 20 }));
    expect(ps).toHaveLength(1);
    const xs = ps[0]!.points.map(([x]) => x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(-20, 9);
    expect(xs[1]).toBeCloseTo(20, 9);
  });
  it('clips lines that pass behind the eye at the near plane', () => {
    const ps = lines(vehiclePrimitives([{ kind: 'wire', name: 'w', segments: [[[0.5, 0, -5], [0.5, 0, 20]]] }], { eye: [0, 0, 10], target: [0, 0, 0], up: [0, 1, 0], extentDeg: 45 }));
    for (const p of ps) for (const [x, y] of p.points) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(ps).toHaveLength(1);
  });
});
