import { Body, GeoMoon, GeoVector, MakeTime } from 'astronomy-engine';
import type { Vec3 } from '../math/vec';

export const MU_EARTH_KM3S2 = 398600.4418;
export const MU_MOON_KM3S2 = 4902.800066;
export const MU_SUN_KM3S2 = 1.32712440018e11;
export const AU_KM = 149597870.7;
export const EARTH_RADIUS_KM = 6378.137;
export const EARTH_FLATTENING = 1 / 298.257223563;
export const EARTH_J2 = 1.08262668e-3;
/** Radius of Apollo Landing Site 2, the reference for lunar altitudes in the Apollo 11 Mission Report. */
export const LANDING_SITE_2_RADIUS_KM = 1735.4;
export const MOON_MEAN_RADIUS_KM = 1737.4;

const au = (v: { x: number; y: number; z: number }): Vec3 => [v.x * AU_KM, v.y * AU_KM, v.z * AU_KM];

/** Geocentric J2000 (EQJ) positions of the Moon and Sun, km. */
export function perturberPositions(utc: Date): { moon: Vec3; sun: Vec3 } {
  const t = MakeTime(utc);
  return { moon: au(GeoMoon(t)), sun: au(GeoVector(Body.Sun, t, false)) };
}

/** Geocentric acceleration (km/s²): Earth point mass; with `perturbers`, also Earth J2 near Earth and the Moon and Sun. */
export function acceleration(r: Vec3, perturbers: { moon: Vec3; sun: Vec3 } | null): Vec3 {
  const [x, y, z] = r;
  const r2 = x * x + y * y + z * z, rn = Math.sqrt(r2), k = -MU_EARTH_KM3S2 / (r2 * rn);
  const a: [number, number, number] = [k * x, k * y, k * z];
  if (perturbers && rn < 50000) {
    const f = (1.5 * EARTH_J2 * MU_EARTH_KM3S2 * EARTH_RADIUS_KM ** 2) / r2 ** 2.5, zz = (5 * z * z) / r2;
    a[0] += f * x * (zz - 1); a[1] += f * y * (zz - 1); a[2] += f * z * (zz - 3);
  }
  if (perturbers) {
    for (const [mu, p] of [[MU_MOON_KM3S2, perturbers.moon], [MU_SUN_KM3S2, perturbers.sun]] as const) {
      const d: Vec3 = [p[0] - x, p[1] - y, p[2] - z];
      const dn3 = Math.hypot(...d) ** 3, pn3 = Math.hypot(...p) ** 3;
      for (let i = 0; i < 3; i++) a[i] += mu * (d[i]! / dn3 - p[i]! / pn3);
    }
  }
  return a;
}
