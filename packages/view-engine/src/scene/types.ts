import type { Mat3 } from '../math/mat';
import type { Vec3 } from '../math/vec';
import type { GimbalAngles } from '../frames/frames';
import type { BodyName, Observer } from '../ephemeris/ephemeris';
import type { PlotAxes } from '../projection/projection';

export interface ViewSpec {
  rangeZeroUtc: string;
  /** Ground elapsed time, "hhh:mm:ss". */
  get: string;
  /** 'moon' = the Moon's center (lunar orbit); the spacecraft's offset is not modeled unless `observerPositionKm` is set. */
  observer: Observer;
  /**
   * The spacecraft's geocentric J2000 position (km). When set, bodies are seen from it: parallax, the Earth and
   * Moon drawn at their true angular size (as a limb when large), and stars and planets behind them hidden.
   */
  observerPositionKm?: Vec3;
  /** Body radii overriding the defaults (e.g. the Moon at a landing-site datum when altitudes are measured from it). */
  bodyRadiusKm?: Partial<Record<BodyName, number>>;
  referenceEpochJd: number;
  refsmmat: Mat3;
  gimbals: GimbalAngles;
  /**
   * 'sct': CSM scanning telescope, attitude from `refsmmat` + `gimbals`.
   * 'aot': LM alignment optical telescope at a detent azimuth, attitude given directly as reference → LM body.
   * 'fixed': plot axes given directly in the reference frame (a window view whose attitude was fitted).
   */
  instrument:
    | { kind: 'sct'; shaftDeg: number; trunnionDeg: number }
    | { kind: 'aot'; detentDeg: number; lmBodyFromRef: Mat3 }
    | { kind: 'fixed'; axes: PlotAxes };
  /** Outlines fixed in the plot (window frames), in plot degrees, drawn closed. */
  outlines?: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  /** Half-width of the square plot in degrees (the 1969 figures use ±50°). */
  extentDeg: number;
  bodies: BodyName[];
  /** Annotation lines printed above the frame's left edge (e.g. the REFSMMAT name). */
  headerLeft: string[];
}

/**
 * 'machine' = drawn by the program on the microfilm (tick labels, reticle scale, nav-star names);
 * 'annotation' = typed or lettered onto the published figure (planet and Earth names, headers, axis titles).
 */
export type Layer = 'machine' | 'annotation';

export type Primitive =
  | { kind: 'dot'; x: number; y: number }
  | { kind: 'navMark'; x: number; y: number }
  | { kind: 'disc'; x: number; y: number; r: number; filled: boolean }
  | { kind: 'polyline'; points: ReadonlyArray<readonly [number, number]>; closed: boolean; tone?: 'ink' | 'accent' }
  | { kind: 'text'; x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end'; sizeDeg: number; boxed: boolean; layer: Layer; rotate?: number };

export interface PlacedBody {
  id: string;
  label: string | null;
  kind: 'navStar' | 'star' | 'planet' | 'earth' | 'sun' | 'moon';
  x: number;
  y: number;
  /** Direction in the instrument (optics) frame. */
  direction: Vec3;
}

export interface DisplayList {
  extentDeg: number;
  utc: Date;
  primitives: Primitive[];
  placed: PlacedBody[];
  notes: string[];
}
