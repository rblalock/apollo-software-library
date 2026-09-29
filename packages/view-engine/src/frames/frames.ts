import { mxm, rotX, rotY, rotZ, transpose, type Mat3 } from '../math/mat';
import { cross, dot, toDeg, toRad, unit, type Vec3 } from '../math/vec';
import type { PlotAxes } from '../projection/projection';

/** IMU gimbal angles in degrees (inner = IGA, middle = MGA, outer = OGA). */
export interface GimbalAngles { inner: number; middle: number; outer: number }

/** Stable member → navigation base: rotY(IGA), then rotZ(MGA), then rotX(OGA) (Comanche055 CALCGA/SMNB). */
export const smToNb = (g: GimbalAngles): Mat3 =>
  mxm(rotX(toRad(g.outer)), mxm(rotZ(toRad(g.middle)), rotY(toRad(g.inner))));

/** CALCGA: gimbal angles from an SM→NB matrix. Throws at gimbal lock (middle = ±90°). */
export function gimbalsFromSmToNb(m: Mat3): GimbalAngles {
  const [xnb, ynb, znb] = m; // NB axes in SM coordinates
  const xsm: Vec3 = [1, 0, 0], ysm: Vec3 = [0, 1, 0], zsm: Vec3 = [0, 0, 1];
  const mga = unit(cross(xnb, ysm)); // MGA = unit(OGA × IGA)
  return {
    inner: toDeg(Math.atan2(dot(xsm, mga), dot(zsm, mga))),
    middle: toDeg(Math.atan2(dot(ysm, xnb), dot(ysm, cross(mga, xnb)))),
    outer: toDeg(Math.atan2(dot(mga, ynb), dot(mga, znb))),
  };
}

/** Optics → navigation base (Comanche055 CSM_GEOMETRY NB1NB2): 32.523° about Y. */
export const NB1NB2: Mat3 = [
  [0.843175692, 0, 0.5376381241],
  [0, 1, 0],
  [-0.5376381241, 0, 0.843175692],
];

export const referenceToNb = (refsmmat: Mat3, g: GimbalAngles): Mat3 => mxm(smToNb(g), refsmmat);
export const referenceToOptics = (refsmmat: Mat3, g: GimbalAngles): Mat3 =>
  mxm(transpose(NB1NB2), referenceToNb(refsmmat, g));

/** Optics-frame line of sight for shaft SA and trunnion TA (Comanche055 SXTNB). */
export function opticsLineOfSight(shaftDeg: number, trunnionDeg: number): Vec3 {
  const sa = toRad(shaftDeg), ta = toRad(trunnionDeg);
  return [Math.cos(sa) * Math.sin(ta), Math.sin(sa) * Math.sin(ta), Math.cos(ta)];
}

export const SCT_FIELD_OF_VIEW_DEG = 60;

/**
 * Plot axes for scanning-telescope views, in the optics frame: boresight = line of sight,
 * +y = direction of increasing trunnion, +x = boresight × up (as seen).
 * Established by fitting TN D-6853 Fig 3a (see the spec amendments).
 */
export function sctPlotAxes(shaftDeg: number, trunnionDeg: number): PlotAxes {
  const sa = toRad(shaftDeg), ta = toRad(trunnionDeg);
  const ez = opticsLineOfSight(shaftDeg, trunnionDeg);
  const ey: Vec3 = [Math.cos(sa) * Math.cos(ta), Math.sin(sa) * Math.cos(ta), -Math.sin(ta)];
  return { ex: cross(ez, ey), ey, ez };
}
