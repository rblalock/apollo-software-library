import { describe, expect, it } from 'vitest';
import {
  angleBetween, axesFromBoresight, cross, dot, projectAzimuthalEquidistant, toDeg, toRad, unit,
  unprojectAzimuthalEquidistant, type Vec3,
} from '../src/index';

const axes = axesFromBoresight([0, 0, 1], [0, 1, 0]);
const s10 = Math.sin(toRad(10)), c10 = Math.cos(toRad(10));

describe('axesFromBoresight', () => {
  it('builds the as-seen (non-mirrored) basis: ex = ez × ey', () => {
    expect(dot(cross(axes.ez, axes.ey), axes.ex)).toBeCloseTo(1, 15);
    const m = axesFromBoresight([0, 0, 1], [0, 1, 0], true);
    expect(dot(cross(m.ez, m.ey), m.ex)).toBeCloseTo(-1, 15);
  });
});

describe('azimuthal equidistant', () => {
  it('maps the boresight to the origin and offsets to degrees along each axis', () => {
    const o = projectAzimuthalEquidistant([0, 0, 1], axes);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(0, 12);
    const up = projectAzimuthalEquidistant([0, s10, c10], axes);
    expect(up.x).toBeCloseTo(0, 12);
    expect(up.y).toBeCloseTo(10, 12);
    const right = projectAzimuthalEquidistant([-s10, 0, c10], axes); // here ex = ez × ey = (−1, 0, 0)
    expect(right.x).toBeCloseTo(10, 12);
    expect(right.y).toBeCloseTo(0, 12);
  });
  it('radius equals the angle from the boresight, and unproject inverts project', () => {
    for (const v of [[0.3, -0.2, 0.9], [-0.7, 0.1, 0.2], [0.1, 0.9, -0.4]] as Vec3[]) {
      const p = projectAzimuthalEquidistant(v, axes);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(toDeg(angleBetween(v, axes.ez)), 10);
      expect(toDeg(angleBetween(unprojectAzimuthalEquidistant(p, axes), unit(v)))).toBeLessThan(1e-9);
    }
  });
  it('stays finite at and near the antipode of the boresight', () => {
    for (const v of [[0, 0, -1], [1e-12, 0, -1]] as Vec3[]) {
      const p = projectAzimuthalEquidistant(v, axes);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(180, 6);
    }
  });
});
