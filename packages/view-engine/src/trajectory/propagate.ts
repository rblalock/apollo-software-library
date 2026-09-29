import type { Vec3 } from '../math/vec';
import { acceleration, perturberPositions } from './gravity';

/** Geocentric J2000 (EQJ) state: position km, velocity km/s. */
export interface State { r: Vec3; v: Vec3 }
/** 'twoBody': Earth point mass only. 'full': plus Earth J2 (within 50,000 km), the Moon and the Sun. */
export interface PropagateOptions { bodies?: 'twoBody' | 'full'; rtol?: number; atol?: number }

// Dormand–Prince 5(4) tableau.
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const B = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const BSTAR = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

/** Cowell propagation of `s0` (at `utc0`) by `dtSeconds` (either sign) with adaptive Dormand–Prince 5(4). */
export function propagate(s0: State, utc0: Date, dtSeconds: number, opts: PropagateOptions = {}): State {
  const full = (opts.bodies ?? 'full') === 'full';
  const rtol = opts.rtol ?? 1e-11, atol = opts.atol ?? 1e-8;
  const t0 = utc0.getTime() / 1000;
  const f = (t: number, y: number[]): number[] => {
    const r: Vec3 = [y[0]!, y[1]!, y[2]!];
    const a = acceleration(r, full ? perturberPositions(new Date(t * 1000)) : null);
    return [y[3]!, y[4]!, y[5]!, a[0], a[1], a[2]];
  };
  let y = [...s0.r, ...s0.v];
  let t = 0;
  const dir = Math.sign(dtSeconds) || 1;
  let h = dir * Math.min(60, Math.abs(dtSeconds) || 60);
  while (dir * (dtSeconds - t) > 1e-9) {
    if (dir * (t + h - dtSeconds) > 0) h = dtSeconds - t;
    const k: number[][] = [];
    for (let s = 0; s < 7; s++) {
      const ys = y.map((yi, i) => yi + h * A[s]!.reduce((acc, aij, j) => acc + aij * k[j]![i]!, 0));
      k.push(f(t0 + t + C[s]! * h, ys));
    }
    const yNew = y.map((yi, i) => yi + h * B.reduce((acc, bj, j) => acc + bj * k[j]![i]!, 0));
    const err = Math.max(...y.map((yi, i) => {
      const e = h * B.reduce((acc, bj, j) => acc + (bj - BSTAR[j]!) * k[j]![i]!, 0);
      return Math.abs(e) / (atol + rtol * Math.max(Math.abs(yi), Math.abs(yNew[i]!)));
    }));
    if (err <= 1) { t += h; y = yNew; }
    h *= Math.min(5, Math.max(0.2, 0.9 * Math.pow(Math.max(err, 1e-12), -0.2)));
  }
  return { r: [y[0]!, y[1]!, y[2]!], v: [y[3]!, y[4]!, y[5]!] };
}
