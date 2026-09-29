import { describe, expect, it } from 'vitest';
import {
  box, frustum, norm, prism, strut, sub, validateConvex, visibleSegments, type ConvexPart, type Segment3, type Vec3,
} from '../src/index';

const len = (s: Segment3) => norm(sub(s.b, s.a));
const total = (ss: Segment3[]) => ss.reduce((a, s) => a + len(s), 0);
const cube = box('cube', [-1, -1, -1], [1, 1, 1]);

describe('solids', () => {
  it.each([
    ['box', cube],
    ['octagonal prism', prism('p', 8, 2, -1, 1)],
    ['frustum', frustum('f', 12, 2, 1, 0, 3)],
    ['strut', strut('s', [0, 0, 0], [1, 2, 3], 0.1)],
  ] as const)('%s is closed, convex and outward-facing', (_, part) => {
    expect(validateConvex(part)).toEqual([]);
  });

  it('validateConvex reports an inward-facing face', () => {
    const bad: ConvexPart = { ...cube, faces: cube.faces.map((f, i) => (i === 0 ? [...f].reverse() : f)) };
    expect(validateConvex(bad).join(' ')).toMatch(/face 0/);
  });

  it('strut runs between its end points', () => {
    const s = strut('s', [0, 0, 0], [0, 0, 5], 0.2);
    const zs = s.vertices.map((v) => v[2]);
    expect(Math.min(...zs)).toBeCloseTo(0, 12);
    expect(Math.max(...zs)).toBeCloseTo(5, 12);
  });
});

describe('hidden-line removal', () => {
  it('a cube seen from a corner direction shows 9 whole edges', () => {
    const vis = visibleSegments([cube], [5, 4, 3]);
    expect(vis).toHaveLength(9);
    expect(total(vis)).toBeCloseTo(18, 9);
  });

  it('a cube seen face-on shows only the front face', () => {
    const vis = visibleSegments([cube], [0, 0, 5]);
    expect(vis).toHaveLength(4);
    expect(vis.every((s) => s.a[2] === 1 && s.b[2] === 1)).toBe(true);
  });

  it('hides a solid entirely behind another', () => {
    const small = box('small', [-0.25, -0.25, -3], [0.25, 0.25, -2.5]);
    expect(visibleSegments([cube, small], [0, 0, 5]).filter((s) => s.part === 'small')).toEqual([]);
  });

  it('splits an edge that passes behind another solid at the analytic shadow boundary', () => {
    const bar = box('bar', [-3, -0.2, -3], [3, 0.2, -2.6]);
    const pieces = visibleSegments([cube, bar], [0, 0, 5])
      .filter((s) => s.part === 'bar' && s.a[1] === 0.2 && s.b[1] === 0.2 && s.a[2] === -2.6 && s.b[2] === -2.6);
    // A point (x, 0.2, −2.6) is hidden when its ray from the eye crosses z = 1 within |x'| ≤ 1: |x| ≤ 7.6 / 4 = 1.9.
    const xs = pieces.map((s) => [Math.min(s.a[0], s.b[0]), Math.max(s.a[0], s.b[0])]).sort((p, q) => p[0]! - q[0]!);
    expect(xs).toHaveLength(2);
    // Shadow boundaries carry the clipper's 1e-9 × scene-size margin, hence 6 decimals.
    expect(xs[0]![0]).toBeCloseTo(-3, 6);
    expect(xs[0]![1]).toBeCloseTo(-1.9, 6);
    expect(xs[1]![0]).toBeCloseTo(1.9, 6);
    expect(xs[1]![1]).toBeCloseTo(3, 6);
  });

  it('hides the part of a wire behind a solid and keeps a wire in front', () => {
    const vis = visibleSegments([
      cube,
      { kind: 'wire', name: 'behind', segments: [[[-3, 0, -2], [3, 0, -2]]] },
      { kind: 'wire', name: 'front', segments: [[[-3, 0, 2], [3, 0, 2]]] },
    ], [0, 0, 5]);
    const behind = vis.filter((s) => s.part === 'behind');
    expect(behind).toHaveLength(2);
    expect(total(behind)).toBeCloseTo(2 * (3 - 1.75), 6); // hidden for |x| ≤ 7/4
    expect(total(vis.filter((s) => s.part === 'front'))).toBeCloseTo(6, 9);
  });

  it('keeps seams where solids touch, and hides the seams behind them', () => {
    const eye: Vec3 = [4, 3, 1.5];
    const lower = box('lower', [-1, -1, 0], [1, 1, 1]), upper = box('upper', [-1, -1, 1], [1, 1, 2]);
    const vis = visibleSegments([lower, upper], eye);
    // The single tall box shows 7 edges (14 units); the two front seams (2 + 2) are drawn once per solid.
    expect(total(vis)).toBeCloseTo(14 + 8, 9);
    const onBackSeam = (s: Segment3) => s.a[2] === 1 && s.b[2] === 1 && (s.a[0] === -1 && s.b[0] === -1 || s.a[1] === -1 && s.b[1] === -1);
    expect(vis.filter(onBackSeam)).toEqual([]);
  });
});
