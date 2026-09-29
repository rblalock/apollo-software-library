import { mxv, type Mat3 } from '../math/mat';
import { add, angleBetween, cross, norm, scale, toDeg, toRad, unit, type Vec3 } from '../math/vec';
import type { ResolvedStar } from '../catalog/resolve';
import { precessionMatrix } from '../catalog/precession';
import {
  BODY_LABEL, BODY_RADIUS_KM, bodyAngularRadiusDeg, bodyDirection, bodyVectorFromPointKm, type BodyName,
} from '../ephemeris/ephemeris';
import { referenceToOptics, SCT_FIELD_OF_VIEW_DEG, sctPlotAxes } from '../frames/frames';
import { AOT_FIELD_OF_VIEW_DEG, aotPlotAxes, aotReticleAngleDeg } from '../frames/aot';
import { clipToSquare, projectAzimuthalEquidistant, type PlotAxes, type PlotPoint } from '../projection/projection';
import { getToUtc } from '../time/time';
import type { DisplayList, Layer, PlacedBody, Primitive, ViewSpec } from './types';

export interface SceneData { stars: ResolvedStar[] }

/** Frame tick labels printed on the 1969 plots (bottom and left edges). */
const TICK_LABELS = [-50, -40, -20, 0, 20, 40, 50];
const TEXT_DEG = 2.4;

/**
 * The −0…−50 scale along the SCT reticle's vertical diameter, as drawn on TN D-6853 Fig 3
 * and 69-FM-197 Fig 9.3-8. Neither document explains it. 0 sits 25° below the center:
 * on the TN D-6853 scan the '0' tick measures −24.9° and the '5' tick −20.2°.
 */
export const SCT_SCALE = { zeroAtYDeg: -25, stepDeg: 5, max: 50 } as const;

const text = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end', layer: Layer, opts: { boxed?: boolean; sizeDeg?: number; rotate?: number } = {}): Primitive =>
  ({ kind: 'text', x, y, text: t, anchor, layer, boxed: opts.boxed ?? false, sizeDeg: opts.sizeDeg ?? TEXT_DEG, rotate: opts.rotate });
const line = (x1: number, y1: number, x2: number, y2: number): Primitive =>
  ({ kind: 'polyline', points: [[x1, y1], [x2, y2]], closed: false });

function frame(e: number): Primitive[] {
  const out: Primitive[] = [{ kind: 'polyline', points: [[-e, -e], [e, -e], [e, e], [-e, e]], closed: true }];
  for (let v = -e + 2; v < e; v += 2) {
    const len = v % 10 === 0 ? 1.6 : 0.8;
    out.push(line(v, -e, v, -e + len), line(v, e, v, e - len), line(-e, v, -e + len, v), line(e, v, e - len, v));
  }
  for (const v of TICK_LABELS) {
    out.push(text(v, -e - 3, String(v), 'middle', 'machine'), text(-e - 1.4, v, String(v), 'end', 'machine'));
  }
  out.push(text(0, -e - 7, 'X, deg', 'middle', 'annotation'), text(-e - 9, 0, 'Y, deg', 'middle', 'annotation', { rotate: 90 }));
  return out;
}

function sctReticle(): Primitive[] {
  const r = SCT_FIELD_OF_VIEW_DEG / 2;
  const circle = Array.from({ length: 180 }, (_, i) => {
    const a = (i / 180) * 2 * Math.PI;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  });
  const out: Primitive[] = [{ kind: 'polyline', points: circle, closed: true }, line(0, -r, 0, r), line(-r, 0, r, 0)];
  for (let v = 0; v <= SCT_SCALE.max; v += SCT_SCALE.stepDeg) {
    const y = SCT_SCALE.zeroAtYDeg + v;
    out.push(line(-0.9, y, 0.9, y));
    if (Math.abs(y) > 1) out.push(text(1.6, y, `-${v}`, 'start', 'machine', { sizeDeg: 2 }));
  }
  for (let x = -25; x <= 25; x += 5) if (x !== 0) out.push(line(x, -0.9, x, 0.9));
  return out;
}

