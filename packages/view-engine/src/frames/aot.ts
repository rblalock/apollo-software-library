import { mxm, transpose, type Mat3 } from '../math/mat';
import { add, cross, dot, scale, sub, toRad, unit, type Vec3 } from '../math/vec';
import type { PlotAxes } from '../projection/projection';

/**
 * LM alignment optical telescope detents: azimuth around the LM +X axis, measured from +Z (forward)
 * toward +Y (right), per 69-FM-197 Fig 10.0-1. Each line of sight is 45° from +X.
 */
export const AOT_DETENTS = { front: 0, rightFront: 60, rightRear: 120, rear: 180, leftRear: 240, leftFront: 300 } as const;
export type AotDetent = keyof typeof AOT_DETENTS;

export const AOT_FIELD_OF_VIEW_DEG = 60;

/** AOT line of sight in LM body axes for a detent azimuth (degrees). */
export function aotLineOfSight(azimuthDeg: number): Vec3 {
  const az = toRad(azimuthDeg), c45 = Math.SQRT1_2;
  return [c45, c45 * Math.sin(az), c45 * Math.cos(az)];
}

/**
 * AOT plot axes in LM body axes, as seen. At the front detent, up = LM +X (away from the surface). The AOT is
 * a rotating-head periscope, so turning the head to a detent rotates the image by the detent azimuth; the sign
 * (−azimuth) is fixed by the reticle crosses the 1969 program drew in each detent's view (TN D-6853 Fig 4,
 * measured in scripts/test/fig4-reticle.test.ts).
 */
export function aotPlotAxes(azimuthDeg: number): PlotAxes {
  const ez = aotLineOfSight(azimuthDeg);
  const x: Vec3 = [1, 0, 0];
  const upX = unit(sub(x, scale(ez, dot(x, ez))));
  const roll = toRad(-azimuthDeg);
  const ey = add(scale(upX, Math.cos(roll)), scale(cross(ez, upX), Math.sin(roll)));
  return { ex: cross(ez, ey), ey, ez };
}

/** Plot-frame angle (degrees CCW from +x) of the AOT reticle's first cross line for a detent. */
export const aotReticleAngleDeg = (azimuthDeg: number): number => -azimuthDeg;

/**
 * LM attitude (reference → body) from plot axes fitted for one detent (axes expressed in the reference frame):
 * the fitted boresight and up are mapped onto that detent's line of sight and up in body axes.
 */
export function lmAttitudeFromAotFit(refAxes: PlotAxes, azimuthDeg: number): Mat3 {
  const b = aotPlotAxes(azimuthDeg);
  const cols = (p: Vec3, q: Vec3, r: Vec3): Mat3 => [[p[0], q[0], r[0]], [p[1], q[1], r[1]], [p[2], q[2], r[2]]];
  const body = cols(b.ez, b.ey, cross(b.ez, b.ey));
  const ref = cols(refAxes.ez, refAxes.ey, cross(refAxes.ez, refAxes.ey));
  return mxm(body, transpose(ref));
}
