import { describe, expect, it } from 'vitest';
import {
  angleBetween, cross, det, dot, mxm, mxv, orthonormalityError, rotX, rotY, rotZ, unit,
} from '../src/index';

describe('vectors', () => {
  it('dot and cross follow the right-hand rule', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it('angleBetween is accurate for tiny and near-180° angles', () => {
    expect(angleBetween([1, 0, 0], [0, 1, 0])).toBeCloseTo(Math.PI / 2, 15);
    expect(angleBetween([1, 0, 0], [1, 1e-9, 0])).toBeCloseTo(1e-9, 18);
    expect(angleBetween([1, 0, 0], [-1, 1e-9, 0])).toBeCloseTo(Math.PI - 1e-9, 12);
  });
  it('unit rejects the zero vector', () => {
    expect(() => unit([0, 0, 0])).toThrow(/zero vector/);
  });
});

describe('matrices', () => {
  it('rotations are passive (coordinate-frame) rotations', () => {
    const v = mxv(rotZ(Math.PI / 2), [1, 0, 0]);
    expect(v[0]).toBeCloseTo(0, 15);
    expect(v[1]).toBeCloseTo(-1, 15);
    expect(v[2]).toBeCloseTo(0, 15);
  });
  it('composite rotations stay orthonormal with determinant +1', () => {
    const m = mxm(rotX(0.3), mxm(rotY(-1.1), rotZ(2)));
    expect(orthonormalityError(m)).toBeLessThan(1e-12);
    expect(det(m)).toBeCloseTo(1, 12);
  });
});
