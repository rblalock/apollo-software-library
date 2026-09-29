import { mxv, transpose, type Mat3 } from '../math/mat';
import { toDeg, unit, type Vec3 } from '../math/vec';
import {
  axesFromBoresight, projectAzimuthalEquidistant, unprojectAzimuthalEquidistant, type PlotAxes,
} from '../projection/projection';
import { symmetricEigen } from './eigen';

export interface FitPoint { id: string; x: number; y: number; direction: Vec3 }
export interface FitResidual { id: string; dx: number; dy: number; dist: number }
export interface FitResult { axes: PlotAxes; mirror: boolean; rmsDeg: number; maxDeg: number; residuals: FitResidual[] }

function attitudeFromQuaternion([q1, q2, q3, q4]: number[]): Mat3 {
  const [a, b, c, d] = [q1!, q2!, q3!, q4!];
  const k = d * d - (a * a + b * b + c * c);
  return [
    [k + 2 * a * a, 2 * (a * b + d * c), 2 * (a * c - d * b)],
    [2 * (b * a - d * c), k + 2 * b * b, 2 * (b * c + d * a)],
    [2 * (c * a + d * b), 2 * (c * b - d * a), k + 2 * c * c],
  ];
}

/** Davenport's q-method: the rotation A minimizing Σ|bᵢ − A·rᵢ|². */
export function solveWahba(b: Vec3[], r: Vec3[]): Mat3 {
  // B = Σ bᵢ·rᵢᵀ
  const B: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  b.forEach((bi, i) => {
    const ri = r[i]!;
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) B[j]![k]! += bi[j] * ri[k];
  });
  const [b0, b1, b2] = B as [number[], number[], number[]];
  const sigma = b0[0]! + b1[1]! + b2[2]!;
  const z = [b1[2]! - b2[1]!, b2[0]! - b0[2]!, b0[1]! - b1[0]!];
  const K = [
    [2 * b0[0]! - sigma, b0[1]! + b1[0]!, b0[2]! + b2[0]!, z[0]!],
    [b1[0]! + b0[1]!, 2 * b1[1]! - sigma, b1[2]! + b2[1]!, z[1]!],
    [b2[0]! + b0[2]!, b2[1]! + b1[2]!, 2 * b2[2]! - sigma, z[2]!],
    [z[0]!, z[1]!, z[2]!, sigma],
  ];
  const { values, vectors } = symmetricEigen(K);
  return attitudeFromQuaternion(vectors[values.indexOf(Math.max(...values))]!);
}

export function residualsFor(points: FitPoint[], axes: PlotAxes): Pick<FitResult, 'rmsDeg' | 'maxDeg' | 'residuals'> {
  const residuals = points.map((p) => {
    const q = projectAzimuthalEquidistant(p.direction, axes);
    const dx = q.x - p.x, dy = q.y - p.y;
    return { id: p.id, dx, dy, dist: Math.hypot(dx, dy) };
  });
  return {
    residuals,
    rmsDeg: Math.sqrt(residuals.reduce((s, r) => s + r.dist ** 2, 0) / residuals.length),
    maxDeg: Math.max(...residuals.map((r) => r.dist)),
  };
}

function fitWithHandedness(points: FitPoint[], mirror: boolean): FitResult {
  const canon = axesFromBoresight([0, 0, 1], [0, 1, 0], mirror);
  const a = solveWahba(points.map((p) => unprojectAzimuthalEquidistant(p, canon)), points.map((p) => unit(p.direction)));
  const at = transpose(a);
  const axes = { ex: mxv(at, canon.ex), ey: mxv(at, canon.ey), ez: mxv(at, canon.ez) };
  return { axes, mirror, ...residualsFor(points, axes) };
}

/** Best plot axes (and handedness) mapping known directions onto measured plot points. */
export function fitPlotAxes(points: FitPoint[]): FitResult {
  if (points.length < 3) throw new Error('fitPlotAxes(): need at least 3 points');
  const plain = fitWithHandedness(points, false), mirrored = fitWithHandedness(points, true);
  return plain.rmsDeg <= mirrored.rmsDeg ? plain : mirrored;
}

/** Shaft and trunnion implied by SCT plot axes given in the optics frame (see sctPlotAxes). */
export function impliedSctAngles(axes: PlotAxes): { shaftDeg: number; trunnionDeg: number } {
  return {
    trunnionDeg: toDeg(Math.acos(Math.max(-1, Math.min(1, axes.ez[2])))),
    shaftDeg: toDeg(Math.atan2(axes.ey[1], axes.ey[0])),
  };
}
