import { describe, expect, it } from 'vitest';
import { RotationAxis, Body } from 'astronomy-engine';
import {
  AOT_DETENTS, angleBetween, aotLineOfSight, aotPlotAxes, besselianEpochToJd, bodyDirection, cross, dot, J2000_JD,
  moonFixedToJ2000, mxv, norm, orthonormalityError, scale, siteFrame, sub, toDeg, unit, type Vec3,
} from '../src/index';

describe('LM alignment optical telescope (AOT)', () => {
  it('has six detents 60° apart, each 45° from the LM +X axis', () => {
    expect(Object.values(AOT_DETENTS).sort((a, b) => a - b)).toEqual([0, 60, 120, 180, 240, 300]);
    for (const az of Object.values(AOT_DETENTS)) {
      const los = aotLineOfSight(az);
      expect(norm(los)).toBeCloseTo(1, 12);
      expect(toDeg(angleBetween(los, [1, 0, 0]))).toBeCloseTo(45, 9);
    }
    expect(aotLineOfSight(AOT_DETENTS.front)[2]).toBeCloseTo(Math.SQRT1_2, 12); // front looks forward (+Z)
    expect(aotLineOfSight(AOT_DETENTS.rightFront)[1]).toBeGreaterThan(0); // right is +Y
  });
  it('plots the front detent with up toward LM +X (the surface at the bottom), as seen', () => {
    const a = aotPlotAxes(AOT_DETENTS.front);
    expect(dot(a.ey, [1, 0, 0])).toBeCloseTo(Math.SQRT1_2, 12);
    expect(dot(cross(a.ez, a.ey), a.ex)).toBeCloseTo(1, 12);
  });
  it('rotates the image by −(detent azimuth) about the line of sight (rotating-head periscope; sign from the drawn reticles)', () => {
    for (const az of Object.values(AOT_DETENTS)) {
      const a = aotPlotAxes(az);
      const x: Vec3 = [1, 0, 0];
      const upX = unit(sub(x, scale(a.ez, dot(x, a.ez)))); // "+X projected" = the unrotated up
      const roll = toDeg(Math.atan2(dot(cross(upX, a.ey), a.ez), dot(upX, a.ey)));
      expect(((roll + az + 540) % 360) - 180).toBeCloseTo(0, 9);
      expect(dot(a.ey, a.ez)).toBeCloseTo(0, 12);
      expect(dot(cross(a.ez, a.ey), a.ex)).toBeCloseTo(1, 12);
    }
  });
});

describe('Moon-fixed frame and landing-site frame', () => {
  const utc = new Date('1969-07-21T16:00:00Z');
  it('rotates the Moon-fixed pole onto the IAU north pole (J2000)', () => {
    const m = moonFixedToJ2000(utc);
    expect(orthonormalityError(m)).toBeLessThan(1e-12);
    const pole = mxv(m, [0, 0, 1]);
    const n = RotationAxis(Body.Moon, utc).north;
    expect(toDeg(angleBetween(pole, [n.x, n.y, n.z]))).toBeLessThan(1e-9);
  });
  it('gives an orthonormal up/east/north frame whose (0°, 0°) vertical points near Earth', () => {
    const epochJd = besselianEpochToJd(1970);
    const f = siteFrame(0, 0, utc, epochJd);
    for (const v of [f.up, f.east, f.north]) expect(norm(v)).toBeCloseTo(1, 12);
    expect(dot(cross(f.east, f.north), f.up)).toBeCloseTo(1, 12);
    expect(toDeg(angleBetween(f.up, bodyDirection('earth', 'moon', utc, epochJd)))).toBeLessThan(10); // libration
  });
  it('is expressed in the platform epoch (precessed from J2000)', () => {
    const a = siteFrame(0.67, 23.47, utc, J2000_JD).up, b = siteFrame(0.67, 23.47, utc, besselianEpochToJd(1970)).up;
    expect(toDeg(angleBetween(a, b))).toBeGreaterThan(0.3); // ~30 years of precession
  });
});

import { lmAttitudeFromAotFit, mxm as mm, rotX, rotY, rotZ } from '../src/index';

describe('lmAttitudeFromAotFit', () => {
  it('recovers the LM attitude from a detent\'s plot axes expressed in the reference frame', () => {
    const bodyFromRef = mm(rotX(0.3), mm(rotY(-1.2), rotZ(2.1)));
    const refFromBody = [[bodyFromRef[0][0], bodyFromRef[1][0], bodyFromRef[2][0]], [bodyFromRef[0][1], bodyFromRef[1][1], bodyFromRef[2][1]], [bodyFromRef[0][2], bodyFromRef[1][2], bodyFromRef[2][2]]] as const;
    for (const az of Object.values(AOT_DETENTS)) {
      const b = aotPlotAxes(az);
      const refAxes = { ex: mxv(refFromBody, b.ex), ey: mxv(refFromBody, b.ey), ez: mxv(refFromBody, b.ez) };
      const got = lmAttitudeFromAotFit(refAxes, az);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) expect(got[i]![k]).toBeCloseTo(bodyFromRef[i]![k]!, 12);
    }
  });
});
