import {
  APOLLO_11, buildScene, createMissionEphemeris, descentPosition, formatGet, type DescentProfile, getToUtc, parseGet, stateToEarthEvent, type EventTable, type GimbalAngles, type VehicleId, FIG_3A_SPEC, resolveVerifiedCatalog, type VerifiedCatalogFile, FIG_3B_SPEC, FIG_3C_SIGN_CORRECTED_SPEC, fig4Spec, fitPlotAxes, impliedSctAngles,
  resolveCatalog, type Agc37File, type BscFile, type DisplayList, type Primitive, type RtccFile, type Underlay, type ViewSpec,
} from '@asl/view-engine';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import cat1078 from '../../../data/derived/cat1078.json';
import p3a from '../../../data/derived/fig3a-points.json';
import p3b from '../../../data/derived/fig3b-points.json';
import p3c from '../../../data/derived/fig3c-points.json';
import p4a from '../../../data/derived/fig4a-points.json';
import p4b from '../../../data/derived/fig4b-points.json';
import p4c from '../../../data/derived/fig4c-points.json';
import p4d from '../../../data/derived/fig4d-points.json';
import p4e from '../../../data/derived/fig4e-points.json';
import p4f from '../../../data/derived/fig4f-points.json';
import events from '../../../data/manual/a11-events.json';
import p1 from '../../../data/derived/fig1-points.json';
import p2 from '../../../data/derived/fig2-points.json';
import cmWindow from '../../../data/derived/cm-window-outline.json';
import lmDocking from '../../../data/derived/lm-docking-window.json';
import descentProfile from '../../../data/manual/a11-descent-profile.json';
import pdiA from '../../../data/derived/pdi-a-points.json';
import pdiE from '../../../data/derived/pdi-e-points.json';
import pdiJ from '../../../data/derived/pdi-j-points.json';
import pdiP from '../../../data/derived/pdi-p-points.json';

export const TOLERANCE = { rmsDeg: 1.0, maxDeg: 2.0 } as const;

export const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

/** The 1,078-star catalogue of 69-FM-107 Table I: the rows verified so far (826). */
export const stars1078 = resolveVerifiedCatalog(cat1078 as VerifiedCatalogFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
export const CATALOGS = {
  rtcc: { label: 'RTCC 148', stars },
  cat1078: { label: `1,078 (${cat1078.stars.length} read)`, stars: stars1078 },
} as const;
export type CatalogId = keyof typeof CATALOGS;

interface PointsFile {
  image: { widthPx: number; heightPx: number };
  frame: { leftX: number; rightX: number; topY: number; bottomY: number };
  points: Array<{ id: string; kind: string; actually?: string; note?: string; xDeg: number; yDeg: number }>;
}

/** Vehicle states from the Apollo 11 Mission Report's trajectory table (engine: createMissionEphemeris). */
export const mission = createMissionEphemeris(events as EventTable, APOLLO_11.rangeZeroUtc);

export interface FigureConfig {
  id: string;
  /** The spacecraft the view is drawn from, when its reconstructed position is used for display. */
  observer?: VehicleId;
  /** Short panel label, e.g. "(a) Front detent". */
  label: string;
  spec: ViewSpec;
  points: PointsFile;
  scanHref: string;
  /** How the attitude was obtained, shown in the inputs panel. */
  attitudeNote: string;
}

const fig = (id: string, label: string, spec: ViewSpec, points: PointsFile, attitudeNote: string, observer?: VehicleId, scan = `tnd6853-${id}.png`): FigureConfig =>
  ({ id, label, spec, points, scanHref: `/scans/${scan}`, attitudeNote, observer });

const SCT_PRINTED = 'Gimbal angles as printed on the figure.';

/** GET (s) where the reconstructed CSM altitude equals the figure's printed altitude (stat. mi.). */
function atAltitude(from: string, to: string, statMi: number): number {
  const alt = (t: number) => (stateToEarthEvent(mission.state('csm', t)!, getToUtc(APOLLO_11.rangeZeroUtc, t)).altNmi * 1.852) / 1.609344;
  let a = parseGet(from), b = parseGet(to);
  const rising = alt(b) > alt(a);
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if ((alt(m) < statMi) === rising) a = m; else b = m; }
  return a;
}

/** A CM window view (TN D-6853 Figs 1–2): time from the printed altitude, attitude fitted from the labelled stars. */
function windowSpec(points: PointsFile, from: string, to: string, statMi: number): { spec: ViewSpec; note: string } {
  const t = atAltitude(from, to, statMi);
  const fit = fitPlotAxes(points.points.filter((p) => p.kind === 'star').map((p) => ({ id: p.id, x: p.xDeg, y: p.yDeg, direction: stars.find((s) => s.name === p.id)!.direction })));
  const outline = (poly: number[][]) => poly.map(([x, y]) => [x!, y!] as const);
  return {
    spec: {
      ...FIG_3A_SPEC,
      get: `${formatGet(t)}${(t % 1).toFixed(1).slice(1)}`,
      observer: 'earth',
      observerPositionKm: mission.state('csm', t)!.r,
      gimbals: { inner: 0, middle: 0, outer: 0 },
      instrument: { kind: 'fixed', axes: fit.axes },
      bodies: ['earth', 'sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn'],
      headerLeft: [`Altitude = ${statMi} stat. mi.`, 'Field of view = 100°'],
      outlines: [outline(cmWindow.leftEye), outline(cmWindow.rightEye)],
    },
    note: `Time: when the reconstructed altitude is the printed ${statMi} stat. mi. Attitude not printed: fitted from the ${fit.residuals.length} labelled stars (RMS ${fit.rmsDeg.toFixed(2)}°).`,
  };
}
const FIG1 = windowSpec(p1, '2:44:17', '2:50:03', 192), FIG2 = windowSpec(p2, '194:49:13', '195:03:05', 302);

