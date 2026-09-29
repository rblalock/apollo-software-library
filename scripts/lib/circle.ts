/** Algebraic (Kåsa) circle fit, repeated with points more than 3 robust sigmas off the circle dropped. */
export function fitCircle(pts: [number, number][]): { cx: number; cy: number; r: number; rms: number; used: number } {
  let use = pts;
  let fit = kasa(use);
  for (let it = 0; it < 10; it++) {
    const res = pts.map(([x, y]) => Math.hypot(x - fit.cx, y - fit.cy) - fit.r);
    const mad = median(res.map(Math.abs)) * 1.4826;
    const keep = pts.filter((_, i) => Math.abs(res[i]!) <= Math.max(3 * mad, 1e-9 + fit.r * 1e-4));
    if (keep.length === use.length) break;
    use = keep;
    fit = kasa(use);
  }
  const rms = Math.sqrt(use.reduce((s, [x, y]) => s + (Math.hypot(x - fit.cx, y - fit.cy) - fit.r) ** 2, 0) / use.length);
  return { ...fit, rms, used: use.length };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
}

function kasa(pts: [number, number][]): { cx: number; cy: number; r: number } {
  // Solve [Σx² Σxy Σx; Σxy Σy² Σy; Σx Σy n]·[D E F] = −[Σx z; Σy z; Σz], z = x² + y².
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  const n = pts.length;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sxz += x * z; syz += y * z; sz += z;
  }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], b = [-sxz, -syz, -sz];
  const det3 = (m: number[][]) => m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) - m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) + m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const d = det3(A);
  const col = (k: number) => A.map((row, i) => row.map((v, j) => (j === k ? b[i]! : v)));
  const D = det3(col(0)) / d, E = det3(col(1)) / d, F = det3(col(2)) / d;
  const cx = -D / 2, cy = -E / 2;
  return { cx, cy, r: Math.sqrt(cx * cx + cy * cy - F) };
}
