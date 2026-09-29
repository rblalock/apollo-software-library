import { mxv, type Mat3 } from '../math/mat';
import { toDeg, toRad, type Vec3 } from '../math/vec';
import { J2000_JD } from '../time/time';
import { precessionMatrix } from './precession';

/** A star with a J2000 position (BSC5/FK5). `pmRa` is μα·cosδ, in arcsec per year. */
export interface CatalogStar {
  hr: number;
  name: string;
  raDeg: number;
  decDeg: number;
  pmRaArcsecPerYr: number;
  pmDecArcsecPerYr: number;
  vmag: number;
}

export function radecToVec(raDeg: number, decDeg: number): Vec3 {
  const a = toRad(raDeg), d = toRad(decDeg);
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

export function vecToRadec(v: Vec3): { raDeg: number; decDeg: number } {
  const raDeg = (toDeg(Math.atan2(v[1], v[0])) + 360) % 360;
  return { raDeg, decDeg: toDeg(Math.asin(Math.max(-1, Math.min(1, v[2])))) };
}

/** Unit vector at the mean equator/equinox of `epochJd`, with proper motion applied from J2000. */
export function starDirection(star: CatalogStar, epochJd: number, p: Mat3 = precessionMatrix(epochJd)): Vec3 {
  const years = (epochJd - J2000_JD) / 365.25;
  const dec = star.decDeg + (star.pmDecArcsecPerYr * years) / 3600;
  const ra = star.raDeg + (star.pmRaArcsecPerYr * years) / 3600 / Math.cos(toRad(star.decDeg));
  return mxv(p, radecToVec(ra, dec));
}
