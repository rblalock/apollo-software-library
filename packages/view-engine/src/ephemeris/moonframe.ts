import { Body, RotationAxis } from 'astronomy-engine';
import { mxm, mxv, rotX, rotZ, transpose, type Mat3 } from '../math/mat';
import { toRad, type Vec3 } from '../math/vec';
import { precessionMatrix } from '../catalog/precession';

/** Moon-fixed (IAU mean-Earth/rotation-axis) → J2000 (EQJ) rotation at `utc`, from the IAU 2015 α0, δ0, W. */
export function moonFixedToJ2000(utc: Date): Mat3 {
  const a = RotationAxis(Body.Moon, utc);
  const fixedFromJ2000 = mxm(rotZ(toRad(a.spin)), mxm(rotX(toRad(90 - a.dec)), rotZ(toRad(a.ra * 15 + 90))));
  return transpose(fixedFromJ2000);
}

export interface SiteFrame { up: Vec3; east: Vec3; north: Vec3 }

/** Local vertical / east / north at a selenographic site (degrees, east longitude), in the platform epoch frame. */
export function siteFrame(latDeg: number, lonDeg: number, utc: Date, epochJd: number): SiteFrame {
  const lat = toRad(latDeg), lon = toRad(lonDeg);
  const toRef = mxm(precessionMatrix(epochJd), moonFixedToJ2000(utc));
  const f = (v: Vec3) => mxv(toRef, v);
  return {
    up: f([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]),
    east: f([-Math.sin(lon), Math.cos(lon), 0]),
    north: f([-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)]),
  };
}
