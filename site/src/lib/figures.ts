import {
  APOLLO_11, buildScene, FIG_3A_SPEC, FIG_3B_SPEC, FIG_3C_SIGN_CORRECTED_SPEC, fig4Spec, fitPlotAxes, impliedSctAngles,
  resolveCatalog, type Agc37File, type BscFile, type DisplayList, type Primitive, type RtccFile, type Underlay, type ViewSpec,
} from '@asl/view-engine';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import p3a from '../../../data/derived/fig3a-points.json';
import p3b from '../../../data/derived/fig3b-points.json';
import p3c from '../../../data/derived/fig3c-points.json';
import p4a from '../../../data/derived/fig4a-points.json';
import p4b from '../../../data/derived/fig4b-points.json';
import p4c from '../../../data/derived/fig4c-points.json';
import p4d from '../../../data/derived/fig4d-points.json';
import p4e from '../../../data/derived/fig4e-points.json';
import p4f from '../../../data/derived/fig4f-points.json';

export const TOLERANCE = { rmsDeg: 1.0, maxDeg: 2.0 } as const;

export const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

interface PointsFile {
  image: { widthPx: number; heightPx: number };
  frame: { leftX: number; rightX: number; topY: number; bottomY: number };
  points: Array<{ id: string; kind: string; actually?: string; note?: string; xDeg: number; yDeg: number }>;
}

export interface FigureConfig {
  id: string;
  /** Short panel label, e.g. "(a) Front detent". */
  label: string;
  spec: ViewSpec;
  points: PointsFile;
  scanHref: string;
  /** How the attitude was obtained, shown in the inputs panel. */
  attitudeNote: string;
}

const fig = (id: string, label: string, spec: ViewSpec, points: PointsFile, attitudeNote: string): FigureConfig =>
  ({ id, label, spec, points, scanHref: `/scans/tnd6853-${id}.png`, attitudeNote });

const SCT_PRINTED = 'Gimbal angles as printed on the figure.';
const AOT_NOTE = 'LM surface attitude fitted on panel (a) only and frozen; this panel is predicted with no further fitting.';

export const FIGURES: Record<string, FigureConfig> = {
  fig3a: fig('fig3a', 'Figure 3a', FIG_3A_SPEC, p3a, SCT_PRINTED),
  fig3b: fig('fig3b', 'Figure 3b', FIG_3B_SPEC, p3b, SCT_PRINTED),
  fig3c: fig('fig3c', 'Figure 3c', FIG_3C_SIGN_CORRECTED_SPEC, p3c,
    'Inner gimbal sign corrected to −89.10° (both documents print +89.10°, which points the telescope the opposite way). Inferred from this figure\'s own stars, so the fit below is a consistency check, not independent validation.'),
  fig4a: fig('fig4a', '(a) Front', fig4Spec('front'), p4a, 'LM surface attitude fitted on this panel (a); it calibrates panels (b)–(f).'),
  fig4b: fig('fig4b', '(b) Left front', fig4Spec('leftFront'), p4b, AOT_NOTE),
  fig4c: fig('fig4c', '(c) Left rear', fig4Spec('leftRear'), p4c, AOT_NOTE),
  fig4d: fig('fig4d', '(d) Rear', fig4Spec('rear'), p4d, AOT_NOTE),
  fig4e: fig('fig4e', '(e) Right rear', fig4Spec('rightRear'), p4e, AOT_NOTE),
  fig4f: fig('fig4f', '(f) Right front', fig4Spec('rightFront'), p4f, AOT_NOTE),
};

export const scanUnderlay = (f: FigureConfig, opacity: number, invert: boolean): Underlay => ({
  href: f.scanHref, widthPx: f.points.image.widthPx, heightPx: f.points.image.heightPx, frame: f.points.frame, opacity, invert,
});

export interface ResidualRow {
  id: string;
  /** The body the glyph actually is, when the published label is wrong. */
  actually?: string;
  kind: string;
  scanX: number;
  scanY: number;
  modelX: number;
  modelY: number;
  dist: number;
  pass: boolean;
}

/** Residuals of a figure's labeled bodies, measured without the ±50° display clip (as in the golden tests). */
export function residuals(f: FigureConfig): { rows: ResidualRow[]; rmsDeg: number; maxDeg: number } {
  const dl = buildScene({ ...f.spec, extentDeg: 60 }, { stars });
  const rows = f.points.points.map((p): ResidualRow => {
    const b = dl.placed.find((q) => q.label === (p.actually ?? p.id));
    const modelX = b?.x ?? Number.NaN, modelY = b?.y ?? Number.NaN;
    const dist = Math.hypot(modelX - p.xDeg, modelY - p.yDeg);
    return { id: p.id, actually: p.actually, kind: p.kind, scanX: p.xDeg, scanY: p.yDeg, modelX, modelY, dist, pass: dist <= TOLERANCE.maxDeg };
  });
  const found = rows.filter((r) => Number.isFinite(r.dist));
  return { rows, rmsDeg: Math.sqrt(found.reduce((s, r) => s + r.dist ** 2, 0) / found.length), maxDeg: Math.max(...found.map((r) => r.dist)) };
}

/** Arrows from each scan position toward the recreated position, magnified by `factor`. */
export function residualArrows(rows: ResidualRow[], factor = 5): Primitive[] {
  return rows.filter((r) => Number.isFinite(r.dist)).map((r): Primitive => ({
    kind: 'polyline', closed: false, tone: 'accent',
    points: [[r.scanX, r.scanY], [r.scanX + (r.modelX - r.scanX) * factor, r.scanY + (r.modelY - r.scanY) * factor]],
  }));
}

/** Scanning-telescope angles recovered by fitting a figure freely (validation, not an input). */
export function recoveredSct(f: FigureConfig): { shaftDeg: number; trunnionDeg: number } | null {
  if (f.spec.instrument.kind !== 'sct') return null;
  const dl = buildScene({ ...f.spec, extentDeg: 180 }, { stars });
  const pts = f.points.points.flatMap((p) => {
    const b = dl.placed.find((q) => q.label === (p.actually ?? p.id));
    return b ? [{ id: p.id, x: p.xDeg, y: p.yDeg, direction: b.direction }] : [];
  });
  return impliedSctAngles(fitPlotAxes(pts).axes);
}

export const baselineScene = (f: FigureConfig): DisplayList => buildScene(f.spec, { stars });
