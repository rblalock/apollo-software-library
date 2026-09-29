import { add, dot, scale, sub, type Vec3 } from '../math/vec';
import { axesFromBoresight, clipToSquare, projectGnomonic } from '../projection/projection';
import type { Primitive } from '../scene/types';
import { visibleSegments } from './hiddenline';
import type { Part } from './solids';

export interface VehicleCamera {
  eye: Vec3;
  target: Vec3;
  /** Projected to plot +y. */
  up: Vec3;
  /** Half-width of the square frame, in the gnomonic plot's degree units. */
  extentDeg: number;
}

/**
 * Hidden-line drawing of vehicle parts through a perspective camera, as recorder polylines: each visible edge
 * is clipped at a near plane in front of the eye, projected (straight lines stay straight), and clipped to the frame.
 */
export function vehiclePrimitives(parts: Part[], cam: VehicleCamera): Primitive[] {
  const axes = axesFromBoresight(sub(cam.target, cam.eye), cam.up);
  const near = 1e-3;
  const out: Primitive[] = [];
  for (const s of visibleSegments(parts, cam.eye)) {
    let a = sub(s.a, cam.eye), b = sub(s.b, cam.eye);
    const za = dot(a, axes.ez), zb = dot(b, axes.ez);
    if (za < near && zb < near) continue;
    const cut = (p: Vec3, q: Vec3, zp: number, zq: number): Vec3 => add(p, scale(sub(q, p), (near - zp) / (zq - zp)));
    if (za < near) a = cut(a, b, za, zb);
    else if (zb < near) b = cut(b, a, zb, za);
    const pa = projectGnomonic(a, axes)!, pb = projectGnomonic(b, axes)!;
    const c = clipToSquare([pa.x, pa.y], [pb.x, pb.y], cam.extentDeg);
    if (c) out.push({ kind: 'polyline', points: c, closed: false });
  }
  return out;
}
