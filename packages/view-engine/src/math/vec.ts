export type Vec3 = readonly [number, number, number];

export const DEG = Math.PI / 180;
export const toRad = (deg: number): number => deg * DEG;
export const toDeg = (rad: number): number => rad / DEG;

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export function unit(a: Vec3): Vec3 {
  const n = norm(a);
  if (n === 0) throw new Error('unit(): zero vector');
  return scale(a, 1 / n);
}

/** Angle between two vectors in radians; accurate near 0 and near π. */
export const angleBetween = (a: Vec3, b: Vec3): number => Math.atan2(norm(cross(a, b)), dot(a, b));

/** Narrow a JSON number[] to a Vec3. */
export function toVec3(a: readonly number[]): Vec3 {
  if (a.length !== 3 || a.some((x) => !Number.isFinite(x))) throw new Error(`toVec3(): bad vector ${JSON.stringify(a)}`);
  return [a[0]!, a[1]!, a[2]!];
}
