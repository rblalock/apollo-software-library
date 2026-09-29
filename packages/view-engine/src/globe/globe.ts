import { mxv, type Mat3 } from '../math/mat';
import { add, cross, dot, norm, scale, sub, toDeg, toRad, unit, type Vec3 } from '../math/vec';
import { clipToSquare, projectGnomonic, unprojectGnomonic, type PlotAxes, type PlotPoint } from '../projection/projection';
import type { Primitive } from '../scene/types';

/** A body seen from an observer, all vectors inertial (km, or unit where stated). */
export interface GlobeScene {
  radiusKm: number;
  centreKm: Vec3;
  observerKm: Vec3;
  /** Unit vector from the body's centre toward the Sun. */
  sunDir: Vec3;
  bodyFixedToInertial: Mat3;
  /** Plot axes (inertial); gnomonic projection, so straight lines stay straight. */
  axes: PlotAxes;
  extentDeg: number;
  /** Ellipsoid flattening for converting geodetic latitudes (Earth); 0 or absent for a sphere. */
  flattening?: number;
}

export interface GlobeFeatures {
  /** Surface polylines as [lon, lat] degrees (east, north): coastlines, mare outlines. */
  lines?: [number, number][][];
  /** Circular surface features: craters. */
  circles?: { lat: number; lon: number; diamKm: number }[];
  labels?: { text: string; lat: number; lon: number }[];
}

export interface GlobeOptions {
  limb?: boolean;
  terminator?: boolean;
  hatch?: boolean;
  /** Angle between the night-side hatch lines: great circles through the Sun axis ("solar meridians"). */
  hatchStepDeg?: number;
}

export interface GlobeGeometry {
  centre: PlotPoint;
  /** tan(angular radius) in the plot's degree units: the limb radius when the view is centred on the body. */
  radiusDeg: number;
  /** Unit plot-plane direction from the disc centre toward the Sun. */
  sunPlot: [number, number];
  /** The first surface point (body-centred, km) hit along an inertial view direction, or null. */
  surfacePoint(dir: Vec3): Vec3 | null;
}

type Pt = readonly [number, number];

/** Body-fixed unit vector of a surface point, rotated to inertial (geodetic latitude when flattened). */
function surfaceUnit(s: GlobeScene, lat: number, lon: number): Vec3 {
  const f = s.flattening ?? 0;
  const phi = f ? Math.atan((1 - f) ** 2 * Math.tan(toRad(lat))) : toRad(lat), lam = toRad(lon);
  return mxv(s.bodyFixedToInertial, [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)]);
}

/** Plot position of a surface point, or null when it is on the far side (or behind the eye). */
export function globeProject(s: GlobeScene, lat: number, lon: number): PlotPoint | null {
  const o = sub(s.observerKm, s.centreKm), p = scale(surfaceUnit(s, lat, lon), s.radiusKm);
  if (dot(p, o) <= s.radiusKm * s.radiusKm) return null;
  return projectGnomonic(sub(p, o), s.axes);
}

function perpBasis(n: Vec3): [Vec3, Vec3] {
  const u = unit(cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  return [u, cross(n, u)];
}

const slerp = (a: Vec3, b: Vec3, t: number): Vec3 => unit(add(scale(a, 1 - t), scale(b, t)));

export function globeGeometry(s: GlobeScene): GlobeGeometry {
  const o = sub(s.observerKm, s.centreKm), d = norm(o), R = s.radiusKm;
  const c = projectGnomonic(scale(o, -1), s.axes)!;
  const tip = projectGnomonic(add(scale(o, -1), scale(s.sunDir, R * 1e-3)), s.axes)!;
  const sx = tip.x - c.x, sy = tip.y - c.y, sl = Math.hypot(sx, sy);
  return {
    centre: c,
    radiusDeg: toDeg(Math.tan(Math.asin(R / d))),
    sunPlot: sl > 0 ? [sx / sl, sy / sl] : [1, 0],
    surfacePoint(dir: Vec3) {
      const b = dot(o, dir), disc = b * b - (d * d - R * R);
      if (disc < 0) return null;
      const t = -b - Math.sqrt(disc);
      return t < 0 ? null : add(o, scale(dir, t));
    },
  };
}

/** Frame-clipped polylines from a sequence of plot points, broken where a point is null. */
function runs(points: (Pt | null)[], e: number, closed: boolean): Primitive[] {
  const all = points.every((p) => p && Math.abs(p[0]) <= e && Math.abs(p[1]) <= e);
  if (closed && all) return [{ kind: 'polyline', points: points as Pt[], closed: true }];
  const seq = closed ? [...points, points[0]!] : points;
  const out: Pt[][] = [];
  let open = false;
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i];
    if (!a || !b) { open = false; continue; }
    const cl = clipToSquare(a, b, e);
    if (!cl) { open = false; continue; }
    if (open && out.length) out.at(-1)!.push(cl[1]); else out.push([cl[0], cl[1]]);
    open = cl[1][0] === b[0] && cl[1][1] === b[1];
  }
  return out.filter((r) => r.length > 1).map((points) => ({ kind: 'polyline', points, closed: false }));
}

