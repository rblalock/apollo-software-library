import { Body, GeoMoon, GeoVector, MakeTime } from 'astronomy-engine';
import { mxv } from '../math/mat';
import { norm, sub, toDeg, unit, type Vec3 } from '../math/vec';
import { precessionMatrix } from '../catalog/precession';

export type BodyName = 'sun' | 'moon' | 'earth' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export type Observer = 'earth' | 'moon';

export const BODY_LABEL: Record<BodyName, string> = {
  sun: 'Sun', moon: 'Moon', earth: 'Earth', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};

const AE_BODY = { sun: Body.Sun, venus: Body.Venus, mars: Body.Mars, jupiter: Body.Jupiter, saturn: Body.Saturn } as const;
const RADIUS_KM: Record<BodyName, number> = {
  sun: 695700, moon: 1737.4, earth: 6378.137, venus: 6051.8, mars: 3389.5, jupiter: 69911, saturn: 58232,
};
const AU_KM = 149597870.7;

function geocentric(body: BodyName, utc: Date): Vec3 {
  if (body === 'earth') return [0, 0, 0];
  const t = MakeTime(utc);
  const v = body === 'moon' ? GeoMoon(t) : GeoVector(AE_BODY[body], t, false);
  return [v.x, v.y, v.z];
}

/** Observer → body vector in AU, J2000 mean equator (EQJ). */
export function bodyVectorJ2000Au(body: BodyName, observer: Observer, utc: Date): Vec3 {
  if (body === observer) throw new Error(`observer ${observer} cannot view itself`);
  return sub(geocentric(body, utc), geocentric(observer, utc));
}

/** Unit direction at the mean equator/equinox of `epochJd` (the platform reference frame). */
export function bodyDirection(body: BodyName, observer: Observer, utc: Date, epochJd: number): Vec3 {
  return unit(mxv(precessionMatrix(epochJd), bodyVectorJ2000Au(body, observer, utc)));
}

export function bodyAngularRadiusDeg(body: BodyName, observer: Observer, utc: Date): number {
  return toDeg(Math.asin(RADIUS_KM[body] / (norm(bodyVectorJ2000Au(body, observer, utc)) * AU_KM)));
}
