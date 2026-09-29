import { describe, expect, it } from 'vitest';
import { APOLLO_11, axesFromBoresight, buildScene, FIG_3A_SPEC, projectAzimuthalEquidistant, unit, type ResolvedStar, type ViewSpec } from '../src/index';

const axes = axesFromBoresight([1, 0, 0], [0, 0, 1]);
const spec: ViewSpec = {
  ...FIG_3A_SPEC,
  instrument: { kind: 'fixed', axes },
  bodies: [],
  headerLeft: [],
  outlines: [[[-5, 30], [5, 30], [5, 40], [-5, 40]]],
};
const star: ResolvedStar = { seq: 1, hr: 1, navStar: null, name: null, mag: 2, direction: unit([1, 0.2, 0.1]) };

describe('fixed-attitude window views', () => {
  it('projects with the given axes and draws no reticle or gimbal header', () => {
    const dl = buildScene(spec, { stars: [star] });
    const p = projectAzimuthalEquidistant(star.direction, axes);
    expect(dl.placed[0]!.x).toBeCloseTo(p.x, 12);
    expect(dl.placed[0]!.y).toBeCloseTo(p.y, 12);
    expect(dl.primitives.some((q) => q.kind === 'text' && q.text.startsWith('Gimbal'))).toBe(false);
  });
  it('draws the window outlines as closed polylines', () => {
    const dl = buildScene(spec, { stars: [] });
    expect(dl.primitives.some((q) => q.kind === 'polyline' && q.closed && q.points.length === 4 && q.points[0]![1] === 30)).toBe(true);
  });
  it('still needs no platform data (the REFSMMAT is ignored)', () => {
    expect(() => buildScene({ ...spec, refsmmat: APOLLO_11.refsmmat.lunarLiftoff }, { stars: [] })).not.toThrow();
  });
});
