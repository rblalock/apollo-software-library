import { GeoMoonState, MakeTime } from 'astronomy-engine';
import { mxm, mxv, rotZ, transpose, type Mat3 } from '../math/mat';
import { add, cross, dot, norm, scale, toDeg, toRad, unit, type Vec3 } from '../math/vec';
import { precessionMatrix } from '../catalog/precession';
import { moonFixedToJ2000 } from '../ephemeris/moonframe';
import { julianDate } from '../time/time';
import { AU_KM, EARTH_FLATTENING, EARTH_RADIUS_KM, LANDING_SITE_2_RADIUS_KM } from './gravity';
import type { State } from './propagate';

export const NMI_KM = 1.852;
export const FT_KM = 0.0003048;

/** Greenwich mean sidereal time (IAU 1982), radians. UTC is used for UT1 (|UT1−UTC| < 0.9 s). */
export function gmstRad(utc: Date): number {
  const jd = julianDate(utc), t = (jd - 2451545.0) / 36525;
  const deg = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000;
  return toRad(((deg % 360) + 360) % 360);
}

/** Earth-fixed → J2000 (EQJ): rotate by GMST into the mean equator/equinox of date, then undo precession. */
export function earthFixedToJ2000(utc: Date): Mat3 {
  return mxm(transpose(precessionMatrix(julianDate(utc))), rotZ(-gmstRad(utc)));
}

/** A Mission Report trajectory-parameter row for an Earth-referenced event (Table 7-I definitions). */
export interface EarthEvent {
  utc: Date;
  /** Geodetic latitude, degrees (north +). */
  latDeg: number;
  /** Longitude, degrees (east +). */
  lonDeg: number;
  /** Altitude above the ellipsoid, nautical miles. */
  altNmi: number;
  /** Space-fixed (inertial) speed, ft/s. */
  speedFps: number;
  /** Space-fixed flight-path angle from the body-centered local horizontal, degrees. */
  fpaDeg: number;
  /** Space-fixed heading, degrees east of north. */
  headingDeg: number;
}

/** Selenographic lat/lon, altitude above Landing Site 2's radius, and Moon-relative inertial speed/angles. */
export type MoonEvent = EarthEvent;

function geodeticToFixed(latDeg: number, lonDeg: number, hKm: number): Vec3 {
  const lat = toRad(latDeg), lon = toRad(lonDeg), e2 = EARTH_FLATTENING * (2 - EARTH_FLATTENING);
  const n = EARTH_RADIUS_KM / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return [(n + hKm) * Math.cos(lat) * Math.cos(lon), (n + hKm) * Math.cos(lat) * Math.sin(lon), (n * (1 - e2) + hKm) * Math.sin(lat)];
}

function fixedToGeodetic(p: Vec3): { latDeg: number; lonDeg: number; hKm: number } {
  const e2 = EARTH_FLATTENING * (2 - EARTH_FLATTENING), rho = Math.hypot(p[0], p[1]);
  let lat = Math.atan2(p[2], rho * (1 - e2)), h = 0;
  for (let i = 0; i < 10; i++) {
    const n = EARTH_RADIUS_KM / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    h = rho / Math.cos(lat) - n;
    lat = Math.atan2(p[2], rho * (1 - (e2 * n) / (n + h)));
  }
  return { latDeg: toDeg(lat), lonDeg: toDeg(Math.atan2(p[1], p[0])), hKm: h };
}

/** Local body-centered horizontal frame at a body-fixed position (pole = +Z). */
function localFrame(p: Vec3): { up: Vec3; east: Vec3; north: Vec3 } {
  const up = unit(p), east = unit(cross([0, 0, 1], up));
  return { up, east, north: cross(up, east) };
}