/** An LM docking-window frame of the powered descent (69-FM-197 Fig 6.2.2-1), at the planned PDI + `tfiS`. */
function descentSpec(points: PointsFile, tfiS: number): { spec: ViewSpec; note: string } {
  const t = parseGet(descentProfile.pdiGet) + tfiS;
  const pdi = (events as EventTable).events.find((e) => e.id === 'pdi')!;
  const lm = descentPosition(descentProfile as DescentProfile, { latDeg: 0.6875, lonDeg: 23.4333 }, { latDeg: pdi.latDeg, lonDeg: pdi.lonDeg }, APOLLO_11.rangeZeroUtc, t);
  const fit = fitPlotAxes(points.points.filter((p) => p.kind === 'star').map((p) => ({ id: p.id, x: p.xDeg, y: p.yDeg, direction: stars.find((s) => s.name === p.id)!.direction })));
  const line = (poly: number[][]) => poly.map(([x, y]) => [x!, y!] as const);
  return {
    spec: {
      ...FIG_3A_SPEC,
      get: formatGet(t),
      observer: 'moon',
      observerPositionKm: lm,
      gimbals: { inner: 0, middle: 0, outer: 0 },
      instrument: { kind: 'fixed', axes: fit.axes },
      bodies: ['moon', 'earth', 'sun', 'venus', 'mars', 'jupiter', 'saturn'],
      headerLeft: [`${Math.floor(tfiS / 60)} min ${tfiS % 60} s into the descent burn`, 'Field of view = 100°'],
      outlines: [line(lmDocking.outline), ...lmDocking.scribe.map(line)],
    },
    note: `Time: the planned PDI (102:35:40) + ${tfiS} s; the LM on the note's planned descent profile. Attitude not printed: fitted from the ${fit.residuals.length} labelled stars (RMS ${fit.rmsDeg.toFixed(2)}°).`,
  };
}
const PDI = { a: descentSpec(pdiA, 0), e: descentSpec(pdiE, 126), j: descentSpec(pdiJ, 326), p: descentSpec(pdiP, 486) };
const AOT_NOTE = 'LM surface attitude fitted on panel (a) only and frozen; this panel is predicted with no further fitting.';

export const FIGURES: Record<string, FigureConfig> = {
  pdiA: fig('pdiA', '(a) Begin burn', PDI.a.spec, pdiA, PDI.a.note, undefined, '69fm197-pdi-a.png'),
  pdiE: fig('pdiE', '(e) 2:06', PDI.e.spec, pdiE, PDI.e.note, undefined, '69fm197-pdi-e.png'),
  pdiJ: fig('pdiJ', '(j) 5:26', PDI.j.spec, pdiJ, PDI.j.note, undefined, '69fm197-pdi-j.png'),
  pdiP: fig('pdiP', '(p) 8:06', PDI.p.spec, pdiP, PDI.p.note, undefined, '69fm197-pdi-p.png'),
  fig1: { ...fig('fig1', 'Figure 1 · TLI', FIG1.spec, p1, FIG1.note), observer: undefined },
  fig2: { ...fig('fig2', 'Figure 2 · Entry', FIG2.spec, p2, FIG2.note), observer: undefined },
  fig3a: fig('fig3a', 'Figure 3a', FIG_3A_SPEC, p3a, SCT_PRINTED, 'csm'),
  fig3b: fig('fig3b', 'Figure 3b', FIG_3B_SPEC, p3b, SCT_PRINTED, 'csm'),
  fig3c: fig('fig3c', 'Figure 3c', FIG_3C_SIGN_CORRECTED_SPEC, p3c,
    'Inner gimbal sign corrected to −89.10° (both documents print +89.10°, which points the telescope the opposite way). Inferred from this figure\'s own stars, so the fit below is a consistency check, not independent validation.', 'csm'),
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

/**
 * The spec a figure is displayed with: the reader's GET and gimbals, seen from the spacecraft's reconstructed
 * position when the figure names one and a state exists at that time (so the Moon's limb is drawn and stars
 * behind it are hidden). The golden residuals keep the registered Moon-centre spec.
 */
export function displaySpec(f: FigureConfig, over: { get?: string; gimbals?: GimbalAngles } = {}): ViewSpec {
  const spec = { ...f.spec, ...over };
  const state = f.observer ? mission.state(f.observer, parseGet(spec.get)) : null;
  if (!state) return spec;
  return { ...spec, observerPositionKm: state.r, bodies: spec.bodies.includes('moon') ? spec.bodies : [...spec.bodies, 'moon'] };
}

/** One line saying where the displayed observer position comes from. */
export function observerNote(f: FigureConfig, get: string): string | null {
  if (!f.observer) return null;
  const t = parseGet(get), s = mission.state(f.observer, t);
  if (!s) return `No ${f.observer.toUpperCase()} state at ${get}: drawn from the Moon's centre.`;
  if (!s.anchor) return null;
  const row = (events as EventTable).events.find((e) => e.id === s.anchor);
  const dt = row ? t - parseGet(row.get) : 0;
  return `${f.observer.toUpperCase()} position: ${row ? `Mission Report Table 7-II "${row.label}" (${row.get}), propagated ${dt < 0 ? 'back ' : ''}${formatGet(Math.abs(dt))}` : s.anchor}.`;
}

export const baselineScene = (f: FigureConfig): DisplayList => buildScene(displaySpec(f), { stars });
