import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, angleBetween, cross, dot, gimbalsFromSmToNb, mxv, NB1NB2, norm, opticsLineOfSight,
  orthonormalityError, rotY, sctPlotAxes, smToNb, toDeg, toRad, type GimbalAngles,
} from '../src/index';

describe('optics mounting (Comanche055 NB1NB2)', () => {
  it('rotates 32.523° about Y and is orthonormal', () => {
    expect(toDeg(Math.atan2(NB1NB2[0][2], NB1NB2[0][0]))).toBeCloseTo(32.523, 3);
    expect(orthonormalityError(NB1NB2)).toBeLessThan(1e-9);
  });
  it('puts the zero-trunnion line of sight 57.477° from +X toward +Z', () => {
    const los = mxv(NB1NB2, opticsLineOfSight(0, 0));
    expect(los[1]).toBeCloseTo(0, 12);
    expect(los[2]).toBeGreaterThan(0);
    expect(toDeg(angleBetween(los, [1, 0, 0]))).toBeCloseTo(57.477, 3);
  });
});

describe('REFSMMAT and gimbals', () => {
  it('the Lunar lift-off REFSMMAT transcription is orthonormal', () => {
    expect(orthonormalityError(APOLLO_11.refsmmat.lunarLiftoff)).toBeLessThan(1e-7);
  });
  it('inner-gimbal-only attitude is a Y rotation', () => {
    const a = smToNb({ inner: 49.1, middle: 0, outer: 0 });
    const b = rotY(toRad(49.1));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(a[i]![j]).toBeCloseTo(b[i]![j]!, 15);
  });
  it('CALCGA inverts smToNb', () => {
    const cases: GimbalAngles[] = [
      { inner: 49.1, middle: 0, outer: 0 }, { inner: 17.86, middle: 0, outer: 0 },
      { inner: -120, middle: 35, outer: 170 }, { inner: 10, middle: -60, outer: -45 },
    ];
    for (const g of cases) {
      const back = gimbalsFromSmToNb(smToNb(g));
      expect(back.inner).toBeCloseTo(g.inner, 9);
      expect(back.middle).toBeCloseTo(g.middle, 9);
      expect(back.outer).toBeCloseTo(g.outer, 9);
    }
  });
});

describe('SCT plot axes', () => {
  it('are orthonormal and as-seen (ex = ez × ey)', () => {
    for (const [sa, ta] of [[0, 0], [20, 15], [-135, 40]] as const) {
      const a = sctPlotAxes(sa, ta);
      for (const v of [a.ex, a.ey, a.ez]) expect(norm(v)).toBeCloseTo(1, 12);
      expect(dot(a.ex, a.ey)).toBeCloseTo(0, 12);
      expect(dot(a.ey, a.ez)).toBeCloseTo(0, 12);
      expect(dot(cross(a.ez, a.ey), a.ex)).toBeCloseTo(1, 12);
    }
  });
  it('at shaft 0, trunnion 0: boresight = optics Z, up = optics X, right = optics Y', () => {
    const a = sctPlotAxes(0, 0);
    expect(a.ez).toEqual([0, 0, 1]);
    expect(a.ey[0]).toBeCloseTo(1, 15);
    expect(a.ex[1]).toBeCloseTo(1, 15);
  });
});