/** AOT field circle and reticle cross, the cross rotated with the image as on the 1969 figures. */
function aotReticle(detentDeg: number): Primitive[] {
  const r = AOT_FIELD_OF_VIEW_DEG / 2;
  const circle = Array.from({ length: 180 }, (_, i) => {
    const a = (i / 180) * 2 * Math.PI;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  });
  const t = (aotReticleAngleDeg(detentDeg) * Math.PI) / 180;
  const c = r * Math.cos(t), s = r * Math.sin(t);
  return [{ kind: 'polyline', points: circle, closed: true }, line(-c, -s, c, s), line(s, -c, -s, c)];
}

function header(spec: ViewSpec): Primitive[] {
  const e = spec.extentDeg, g = spec.gimbals;
  const right = ['Gimbal angles', `I = ${g.inner.toFixed(1)}°`, `M = ${g.middle.toFixed(1)}°`, `O = ${g.outer.toFixed(1)}°`];
  const y = (i: number, n: number) => e + 2.5 + (n - 1 - i) * 3;
  return [
    ...spec.headerLeft.map((t, i) => text(-e, y(i, spec.headerLeft.length), t, 'start', 'annotation')),
    ...right.map((t, i) => text(e, y(i, right.length), t, 'end', 'annotation')),
  ];
}

/** Bodies drawn as a limb (the small circle of their angular radius) rather than a disc glyph. */
const LIMB_MIN_RADIUS_DEG = 3;

/** The limb of a body of angular radius `radiusDeg` about optics direction `d`, as frame-clipped polylines. */
function limb(d: Vec3, radiusDeg: number, axes: PlotAxes, e: number): Primitive[] {
  const u = unit(cross(d, Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), v = cross(d, u);
  const rho = toRad(radiusDeg), n = 1440;
  const at = (i: number) => {
    const phi = (2 * Math.PI * i) / n;
    const p = projectAzimuthalEquidistant(add(scale(d, Math.cos(rho)), scale(add(scale(u, Math.cos(phi)), scale(v, Math.sin(phi))), Math.sin(rho))), axes);
    return [p.x, p.y] as const;
  };
  const runs: [number, number][][] = [];
  let prev = at(0), open = false;
  for (let i = 1; i <= n; i++) {
    const cur = at(i);
    // Near the boresight's antipode the projection tears; such chords never belong to the drawn limb.
    const c = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) < 10 ? clipToSquare(prev, cur, e) : null;
    if (c) {
      const run = runs.at(-1);
      if (open && run) run.push(c[1]); else runs.push([c[0], c[1]]);
      open = c[1][0] === cur[0] && c[1][1] === cur[1];
    } else open = false;
    prev = cur;
  }
  return runs.map((points) => ({ kind: 'polyline', points, closed: false }));
}

const kindOf = (b: BodyName): PlacedBody['kind'] => (b === 'earth' || b === 'sun' || b === 'moon' ? b : 'planet');