/**
 * Line drawing of a globe in the manner of TN D-6853 Figs 6–7: the limb, the terminator, straight night-side
 * hatching parallel to the projected Sun direction, and surface features on the visible hemisphere only.
 */
export function globePrimitives(s: GlobeScene, features: GlobeFeatures, opts: GlobeOptions = {}): Primitive[] {
  const R = s.radiusKm, e = s.extentDeg;
  const o = sub(s.observerKm, s.centreKm), dist = norm(o), oh = unit(o);
  const g = globeGeometry(s);
  const visible = (p: Vec3) => dot(p, o) > R * R;
  const plot = (p: Vec3): Pt | null => {
    const q = projectGnomonic(sub(p, o), s.axes);
    return q ? [q.x, q.y] : null;
  };
  const surface = (lon: number, lat: number): Vec3 => surfaceUnit(s, lat, lon);
  /** Points along a unit-vector path, visible ones projected, with exact limb crossings inserted. */
  const along = (us: Vec3[], closed: boolean): Primitive[] => {
    const pts: (Pt | null)[] = [];
    const n = us.length, m = closed ? n : n - 1;
    for (let i = 0; i < n; i++) {
      const a = us[i]!, va = visible(scale(a, R));
      pts.push(va ? plot(scale(a, R)) : null);
      if (i >= m) continue;
      const b = us[(i + 1) % n]!, vb = visible(scale(b, R));
      if (va === vb) continue;
      let lo = 0, hi = 1;
      for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (visible(scale(slerp(a, b, mid), R)) === va) lo = mid; else hi = mid; }
      const x = plot(scale(slerp(a, b, va ? lo : hi), R));
      if (va) pts.push(x, null); else pts.push(null, x);
    }
    return runs(pts, e, closed && pts.every((p) => p !== null));
  };
  const out: Primitive[] = [];

  if (opts.limb ?? true) {
    const a = R * Math.sqrt(1 - (R * R) / (dist * dist)), m = scale(oh, (R * R) / dist), [u, v] = perpBasis(oh);
    const ring = Array.from({ length: 360 }, (_, i) => plot(add(m, add(scale(u, a * Math.cos(toRad(i))), scale(v, a * Math.sin(toRad(i)))))));
    out.push(...runs(ring, e, true));
  }
  if (opts.terminator ?? true) {
    const [u, v] = perpBasis(s.sunDir);
    out.push(...along(Array.from({ length: 720 }, (_, i) => add(scale(u, Math.cos(toRad(i / 2))), scale(v, Math.sin(toRad(i / 2))))), true));
  }
  if (opts.hatch ?? true) {
    // As on TN D-6853 Figs 6–7: great circles through the subsolar and antisolar points, drawn from the antisolar
    // point to the terminator, one of them in the plane of the Sun and the observer.
    const step = toRad(opts.hatchStepDeg ?? 15), anti = scale(s.sunDir, -1);
    const inPlane = sub(oh, scale(s.sunDir, dot(oh, s.sunDir)));
    const u = norm(inPlane) > 1e-9 ? unit(inPlane) : perpBasis(s.sunDir)[0], v = cross(s.sunDir, u);
    for (let psi = 0; psi < 2 * Math.PI - 1e-9; psi += step) {
      const w = add(scale(u, Math.cos(psi)), scale(v, Math.sin(psi)));
      out.push(...along(Array.from({ length: 91 }, (_, i) => add(scale(anti, Math.cos(toRad(i))), scale(w, Math.sin(toRad(i))))), false));
    }
  }
  for (const line of features.lines ?? []) out.push(...along(line.map(([lon, lat]) => surface(lon, lat)), false));
  for (const c of features.circles ?? []) {
    const centre = surface(c.lon, c.lat), [u, v] = perpBasis(centre), al = c.diamKm / 2 / R;
    out.push(...along(Array.from({ length: 32 }, (_, i) => {
      const t = (2 * Math.PI * i) / 32;
      return add(scale(centre, Math.cos(al)), scale(add(scale(u, Math.cos(t)), scale(v, Math.sin(t))), Math.sin(al)));
    }), true));
  }
  for (const l of features.labels ?? []) {
    const p = scale(surface(l.lon, l.lat), R);
    if (!visible(p)) continue;
    const q = plot(p);
    if (!q || Math.abs(q[0]) > e || Math.abs(q[1]) > e) continue;
    out.push({ kind: 'text', x: q[0], y: q[1], text: l.text, anchor: 'start', sizeDeg: e * 0.05, boxed: false, layer: 'annotation' });
  }
  return out;
}
