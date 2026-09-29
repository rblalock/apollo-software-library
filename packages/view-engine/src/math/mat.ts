import { cross, dot, type Vec3 } from './vec';

/** Row-major 3×3 matrix, as the AGC and the MSC notes print them. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

export const mxv = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];

export const transpose = (m: Mat3): Mat3 => [
  [m[0][0], m[1][0], m[2][0]],
  [m[0][1], m[1][1], m[2][1]],
  [m[0][2], m[1][2], m[2][2]],
];

export function mxm(a: Mat3, b: Mat3): Mat3 {
  const bt = transpose(b);
  const row = (r: Vec3): Vec3 => [dot(r, bt[0]), dot(r, bt[1]), dot(r, bt[2])];
  return [row(a[0]), row(a[1]), row(a[2])];
}

export const det = (m: Mat3): number => dot(m[0], cross(m[1], m[2]));

/** Largest deviation of m·mᵀ from the identity. */
export function orthonormalityError(m: Mat3): number {
  const p = mxm(m, transpose(m));
  let e = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) e = Math.max(e, Math.abs(p[i]![j]! - (i === j ? 1 : 0)));
  return e;
}

// Passive (coordinate-frame) rotations: v' = R·v expresses v in a frame rotated by +a.
// These are the rotations the AGC's CALCGA/SMNB routines compose.
export function rotX(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [[1, 0, 0], [0, c, s], [0, -s, c]];
}
export function rotY(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
}
export function rotZ(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
}