export function buildScene(spec: ViewSpec, data: SceneData): DisplayList {
  const utc = getToUtc(spec.rangeZeroUtc, spec.get);
  const inst = spec.instrument;
  const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const toOptics = inst.kind === 'sct' ? referenceToOptics(spec.refsmmat, spec.gimbals) : inst.kind === 'aot' ? inst.lmBodyFromRef : IDENTITY;
  const axes = inst.kind === 'sct' ? sctPlotAxes(inst.shaftDeg, inst.trunnionDeg) : inst.kind === 'aot' ? aotPlotAxes(inst.detentDeg) : inst.axes;
  const e = spec.extentDeg;
  const inside = (p: PlotPoint) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= e && Math.abs(p.y) <= e;
  const reticle = inst.kind === 'sct' ? sctReticle() : inst.kind === 'aot' ? aotReticle(inst.detentDeg) : [];
  const outlines: Primitive[] = (spec.outlines ?? []).map((points) => ({ kind: 'polyline', points, closed: true }));
  const primitives: Primitive[] = [...frame(e), ...reticle, ...outlines];
  const placed: PlacedBody[] = [];

  // Where each body is: from the observer body's centre, or from the spacecraft position when one is given.
  const pos = spec.observerPositionKm;
  const P = precessionMatrix(spec.referenceEpochJd);
  const geometry = (body: BodyName): { body: BodyName; direction: Vec3; radiusDeg: number; distanceKm: number } => {
    if (!pos) return { body, direction: mxv(toOptics, bodyDirection(body, spec.observer, utc, spec.referenceEpochJd)), radiusDeg: bodyAngularRadiusDeg(body, spec.observer, utc), distanceKm: Infinity };
    const v = bodyVectorFromPointKm(body, pos, utc);
    return { body, direction: mxv(toOptics, unit(mxv(P, v))), radiusDeg: toDeg(Math.asin(Math.min(1, BODY_RADIUS_KM[body] / norm(v)))), distanceKm: norm(v) };
  };
  const drawn = spec.bodies.filter((b) => pos || b !== spec.observer);
  const occulters = pos ? drawn.filter((b) => b === 'earth' || b === 'moon').map(geometry) : [];
  /** Hidden behind a nearer Earth or Moon (stars are infinitely far). */
  const occulted = (d: Vec3, self?: BodyName, distanceKm = Infinity) =>
    occulters.some((o) => o.body !== self && o.distanceKm < distanceKm && toDeg(angleBetween(d, o.direction)) < o.radiusDeg);

  for (const s of data.stars) {
    const direction = mxv(toOptics, s.direction);
    if (occulted(direction)) continue;
    const p = projectAzimuthalEquidistant(direction, axes);
    if (!inside(p)) continue;
    if (s.navStar !== null) {
      // TN D-6853 appendix: the 37 prime navigation stars "are identified by name on the microfilm".
      primitives.push({ kind: 'navMark', x: p.x, y: p.y }, text(p.x + 1.2, p.y - 2.2, s.name ?? `Star ${s.navStar}`, 'start', 'machine'));
      placed.push({ id: `nav-${s.navStar}`, label: s.name, kind: 'navStar', x: p.x, y: p.y, direction });
    } else {
      primitives.push({ kind: 'dot', x: p.x, y: p.y });
      placed.push({ id: `rtcc-${s.seq}`, label: null, kind: 'star', x: p.x, y: p.y, direction });
    }
  }

  for (const body of drawn) {
    const { direction, radiusDeg, distanceKm } = geometry(body);
    const isDisc = body === 'earth' || body === 'sun' || body === 'moon';
    if (occulted(direction, body, distanceKm)) continue;
    const p = projectAzimuthalEquidistant(direction, axes);
    if (isDisc && radiusDeg >= LIMB_MIN_RADIUS_DEG) {
      primitives.push(...limb(direction, radiusDeg, axes, e));
      if (inside(p)) placed.push({ id: body, label: BODY_LABEL[body], kind: kindOf(body), x: p.x, y: p.y, direction });
      continue;
    }
    if (!inside(p)) continue;
    const r = isDisc ? Math.max(radiusDeg, 0.9) : 0.6;
    primitives.push(
      { kind: 'disc', x: p.x, y: p.y, r, filled: body === 'earth' },
      text(p.x + r + 0.8, p.y - r - 1.2, BODY_LABEL[body], 'start', 'annotation', { boxed: !isDisc }),
    );
    placed.push({ id: body, label: BODY_LABEL[body], kind: kindOf(body), x: p.x, y: p.y, direction });
  }

  if (inst.kind === 'sct') primitives.push(...header(spec));
  const notes = pos
    ? ['Seen from the spacecraft’s reconstructed position: bodies include parallax, and stars behind the Earth or Moon are hidden.']
    : spec.observer === 'moon'
      ? ['The observer is the Moon’s center: the spacecraft’s orbital offset (< 0.3° for Earth) and lunar occlusion are not modeled.']
      : [];
  return { extentDeg: e, utc, primitives, placed, notes };
}
