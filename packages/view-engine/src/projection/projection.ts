import { add, angleBetween, cross, dot, scale, sub, toDeg, toRad, unit, type Vec3 } from '../math/vec';

/** Plot +x, plot +y and boresight directions, in the same frame as the vectors being projected. */
export interface PlotAxes { ex: Vec3; ey: Vec3; ez: Vec3 }
/** Plot coordinates in degrees. */
export interface PlotPoint { x: number; y: number }

/** Azimuthal equidistant: the radius equals the angle from the boresight (the view program's "fisheye"). */
export function projectAzimuthalEquidistant(v: Vec3, axes: PlotAxes): PlotPoint {
  const u = unit(v);
  const r = toDeg(angleBetween(u, axes.ez));
  const az = Math.atan2(dot(u, axes.ey), dot(u, axes.ex));
  return { x: r * Math.cos(az), y: r * Math.sin(az) };
}

export function unprojectAzimuthalEquidistant(p: PlotPoint, axes: PlotAxes): Vec3 {
  const r = toRad(Math.hypot(p.x, p.y));
  const az = Math.atan2(p.y, p.x);
  const s = Math.sin(r);
  return unit(add(add(scale(axes.ex, s * Math.cos(az)), scale(axes.ey, s * Math.sin(az))), scale(axes.ez, Math.cos(r))));
}

/**
 * Plot axes looking along `boresight`, with `upHint` projected to plot +y.
 * The non-mirrored plot is the as-seen view: +x = boresight × up.
 */
export function axesFromBoresight(boresight: Vec3, upHint: Vec3, mirror = false): PlotAxes {
  const ez = unit(boresight);
  const ey = unit(sub(upHint, scale(ez, dot(upHint, ez))));
  const ex = cross(ez, ey);
  return { ex: mirror ? scale(ex, -1) : ex, ey, ez };
}

/**
 * Gnomonic (true perspective): straight lines stay straight. Coordinates are the tangent-plane offsets scaled to
 * degrees at the boresight, so small angles read as degrees. Null for directions at or behind the eye's plane.
 */
export function projectGnomonic(v: Vec3, axes: PlotAxes): PlotPoint | null {
  const z = dot(v, axes.ez);
  if (z <= 0) return null;
  return { x: toDeg(dot(v, axes.ex) / z), y: toDeg(dot(v, axes.ey) / z) };
}

/** Liang–Barsky clip of a plot segment to the square |x|, |y| ≤ e; null when it misses. */
export function clipToSquare(a: readonly [number, number], b: readonly [number, number], e: number): [[number, number], [number, number]] | null {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] + e], [dx, e - a[0]], [-dy, a[1] + e], [dy, e - a[1]]] as const) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  const at = (t: number): [number, number] => [a[0] + t * dx, a[1] + t * dy];
  return [at(t0), at(t1)];
}

export function unprojectGnomonic(p: PlotPoint, axes: PlotAxes): Vec3 {
  return unit(add(axes.ez, add(scale(axes.ex, toRad(p.x)), scale(axes.ey, toRad(p.y)))));
}