function velocityFromAngles(p: Vec3, speedKms: number, fpaDeg: number, headingDeg: number): Vec3 {
  const { up, east, north } = localFrame(p), g = toRad(fpaDeg), psi = toRad(headingDeg);
  return add(scale(up, speedKms * Math.sin(g)), add(scale(east, speedKms * Math.cos(g) * Math.sin(psi)), scale(north, speedKms * Math.cos(g) * Math.cos(psi))));
}

function anglesFromVelocity(p: Vec3, v: Vec3): { speedFps: number; fpaDeg: number; headingDeg: number } {
  const { up, east, north } = localFrame(p), s = norm(v);
  return { speedFps: s / FT_KM, fpaDeg: toDeg(Math.asin(dot(v, up) / s)), headingDeg: toDeg(Math.atan2(dot(v, east), dot(v, north))) };
}

/** Earth event row → geocentric J2000 state. The given velocity is inertial, so it is only rotated. */
export function earthEventToState(e: EarthEvent): State {
  const m = earthFixedToJ2000(e.utc);
  const p = geodeticToFixed(e.latDeg, e.lonDeg, e.altNmi * NMI_KM);
  return { r: mxv(m, p), v: mxv(m, velocityFromAngles(p, e.speedFps * FT_KM, e.fpaDeg, e.headingDeg)) };
}

export function stateToEarthEvent(s: State, utc: Date): EarthEvent {
  const mT = transpose(earthFixedToJ2000(utc));
  const p = mxv(mT, s.r), g = fixedToGeodetic(p);
  return { utc, latDeg: g.latDeg, lonDeg: g.lonDeg, altNmi: g.hKm / NMI_KM, ...anglesFromVelocity(p, mxv(mT, s.v)) };
}

/** Geocentric J2000 state of the Moon (km, km/s). */
export function moonState(utc: Date): State {
  const m = GeoMoonState(MakeTime(utc));
  const perDay = AU_KM / 86400;
  return { r: [m.x * AU_KM, m.y * AU_KM, m.z * AU_KM], v: [m.vx * perDay, m.vy * perDay, m.vz * perDay] };
}

/**
 * Moon event row → geocentric J2000 state. Position: selenographic lat/lon, altitude above Landing Site 2's
 * radius. Velocity: "space-fixed" angles are measured in the inertial frame, so heading is from INERTIAL north
 * (the mean equatorial pole of date projected onto the local horizontal), not from the lunar pole: the Mission
 * Report's headings swing ±23° around −90° while latitudes stay within ±1.6°, as they must for a near-equatorial
 * lunar orbit seen against Earth's pole.
 */
export function moonEventToState(e: MoonEvent): State {
  const lat = toRad(e.latDeg), lon = toRad(e.lonDeg);
  const rad = LANDING_SITE_2_RADIUS_KM + e.altNmi * NMI_KM;
  const fixed: Vec3 = [rad * Math.cos(lat) * Math.cos(lon), rad * Math.cos(lat) * Math.sin(lon), rad * Math.sin(lat)];
  const p = mxv(moonFixedToJ2000(e.utc), fixed);
  const pole = mxv(transpose(precessionMatrix(julianDate(e.utc))), [0, 0, 1]);
  const up = unit(p), east = unit(cross(pole, up)), north = cross(up, east);
  const g = toRad(e.fpaDeg), psi = toRad(e.headingDeg), sp = e.speedFps * FT_KM;
  const v = add(scale(up, sp * Math.sin(g)), add(scale(east, sp * Math.cos(g) * Math.sin(psi)), scale(north, sp * Math.cos(g) * Math.cos(psi))));
  const moon = moonState(e.utc);
  return { r: add(moon.r, p), v: add(moon.v, v) };
}

/** Moon-relative state (position and inertial velocity relative to the Moon's center). */
export function relativeToMoon(s: State, utc: Date): State {
  const m = moonState(utc);
  return { r: [s.r[0] - m.r[0], s.r[1] - m.r[1], s.r[2] - m.r[2]], v: [s.v[0] - m.v[0], s.v[1] - m.v[1], s.v[2] - m.v[2]] };
}
