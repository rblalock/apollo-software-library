import { mxv } from '../math/mat';
import { add, scale, sub, toRad, type Vec3 } from '../math/vec';
import { moonFixedToJ2000 } from '../ephemeris/moonframe';
import { getToUtc, parseGet } from '../time/time';
import { LANDING_SITE_2_RADIUS_KM } from './gravity';
import { propagate, type State } from './propagate';
import { earthEventToState, moonEventToState, moonState } from './states';

export type VehicleId = 'csm' | 'lm' | 'sivb';

/** One Mission Report Table 7-II row (see data/manual/a11-events.json). */
export interface EventRow {
  id: string;
  label: string;
  body: string;
  get: string;
  latDeg: number;
  lonDeg: number;
  altNmi: number;
  speedFps: number;
  fpaDeg: number;
  headingDeg: number;
  /** The vehicles this row describes (the whole stack while docked). */
  vehicles: string[];
  /** Present when a printed cell is unreadable or inconsistent: the row is kept but never used as an anchor. */
  unusable?: string;
}

export interface ManeuverRow {
  id: string;
  vehicles: string[];
  ignition: string;
  cutoff: string;
  /** Powered descent/ascent: the vehicle leaves or reaches the surface, so no coast state is defined inside. */
  powered?: boolean;
  /** A small burn whose own rows are unusable: it does not split coast arcs (the error is stated in its source note). */
  coastThrough?: boolean;
}

export interface EventTable {
  events: EventRow[];
  maneuvers: { list: ManeuverRow[] };
  surface: { vehicle: string; from: string; to: string; latDeg: number; lonDeg: number };
  window: { from: string; to: string; vehicleEnd: Record<string, string> };
}

export interface VehicleState extends State {
  phase: 'coast' | 'burn' | 'surface';
  /** The row propagated from (a maneuver id while burning; null on the surface). */
  anchor: string | null;
}

export interface Arc {
  kind: 'coast' | 'surface';
  from: number;
  to: number;
  /** Usable row ids inside the arc, in time order. */
  anchors: string[];
}

export interface MissionEphemeris {
  /** Geocentric J2000 state (km, km/s) of a vehicle at GET seconds, or null where none is defined. */
  state(vehicle: VehicleId, getS: number): VehicleState | null;
  stateAt(getS: number): Record<VehicleId, VehicleState | null>;
  rowState(id: string): State;
  arcs(vehicle: VehicleId): Arc[];
}

/**
 * A per-vehicle state service over the Mission Report's trajectory rows. Each vehicle's timeline is cut into
 * coast arcs by its burns (tabulated or not); a state inside an arc is propagated from the nearest usable row in
 * that arc, never across a burn. Inside a short burn the two neighbouring arcs are blended linearly; inside a
 * powered descent or ascent there is no state. The LM between landing and lift-off sits at the landing point.
 */
export function createMissionEphemeris(table: EventTable, rangeZeroUtc: string): MissionEphemeris {
  const utc = (s: number) => getToUtc(rangeZeroUtc, s);
  const rows = new Map(table.events.map((e) => [e.id, e]));
  const rowTime = (id: string) => parseGet(rows.get(id)!.get);
  const rowCache = new Map<string, State>();
  const rowState = (id: string): State => {
    const e = rows.get(id);
    if (!e) throw new Error(`Unknown event row "${id}"`);
    let s = rowCache.get(id);
    if (!s) {
      const row = { ...e, utc: utc(parseGet(e.get)) };
      s = e.body === 'moon' ? moonEventToState(row) : earthEventToState(row);
      rowCache.set(id, s);
    }
    return s;
  };

  const start = parseGet(table.window.from);
  const end = (v: VehicleId) => parseGet(table.window.vehicleEnd[v] ?? table.window.to);
  const surfaceFrom = parseGet(table.surface.from), surfaceTo = parseGet(table.surface.to);

  const burnsOf = (v: VehicleId) => table.maneuvers.list
    .filter((m) => m.vehicles.includes(v) && !m.coastThrough)
    .map((m) => ({ ...m, ign: parseGet(m.ignition), cut: parseGet(m.cutoff) }))
    .sort((a, b) => a.ign - b.ign);

  const arcCache = new Map<VehicleId, Arc[]>();
  const arcs = (v: VehicleId): Arc[] => {
    let out = arcCache.get(v);
    if (out) return out;
    const bounds: [number, number][] = [];
    let a = start;
    for (const b of burnsOf(v)) {
      if (b.ign > end(v)) break;
      bounds.push([a, b.ign]);
      a = b.cut;
    }
    bounds.push([a, end(v)]);
    const usable = table.events.filter((e) => e.vehicles.includes(v) && !e.unusable);
    out = bounds.map(([from, to]) => ({
      kind: v === table.surface.vehicle && from >= surfaceFrom && to <= surfaceTo ? 'surface' as const : 'coast' as const,
      from, to,
      anchors: usable.filter((e) => rowTime(e.id) >= from && rowTime(e.id) <= to).sort((x, y) => rowTime(x.id) - rowTime(y.id)).map((e) => e.id),
    }));
    arcCache.set(v, out);
    return out;
  };

  const fromArc = (arc: Arc, getS: number): State & { anchor: string } => {
    let best = arc.anchors[0]!;
    for (const id of arc.anchors) if (Math.abs(rowTime(id) - getS) < Math.abs(rowTime(best) - getS)) best = id;
    const t0 = rowTime(best);
    const s = t0 === getS ? rowState(best) : propagate(rowState(best), utc(t0), getS - t0);
    return { ...s, anchor: best };
  };

  const surfaceState = (getS: number): State => {
    const lat = toRad(table.surface.latDeg), lon = toRad(table.surface.lonDeg);
    const fixed: Vec3 = scale([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)], LANDING_SITE_2_RADIUS_KM);
    const at = (s: number) => mxv(moonFixedToJ2000(utc(s)), fixed);
    const moon = moonState(utc(getS));
    return { r: add(moon.r, at(getS)), v: add(moon.v, scale(sub(at(getS + 1), at(getS - 1)), 0.5)) };
  };

  const state = (v: VehicleId, getS: number): VehicleState | null => {
    if (getS < start || getS > end(v)) return null;
    const list = arcs(v);
    // Latest arc first, so an impulsive boundary belongs to the arc after it.
    for (let i = list.length - 1; i >= 0; i--) {
      const arc = list[i]!;
      if (getS < arc.from || getS > arc.to) continue;
      if (arc.kind === 'surface') return { ...surfaceState(getS), phase: 'surface', anchor: null };
      return { ...fromArc(arc, getS), phase: 'coast' };
    }
    const burn = burnsOf(v).find((b) => getS > b.ign && getS < b.cut)!;
    if (burn.powered) return null;
    const before = list.find((a) => a.to === burn.ign)!, after = list.find((a) => a.from === burn.cut)!;
    const x = fromArc(before, getS), y = fromArc(after, getS), f = (getS - burn.ign) / (burn.cut - burn.ign);
    const mix = (p: Vec3, q: Vec3) => add(scale(p, 1 - f), scale(q, f));
    return { r: mix(x.r, y.r), v: mix(x.v, y.v), phase: 'burn', anchor: burn.id };
  };

  return {
    state,
    stateAt: (getS) => ({ csm: state('csm', getS), lm: state('lm', getS), sivb: state('sivb', getS) }),
    rowState,
    arcs,
  };
}
