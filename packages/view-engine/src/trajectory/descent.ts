import { mxv } from '../math/mat';
import { add, cross, scale, toRad, unit, type Vec3 } from '../math/vec';
import { moonFixedToJ2000 } from '../ephemeris/moonframe';
import { getToUtc, parseGet } from '../time/time';
import { LANDING_SITE_2_RADIUS_KM } from './gravity';
import { NMI_KM, moonState } from './states';

/** A planned powered-descent profile: range to go and altitude against time from ignition. */
export interface DescentProfile {
  pdiGet: string;
  points: { tfiS: number; rangeNmi: number; altNmi: number }[];
}
export interface SurfacePoint { latDeg: number; lonDeg: number }

const unitFixed = (p: SurfacePoint): Vec3 => {
  const la = toRad(p.latDeg), lo = toRad(p.lonDeg);
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
};

/**
 * The LM's geocentric J2000 position (km) during powered descent: on the great circle from the landing point
 * toward the PDI point, at the profile's range to go and altitude (above Landing Site 2's radius), linearly
 * interpolated in time. Times outside the profile clamp to its ends.
 */
export function descentPosition(profile: DescentProfile, landing: SurfacePoint, pdi: SurfacePoint, rangeZeroUtc: string, getS: number): Vec3 {
  const tfi = getS - parseGet(profile.pdiGet), pts = profile.points;
  let i = 0;
  while (i < pts.length - 2 && tfi > pts[i + 1]!.tfiS) i++;
  const a = pts[i]!, b = pts[i + 1]!, f = Math.min(1, Math.max(0, (tfi - a.tfiS) / (b.tfiS - a.tfiS)));
  const range = a.rangeNmi + f * (b.rangeNmi - a.rangeNmi), alt = a.altNmi + f * (b.altNmi - a.altNmi);
  const l = unitFixed(landing), p = unitFixed(pdi);
  const axis = unit(cross(l, p)), toward = cross(axis, l); // unit vector ⟂ l in the l–p plane, pointing to p
  const ang = (range * NMI_KM) / LANDING_SITE_2_RADIUS_KM;
  const ground = add(scale(l, Math.cos(ang)), scale(toward, Math.sin(ang)));
  const utc = getToUtc(rangeZeroUtc, getS);
  return add(moonState(utc).r, mxv(moonFixedToJ2000(utc), scale(ground, LANDING_SITE_2_RADIUS_KM + alt * NMI_KM)));
}
