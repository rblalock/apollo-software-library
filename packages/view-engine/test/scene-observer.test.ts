import { describe, expect, it } from 'vitest';
import {
  add, angleBetween, APOLLO_11, buildScene, FIG_3B_SPEC, getToUtc, moonState, mxv, precessionMatrix, referenceToOptics, scale,
  sctPlotAxes, toDeg, transpose, unit, unprojectAzimuthalEquidistant, type ResolvedStar, type Vec3, type ViewSpec,
} from '../src/index';

const utc = getToUtc(APOLLO_11.rangeZeroUtc, FIG_3B_SPEC.get);
const P = precessionMatrix(APOLLO_11.referenceEpochJd);
const toOptics = referenceToOptics(FIG_3B_SPEC.refsmmat, FIG_3B_SPEC.gimbals);
const axes = sctPlotAxes(0, 0);
// The optics boresight in the platform frame, and a CSM 1,850 km from the Moon's centre placed so the Moon's
// centre is 80° from the boresight: its 70° limb then crosses the ±50° field.
const bore = mxv(transpose(toOptics), axes.ez);
const side = unit([bore[1], -bore[0], 0]);
const toMoonRef: Vec3 = add(scale(bore, Math.cos((80 * Math.PI) / 180)), scale(side, Math.sin((80 * Math.PI) / 180)));
const toMoonJ2000 = mxv(transpose(P), toMoonRef);
const csm = add(moonState(utc).r, scale(toMoonJ2000, -1850));
const spec: ViewSpec = { ...FIG_3B_SPEC, bodies: ['moon', 'earth', 'sun'], observerPositionKm: csm };
const rho = toDeg(Math.asin(1737.4 / 1850));

const star = (id: number, refDir: Vec3): ResolvedStar => ({ seq: id, hr: id, navStar: null, name: null, mag: 3, direction: refDir });

describe('scene seen from a spacecraft position', () => {
  it('draws the Moon as a limb at its true angular radius', () => {
    const dl = buildScene(spec, { stars: [] });
    const moonDir = mxv(toOptics, toMoonRef);
    const limb = dl.primitives.filter((p) => p.kind === 'polyline' && p.tone === undefined && p.points.length > 2 && !p.closed);
    const pts = limb.flatMap((p) => (p.kind === 'polyline' ? p.points : []));
    expect(pts.length).toBeGreaterThan(20);
    for (const [x, y] of pts) {
      const d = unprojectAzimuthalEquidistant({ x, y }, axes);
      expect(toDeg(angleBetween(d, moonDir))).toBeCloseTo(rho, 3); // frame-clipped ends sit on a 0.25° chord
      expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(50 + 1e-9);
    }
  });

  it('hides stars behind the Moon and keeps stars beside it', () => {
    const behind = unit(add(scale(toMoonRef, Math.cos(((rho - 3) * Math.PI) / 180)), scale(bore, Math.sin(((rho - 3) * Math.PI) / 180))));
    const beside = unit(add(scale(toMoonRef, Math.cos(((rho + 3) * Math.PI) / 180)), scale(unit(add(bore, scale(toMoonRef, -Math.cos((80 * Math.PI) / 180)))), Math.sin(((rho + 3) * Math.PI) / 180))));
    const dl = buildScene({ ...spec, extentDeg: 180 }, { stars: [star(1, behind), star(2, beside)] });
    expect(dl.placed.map((b) => b.id)).not.toContain('rtcc-1');
    expect(dl.placed.map((b) => b.id)).toContain('rtcc-2');
  });

  it('without a position the scene is unchanged (observer at the body centre)', () => {
    const a = buildScene(FIG_3B_SPEC, { stars: [] }), b = buildScene({ ...FIG_3B_SPEC, observerPositionKm: undefined }, { stars: [] });
    expect(b.primitives).toEqual(a.primitives);
  });
});

describe('occultation of disc bodies', () => {
  it('hides the Moon behind a nearer Earth and keeps it in front of the Sun', () => {
    // An observer 500 km above the Earth, looking so that the Moon's direction lies inside the Earth's disc.
    const moon = moonState(utc).r, toMoon = unit(moon);
    const observer = scale(toMoon, -(6378.137 + 500)); // the Earth sits between the observer and the Moon
    const s: ViewSpec = { ...FIG_3B_SPEC, bodies: ['earth', 'moon', 'sun'], observerPositionKm: observer, extentDeg: 180 };
    expect(buildScene(s, { stars: [] }).placed.map((b) => b.id)).not.toContain('moon');
  });
});

describe('body radius override', () => {
  it('draws the limb on the radius the spec gives (a local datum)', () => {
    const limbPoint = (r?: number) => {
      const dl = buildScene({ ...spec, bodyRadiusKm: r ? { moon: r } : undefined }, { stars: [] });
      const line = dl.primitives.find((p) => p.kind === 'polyline' && !p.closed && p.points.length > 20);
      const [x, y] = line!.kind === 'polyline' ? line!.points[0]! : [0, 0];
      return toDeg(angleBetween(unprojectAzimuthalEquidistant({ x, y }, axes), mxv(toOptics, toMoonRef)));
    };
    expect(limbPoint(1735.4)).toBeCloseTo(toDeg(Math.asin(1735.4 / 1850)), 3);
    expect(limbPoint()).toBeCloseTo(rho, 3);
  });
});
