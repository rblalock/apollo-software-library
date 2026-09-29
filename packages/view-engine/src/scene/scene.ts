import { mxv } from '../math/mat';
import type { ResolvedStar } from '../catalog/resolve';
import { BODY_LABEL, bodyAngularRadiusDeg, bodyDirection, type BodyName } from '../ephemeris/ephemeris';
import { referenceToOptics, SCT_FIELD_OF_VIEW_DEG, sctPlotAxes } from '../frames/frames';
import { projectAzimuthalEquidistant, type PlotPoint } from '../projection/projection';
import { getToUtc } from '../time/time';
import type { DisplayList, Layer, PlacedBody, Primitive, ViewSpec } from './types';

export interface SceneData { stars: ResolvedStar[] }

/** Frame tick labels printed on the 1969 plots (bottom and left edges). */
const TICK_LABELS = [-50, -40, -20, 0, 20, 40, 50];
const TEXT_DEG = 2.4;

/**
 * The 0–50 scale along the SCT reticle's vertical diameter, as drawn on TN D-6853 Fig 3
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
    if (Math.abs(y) > 1) out.push(text(1.6, y, String(v), 'start', 'machine', { sizeDeg: 2 }));
  }
  for (let x = -25; x <= 25; x += 5) if (x !== 0) out.push(line(x, -0.9, x, 0.9));
  return out;
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

const kindOf = (b: BodyName): PlacedBody['kind'] => (b === 'earth' || b === 'sun' || b === 'moon' ? b : 'planet');

export function buildScene(spec: ViewSpec, data: SceneData): DisplayList {
  const utc = getToUtc(spec.rangeZeroUtc, spec.get);
  const toOptics = referenceToOptics(spec.refsmmat, spec.gimbals);
  const axes = sctPlotAxes(spec.instrument.shaftDeg, spec.instrument.trunnionDeg);
  const e = spec.extentDeg;
  const inside = (p: PlotPoint) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= e && Math.abs(p.y) <= e;
  const primitives: Primitive[] = [...frame(e), ...sctReticle()];
  const placed: PlacedBody[] = [];

  for (const s of data.stars) {
    const direction = mxv(toOptics, s.direction);
    const p = projectAzimuthalEquidistant(direction, axes);
    if (!inside(p)) continue;
    if (s.navStar !== null) {
      primitives.push({ kind: 'navMark', x: p.x, y: p.y }, text(p.x + 1.2, p.y - 2.2, s.name ?? `Star ${s.navStar}`, 'start', 'annotation'));
      placed.push({ id: `nav-${s.navStar}`, label: s.name, kind: 'navStar', x: p.x, y: p.y, direction });
    } else {
      primitives.push({ kind: 'dot', x: p.x, y: p.y });
      placed.push({ id: `rtcc-${s.seq}`, label: null, kind: 'star', x: p.x, y: p.y, direction });
    }
  }

  for (const body of spec.bodies) {
    if (body === spec.observer) continue;
    const direction = mxv(toOptics, bodyDirection(body, spec.observer, utc, spec.referenceEpochJd));
    const p = projectAzimuthalEquidistant(direction, axes);
    if (!inside(p)) continue;
    const isDisc = body === 'earth' || body === 'sun' || body === 'moon';
    const r = isDisc ? Math.max(bodyAngularRadiusDeg(body, spec.observer, utc), 0.9) : 0.6;
    primitives.push(
      { kind: 'disc', x: p.x, y: p.y, r, filled: body === 'earth' },
      text(p.x + r + 0.8, p.y - r - 1.2, BODY_LABEL[body], 'start', 'annotation', { boxed: !isDisc }),
    );
    placed.push({ id: body, label: BODY_LABEL[body], kind: kindOf(body), x: p.x, y: p.y, direction });
  }

  primitives.push(...header(spec));
  const notes = spec.observer === 'moon'
    ? ['The observer is the Moon’s center: the spacecraft’s orbital offset (< 0.3° for Earth) and lunar occlusion are not modeled.']
    : [];
  return { extentDeg: e, utc, primitives, placed, notes };
}
