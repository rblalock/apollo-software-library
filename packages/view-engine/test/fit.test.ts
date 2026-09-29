import { describe, expect, it } from 'vitest';
import {
  fitPlotAxes, impliedSctAngles, scale, sctPlotAxes, symmetricEigen, unprojectAzimuthalEquidistant,
  type FitPoint, type PlotAxes,
} from '../src/index';

function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function synthetic(axes: PlotAxes, noiseDeg: number, n = 14): FitPoint[] {
  const rnd = lcg(42);
  return Array.from({ length: n }, (_, i) => {
    const x = (rnd() - 0.5) * 80, y = (rnd() - 0.5) * 80;
    const direction = unprojectAzimuthalEquidistant({ x, y }, axes);
    return { id: `p${i}`, x: x + (rnd() - 0.5) * 2 * noiseDeg, y: y + (rnd() - 0.5) * 2 * noiseDeg, direction };
  });
}

describe('symmetricEigen', () => {
  it('satisfies A·v = λ·v', () => {
    const a = [[4, 1, 0, 2], [1, 3, 1, 0], [0, 1, 2, 1], [2, 0, 1, 5]];
    const { values, vectors } = symmetricEigen(a);
    values.forEach((lambda, k) => {
      const v = vectors[k]!;
      a.forEach((row, i) => expect(row.reduce((s, aij, j) => s + aij * v[j]!, 0)).toBeCloseTo(lambda * v[i]!, 10));
    });
  });
});

describe('fitPlotAxes', () => {
  it('recovers known SCT angles from noisy points', () => {
    const fit = fitPlotAxes(synthetic(sctPlotAxes(20, 15), 0.05));
    expect(fit.mirror).toBe(false);
    expect(fit.rmsDeg).toBeLessThan(0.1);
    const a = impliedSctAngles(fit.axes);
    expect(Math.abs(a.shaftDeg - 20)).toBeLessThan(0.2);
    expect(Math.abs(a.trunnionDeg - 15)).toBeLessThan(0.2);
  });
  it('detects a mirrored plot', () => {
    const t = sctPlotAxes(-40, 30);
    const fit = fitPlotAxes(synthetic({ ...t, ex: scale(t.ex, -1) }, 0.05));
    expect(fit.mirror).toBe(true);
    expect(fit.rmsDeg).toBeLessThan(0.1);
  });
  it('needs at least three points', () => {
    expect(() => fitPlotAxes(synthetic(sctPlotAxes(0, 0), 0, 2))).toThrow(/at least 3/);
  });
});
