import { add, cross, dot, norm, scale, sub, unit, type Vec3 } from '../math/vec';
import { faceNormal, type ConvexPart, type Part } from './solids';

export interface Segment3 { a: Vec3; b: Vec3; part: string }

interface HalfSpace { w: Vec3; c: number }

interface Prepared {
  part: ConvexPart;
  planes: HalfSpace[];
  edges: { a: number; b: number; f1: number; f2: number }[];
  centroid: Vec3;
}

function prepare(part: ConvexPart): Prepared {
  const planes = part.faces.map((f) => {
    const w = unit(faceNormal(part.vertices, f));
    return { w, c: dot(w, part.vertices[f[0]!]!) };
  });
  const byKey = new Map<string, { a: number; b: number; f1: number; f2: number }>();
  part.faces.forEach((f, fi) => f.forEach((k, j) => {
    const m = f[(j + 1) % f.length]!, key = k < m ? `${k}-${m}` : `${m}-${k}`;
    const e = byKey.get(key);
    if (e) e.f2 = fi; else byKey.set(key, { a: Math.min(k, m), b: Math.max(k, m), f1: fi, f2: -1 });
  }));
  const centroid = scale(part.vertices.reduce((s, v) => add(s, v), [0, 0, 0] as Vec3), 1 / part.vertices.length);
  return { part, planes, edges: [...byKey.values()], centroid };
}

/**
 * The shadow volume of a convex solid seen from `eye`: points whose sight line from the eye passes through the
 * solid. It is convex: behind every front-facing face plane, and inside every plane through the eye and a
 * silhouette edge. Returns null when the solid shows no front face (the eye is inside or edge-on).
 */
function shadow(p: Prepared, eye: Vec3, eps: number): HalfSpace[] | null {
  const front = p.planes.map((h) => dot(h.w, eye) - h.c > eps);
  if (!front.some(Boolean)) return null;
  const out = p.planes.filter((_, i) => front[i]);
  for (const e of p.edges) {
    if (front[e.f1] === front[e.f2]) continue;
    const A = p.part.vertices[e.a]!, B = p.part.vertices[e.b]!;
    let w = unit(cross(sub(A, eye), sub(B, eye))), c = dot(w, eye);
    if (dot(w, p.centroid) - c > 0) { w = scale(w, -1); c = -c; }
    out.push({ w, c });
  }
  return out;
}

/** The parameter interval of A→B lying strictly inside all half-spaces (w·P < c − eps), or null. */
function clip(A: Vec3, B: Vec3, hs: HalfSpace[], eps: number): [number, number] | null {
  let t0 = 0, t1 = 1;
  for (const h of hs) {
    const g0 = dot(h.w, A) - h.c + eps, g1 = dot(h.w, B) - h.c + eps;
    if (g0 >= 0 && g1 >= 0) return null;
    if (g0 < 0 && g1 < 0) continue;
    const t = g0 / (g0 - g1);
    if (g0 < 0) t1 = Math.min(t1, t); else t0 = Math.max(t0, t);
    if (t0 >= t1) return null;
  }
  return [t0, t1];
}

/**
 * Object-space hidden-line removal for a scene of convex solids and wires seen from `eye` (perspective).
 * Each candidate edge (a solid edge next to at least one front face, or a wire segment) is clipped against the
 * shadow volume of every other solid; what survives is returned as 3-D segments, endpoints kept exact where an
 * edge is visible to its end.
 */
export function visibleSegments(parts: Part[], eye: Vec3): Segment3[] {
  const solids = parts.filter((p): p is ConvexPart => p.kind === 'solid').map(prepare);
  const size = Math.max(1, ...parts.flatMap((p) => (p.kind === 'solid' ? p.vertices : p.segments.flat())).map((v) => norm(sub(v, eye))));
  const eps = 1e-9 * size, minLen = 1e-6 * size;
  const shadows = solids.map((s) => shadow(s, eye, eps));

  const candidates: { A: Vec3; B: Vec3; part: string; owner: number }[] = [];
  solids.forEach((s, si) => {
    const front = s.planes.map((h) => dot(h.w, eye) - h.c > eps);
    for (const e of s.edges) {
      if (front[e.f1] || front[e.f2]) candidates.push({ A: s.part.vertices[e.a]!, B: s.part.vertices[e.b]!, part: s.part.name, owner: si });
    }
  });
  for (const p of parts) if (p.kind === 'wire') for (const [A, B] of p.segments) candidates.push({ A, B, part: p.name, owner: -1 });

  const out: Segment3[] = [];
  for (const { A, B, part, owner } of candidates) {
    const hidden: [number, number][] = [];
    shadows.forEach((hs, si) => {
      if (si === owner || !hs) return;
      const iv = clip(A, B, hs, eps);
      if (iv) hidden.push(iv);
    });
    hidden.sort((x, y) => x[0] - y[0]);
    const L = norm(sub(B, A));
    const at = (t: number): Vec3 => (t === 0 ? A : t === 1 ? B : add(A, scale(sub(B, A), t)));
    let t = 0;
    for (const [h0, h1] of [...hidden, [1, 1] as [number, number]]) {
      if ((h0 - t) * L > minLen) out.push({ a: at(t), b: at(h0), part });
      t = Math.max(t, h1);
    }
  }
  return out;
}
