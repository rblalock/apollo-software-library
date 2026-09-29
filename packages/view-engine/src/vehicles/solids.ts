import { det, mxv, type Mat3 } from '../math/mat';
import { add, cross, dot, norm, scale, sub, unit, type Vec3 } from '../math/vec';

/** A closed convex polyhedron; each face lists vertex indices counter-clockwise seen from outside. */
export interface ConvexPart { kind: 'solid'; name: string; vertices: Vec3[]; faces: number[][]; group?: string }
/** Line work that is hidden by solids but hides nothing (antennas, probes, handrails). */
export interface WirePart { kind: 'wire'; name: string; segments: [Vec3, Vec3][]; group?: string }
export type Part = ConvexPart | WirePart;

export function box(name: string, min: Vec3, max: Vec3): ConvexPart {
  const [x0, y0, z0] = min, [x1, y1, z1] = max;
  return {
    kind: 'solid', name,
    vertices: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]],
  };
}

/** A regular n-sided frustum along +z from radius r0 at z0 to r1 at z1 (circumradii; both > 0). */
export function frustum(name: string, sides: number, r0: number, r1: number, z0: number, z1: number, phaseRad = 0): ConvexPart {
  const ring = (r: number, z: number): Vec3[] => Array.from({ length: sides }, (_, i) => {
    const a = phaseRad + (2 * Math.PI * i) / sides;
    return [r * Math.cos(a), r * Math.sin(a), z];
  });
  const faces: number[][] = [Array.from({ length: sides }, (_, i) => sides - 1 - i), Array.from({ length: sides }, (_, i) => sides + i)];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    faces.push([i, j, sides + j, sides + i]);
  }
  return { kind: 'solid', name, vertices: [...ring(r0, z0), ...ring(r1, z1)], faces };
}

export const prism = (name: string, sides: number, r: number, z0: number, z1: number, phaseRad = 0): ConvexPart =>
  frustum(name, sides, r, r, z0, z1, phaseRad);

/** Apply p' = m·p + t to every point. `m` must be a proper rotation (det +1) so faces keep their orientation. */
export function transformPart<P extends Part>(part: P, m: Mat3, t: Vec3): P {
  if (Math.abs(det(m) - 1) > 1e-9) throw new Error(`transformPart: matrix is not a proper rotation (det ${det(m)})`);
  const f = (v: Vec3) => add(mxv(m, v), t);
  return part.kind === 'solid'
    ? { ...part, vertices: part.vertices.map(f) }
    : { ...part, segments: part.segments.map(([a, b]) => [f(a), f(b)] as [Vec3, Vec3]) };
}

/** A rotation taking local +z onto the unit vector `w`. */
function basisAlong(w: Vec3): Mat3 {
  const h: Vec3 = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(w, h)), v = cross(w, u);
  // Columns u, v, w: local (x, y, z) → x u + y v + z w.
  return [[u[0], v[0], w[0]], [u[1], v[1], w[1]], [u[2], v[2], w[2]]];
}

/** A regular n-sided frustum about the axis from `a` (radius ra) to `b` (radius rb): nozzles, dishes, booms. */
export function frustumBetween(name: string, a: Vec3, b: Vec3, ra: number, rb: number, sides = 12): ConvexPart {
  const d = sub(b, a);
  return transformPart(frustum(name, sides, ra, rb, 0, norm(d)), basisAlong(unit(d)), a);
}

/** A slender n-sided prism from `a` to `b` (landing-gear struts, booms). */
export const strut = (name: string, a: Vec3, b: Vec3, radius: number, sides = 6): ConvexPart => frustumBetween(name, a, b, radius, radius, sides);

/** Newell normal of a face (unnormalized; length = 2 × area). */
export function faceNormal(vs: Vec3[], face: number[]): Vec3 {
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < face.length; i++) {
    const p = vs[face[i]!]!, q = vs[face[(i + 1) % face.length]!]!;
    n = add(n, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]);
  }
  return n;
}

/** Problems with a convex part (empty when it is closed, planar, convex and outward-facing). */
export function validateConvex(p: ConvexPart): string[] {
  const errs: string[] = [];
  const size = Math.max(...p.vertices.map((v) => norm(v)), 1), eps = 1e-9 * size;
  const c = scale(p.vertices.reduce((a, v) => add(a, v), [0, 0, 0] as Vec3), 1 / p.vertices.length);
  const directed = new Map<string, number>();
  p.faces.forEach((f, i) => {
    if (f.length < 3) { errs.push(`face ${i} has ${f.length} vertices`); return; }
    const n = unit(faceNormal(p.vertices, f)), d = dot(n, p.vertices[f[0]!]!);
    if (f.some((k) => Math.abs(dot(n, p.vertices[k]!) - d) > eps)) errs.push(`face ${i} is not planar`);
    if (dot(n, c) - d >= 0) errs.push(`face ${i} faces inward`);
    if (p.vertices.some((v) => dot(n, v) - d > eps)) errs.push(`face ${i}: the part is not convex`);
    f.forEach((k, j) => {
      const key = `${k}>${f[(j + 1) % f.length]}`;
      directed.set(key, (directed.get(key) ?? 0) + 1);
    });
  });
  for (const [key, count] of directed) {
    const [a, b] = key.split('>');
    if (count !== 1 || directed.get(`${b}>${a}`) !== 1) errs.push(`edge ${a}–${b} is not shared by exactly two faces`);
  }
  return errs;
}
