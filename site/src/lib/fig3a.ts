import {
  APOLLO_11, buildScene, FIG_3A_SPEC, fitPlotAxes, impliedSctAngles, resolveCatalog,
  type Agc37File, type BscFile, type DisplayList, type Primitive, type RtccFile, type Underlay,
} from '@asl/view-engine';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import points from '../../../data/derived/fig3a-points.json';

export const TOLERANCE = { rmsDeg: 1.0, maxDeg: 2.0 } as const;

export const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

export const scanUnderlay = (opacity: number, invert: boolean): Underlay => ({
  href: '/scans/tnd6853-fig3a.png',
  widthPx: points.image.widthPx,
  heightPx: points.image.heightPx,
  frame: points.frame,
  opacity,
  invert,
});

export interface ResidualRow {
  id: string;
  kind: string;
  scanX: number;
  scanY: number;
  modelX: number;
  modelY: number;
  dist: number;
  pass: boolean;
}

export function residuals(dl: DisplayList): { rows: ResidualRow[]; rmsDeg: number; maxDeg: number } {
  const rows = points.points.map((p): ResidualRow => {
    const b = dl.placed.find((q) => q.label === p.id);
    const modelX = b?.x ?? Number.NaN, modelY = b?.y ?? Number.NaN;
    const dist = Math.hypot(modelX - p.xDeg, modelY - p.yDeg);
    return { id: p.id, kind: p.kind, scanX: p.xDeg, scanY: p.yDeg, modelX, modelY, dist, pass: dist <= TOLERANCE.maxDeg };
  });
  const found = rows.filter((r) => Number.isFinite(r.dist));
  return {
    rows,
    rmsDeg: Math.sqrt(found.reduce((s, r) => s + r.dist ** 2, 0) / found.length),
    maxDeg: Math.max(...found.map((r) => r.dist)),
  };
}

/** Arrows from each scan position toward the recreated position, magnified by `factor`. */
export function residualArrows(rows: ResidualRow[], factor = 5): Primitive[] {
  return rows.filter((r) => Number.isFinite(r.dist)).map((r): Primitive => ({
    kind: 'polyline',
    closed: false,
    tone: 'accent',
    points: [[r.scanX, r.scanY], [r.scanX + (r.modelX - r.scanX) * factor, r.scanY + (r.modelY - r.scanY) * factor]],
  }));
}

export const baseline = buildScene(FIG_3A_SPEC, { stars });
export const baselineResiduals = residuals(baseline);

/** Instrument angles recovered by fitting the scan freely (validation, not an input). */
export const recovered = (() => {
  const fit = fitPlotAxes(points.points.map((p) => ({
    id: p.id, x: p.xDeg, y: p.yDeg, direction: baseline.placed.find((b) => b.label === p.id)!.direction,
  })));
  return { ...impliedSctAngles(fit.axes), rmsDeg: fit.rmsDeg, mirror: fit.mirror };
})();
