import type { Mat3 } from '../math/mat';
import type { Vec3 } from '../math/vec';
import type { GimbalAngles } from '../frames/frames';
import type { BodyName, Observer } from '../ephemeris/ephemeris';

export interface ViewSpec {
  rangeZeroUtc: string;
  /** Ground elapsed time, "hhh:mm:ss". */
  get: string;
  /** 'moon' = the Moon's center (lunar orbit); the spacecraft's offset is not modeled. */
  observer: Observer;
  referenceEpochJd: number;
  refsmmat: Mat3;
  gimbals: GimbalAngles;
  instrument: { kind: 'sct'; shaftDeg: number; trunnionDeg: number };
  /** Half-width of the square plot in degrees (the 1969 figures use ±50°). */
  extentDeg: number;
  bodies: BodyName[];
  /** Annotation lines printed above the frame's left edge (e.g. the REFSMMAT name). */
  headerLeft: string[];
}

/** 'machine' = drawn by the 1969 program; 'annotation' = typed or lettered onto the published figure. */
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
