import { add, lmModel, sivbModel, type Part, type Vec3, type VehicleCamera } from '@asl/view-engine';

export interface VehicleChoice {
  label: string;
  parts: Part[];
  /** The point the camera orbits and looks at (body axes, metres). */
  target: Vec3;
  distance: number;
  extentDeg: number;
  sources: string[];
}

const lm = lmModel(), sivb = sivbModel();
export const VEHICLES: Record<'lm' | 'lmAscent' | 'sivb', VehicleChoice> = {
  lm: { label: 'LM', parts: lm.parts, target: [3.5, 0, 0], distance: 24, extentDeg: 13, sources: lm.sources },
  lmAscent: { label: 'LM ascent stage', parts: lm.parts.filter((p) => p.group === 'ascent'), target: [5, 0, 0], distance: 13, extentDeg: 13, sources: lm.sources },
  sivb: { label: 'S-IVB', parts: sivb.parts, target: [8, 0, 0], distance: 70, extentDeg: 18, sources: sivb.sources },
};

/**
 * A camera orbiting the vehicle's +X (up) axis: azimuth from +Z (the LM's front) toward +Y (its right),
 * elevation above the Y–Z plane.
 */
export function orbitCamera(o: { azDeg: number; elDeg: number; distance: number; target: Vec3; extentDeg: number }): VehicleCamera {
  const az = (o.azDeg * Math.PI) / 180, el = (o.elDeg * Math.PI) / 180;
  const dir: Vec3 = [Math.sin(el), Math.cos(el) * Math.sin(az), Math.cos(el) * Math.cos(az)];
  // Looking along ±X the "up" of the picture is the vehicle's front instead.
  const up: Vec3 = Math.abs(Math.sin(el)) > 0.99 ? [0, -Math.sin(az), -Math.cos(az)] : [1, 0, 0];
  return { eye: add(o.target, [dir[0] * o.distance, dir[1] * o.distance, dir[2] * o.distance]), target: o.target, up, extentDeg: o.extentDeg };
}
