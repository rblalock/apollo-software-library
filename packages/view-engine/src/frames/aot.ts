import { cross, dot, scale, sub, toRad, unit, type Vec3 } from '../math/vec';
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
 * AOT plot axes in LM body axes: boresight = line of sight, up = LM +X (away from the surface: "the lunar
 * surface can be seen at the extreme center bottom of each of the views", 69-FM-197 §3.13), as seen.
 */
export function aotPlotAxes(azimuthDeg: number): PlotAxes {
  const ez = aotLineOfSight(azimuthDeg);
  const x: Vec3 = [1, 0, 0];
  const ey = unit(sub(x, scale(ez, dot(x, ez))));
  return { ex: cross(ez, ey), ey, ez };
}
