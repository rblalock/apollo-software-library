import {
  APOLLO_11, bodyGlobeScene, dot, FT_KM, getToUtc, globePrimitives, InvalidGetError, NMI_KM, norm, parseGet, projectGnomonic, relativeToMoon, scale,
  sub, unit, type DisplayList, type GlobeScene, type Primitive, type Underlay,
} from '@asl/view-engine';
import coast from '../../../data/derived/earth-coastline.json';
import moonFeatures from '../../../data/derived/moon-features.json';
import maria from '../../../data/derived/moon-maria.json';
import g6a from '../../../data/derived/fig6a-globe.json';
import g6b from '../../../data/derived/fig6b-globe.json';
import g6c from '../../../data/derived/fig6c-globe.json';
import g6d from '../../../data/derived/fig6d-globe.json';
import g7a from '../../../data/derived/fig7a-globe.json';
import g7b from '../../../data/derived/fig7b-globe.json';
import { mission } from './figures';

interface GlobeFile {
  image: { widthPx: number; heightPx: number };
  frame: { leftX: number; rightX: number; topY: number; bottomY: number };
  extentDeg: number;
  body: string;
  get: string;
}

export interface GlobePanel {
  id: string;
  label: string;
  body: 'earth' | 'moon';
  get: string;
  extentDeg: number;
  scanHref: string;
  file: GlobeFile;
}

const panel = (id: string, label: string, file: GlobeFile): GlobePanel =>
  ({ id, label, body: file.body as 'earth' | 'moon', get: file.get, extentDeg: file.extentDeg, scanHref: `/scans/tnd6853-${id}.png`, file });

export const GLOBES: Record<string, GlobePanel> = {
  fig6a: panel('fig6a', '(a) 23 h', g6a), fig6b: panel('fig6b', '(b) 24 h', g6b), fig6c: panel('fig6c', '(c) 25 h', g6c), fig6d: panel('fig6d', '(d) 26 h', g6d),
  fig7a: panel('fig7a', '(a) 70 h', g7a), fig7b: panel('fig7b', '(b) 72 h', g7b),
};

const earth = coast as unknown as { lines: [number, number][][]; lakes: [number, number][][] };
const moon = moonFeatures as unknown as { craters: { name: string; lat: number; lon: number; diamKm: number }[]; areas: { name: string; lat: number; lon: number }[] };
const MIN_CRATER_KM = 40;
const craters = moon.craters.filter((c) => c.diamKm >= MIN_CRATER_KM);
const mareRings = (maria as unknown as { outlines: { ring: [number, number][] }[] }).outlines.map((o) => o.ring);
const EARTH_LABELS = [{ text: 'Africa', lat: 5, lon: 20 }, { text: 'South America', lat: -10, lon: -55 }];
const MOON_LABELS = [
  { text: 'Copernicus', lat: 9.62, lon: -20.08 }, { text: 'Archimedes', lat: 29.72, lon: -3.99 },
  { text: 'Sea of Serenity', lat: 27.3, lon: 18.4 },
];

const group = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const text = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end', sizeDeg: number, layer: 'machine' | 'annotation' = 'annotation', rotate?: number): Primitive =>
  ({ kind: 'text', x, y, text: t, anchor, sizeDeg, boxed: false, layer, rotate });

/** The square frame with the 1969 plots' fine ticks (every 0.1° of the field) on all four sides. */
function frame(e: number): Primitive[] {
  const out: Primitive[] = [{ kind: 'polyline', points: [[-e, -e], [e, -e], [e, e], [-e, e]], closed: true }];
  const len = e * 0.02;
  for (let v = -e + 0.1; v < e - 1e-9; v += 0.1) {
    out.push({ kind: 'polyline', points: [[v, e], [v, e - len]], closed: false }, { kind: 'polyline', points: [[v, -e], [v, -e + len]], closed: false });
    out.push({ kind: 'polyline', points: [[-e, v], [-e + len, v]], closed: false }, { kind: 'polyline', points: [[e, v], [e - len, v]], closed: false });
  }
  return out;
}

/** The terminator point nearest the observer, labelled as on Fig 6. */
function terminatorLabel(s: GlobeScene): Primitive[] {
  const o = sub(s.observerKm, s.centreKm), oh = unit(o);
  const inPlane = sub(oh, scale(s.sunDir, dot(oh, s.sunDir)));
  if (norm(inPlane) < 1e-6) return [];
  const p = projectGnomonic(sub(scale(unit(inPlane), s.radiusKm), o), s.axes);
  return p ? [text(p.x, p.y + s.extentDeg * 0.035, 'Terminator', 'middle', s.extentDeg * 0.045)] : [];
}

export interface GlobeDisplay { dl: DisplayList; scene: GlobeScene }

/** A Fig 6/7 panel recomputed at `get` (default: the printed GET); null outside the reconstructed trajectory. */
export function globeDisplay(p: GlobePanel, get = p.get): GlobeDisplay | null {
  let t: number;
  try { t = parseGet(get); } catch (e) { if (e instanceof InvalidGetError) return null; throw e; }
  const state = mission.state('csm', t);
  if (!state) return null;
  const utc = getToUtc(APOLLO_11.rangeZeroUtc, t);
  const e = p.extentDeg, s = bodyGlobeScene(p.body, utc, state, e);
  const features = p.body === 'earth'
    ? { lines: [...earth.lines, ...earth.lakes], labels: EARTH_LABELS }
    : { lines: mareRings, circles: craters, labels: MOON_LABELS };
  const size = e * 0.045, top = e + e * 0.06;
  let header: Primitive[];
  if (p.body === 'earth') {
    const r = norm(state.r), v = norm(state.v);
    header = [
      text(-e, top + size * 1.6, `R_E = ${group(r / NMI_KM)} n. mi.`, 'start', size), text(-e, top, `V_i = ${group(v / FT_KM)} fps`, 'start', size),
      text(e, top + size * 1.6, `h_E = ${group((r - 6378.137) / 1.609344)} stat. mi.`, 'end', size), text(e, top, `V_i = ${group((v / FT_KM) * 0.681818)} mph`, 'end', size),
    ];
  } else {
    const rel = relativeToMoon(state, utc), v = norm(rel.v) / FT_KM;
    header = [
      text(-e, top + size * 3.2, 'Spacecraft relative to Moon', 'start', size),
      text(-e, top + size * 1.6, `h_M = ${group((norm(rel.r) - 1737.4) / 1.609344)} stat. mi.`, 'start', size),
      text(-e, top, `V_i = ${group(v)} fps = ${group(v * 0.681818)} mph`, 'start', size),
    ];
  }
  const primitives: Primitive[] = [
    ...frame(e),
    ...globePrimitives(s, features),
    ...(p.body === 'earth' ? terminatorLabel(s) : []),
    ...header,
    text(p.body === 'earth' ? 0 : e, e + e * 0.015, `Field of view = ${2 * e}°`, p.body === 'earth' ? 'middle' : 'end', size),
    text(0, -e - e * 0.06, 'X, nondimensional', 'middle', size),
    text(-e - e * 0.06, 0, 'Y, nondimensional', 'middle', size, 'annotation', 90),
  ];
  return { dl: { extentDeg: e, utc, primitives, placed: [], notes: [] }, scene: s };
}

export const globeUnderlay = (p: GlobePanel, opacity: number, invert: boolean): Underlay => ({
  href: p.scanHref, widthPx: p.file.image.widthPx, heightPx: p.file.image.heightPx, frame: p.file.frame, opacity, invert,
});

