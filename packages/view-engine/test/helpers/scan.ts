/** Test-only helpers for comparing line drawings with a scanned figure's ink. */
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export interface Frame { leftX: number; rightX: number; topY: number; bottomY: number }
export interface Ink { w: number; h: number; ink(x: number, y: number): boolean; dist(x: number, y: number): number }

/** Ink mask (gray < 128) and its exact Euclidean distance transform (Felzenszwalb–Huttenlocher). */
export function loadInk(path: string | Buffer): Ink {
  const png = PNG.sync.read(typeof path === 'string' ? readFileSync(path) : path);
  const w = png.width, h = png.height, INF = 1e12;
  const mask = new Uint8Array(w * h), f = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) { mask[i] = png.data[i * 4]! < 128 ? 1 : 0; f[i] = mask[i] ? 0 : INF; }
  const pass = (off: number, stride: number, n: number) => {
    const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    const F = (q: number) => f[off + q * stride]!;
    const cut = (q: number, p: number) => (F(q) + q * q - (F(p) + p * p)) / (2 * q - 2 * p);
    let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = cut(q, v[k]!);
      while (s <= z[k]!) { k--; s = cut(q, v[k]!); }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1]! < q) k++; const p = v[k]!; d[q] = (q - p) * (q - p) + F(p); }
    for (let q = 0; q < n; q++) f[off + q * stride] = d[q]!;
  };
  for (let x = 0; x < w; x++) pass(x, w, h);
  for (let y = 0; y < h; y++) pass(y * w, 1, w);
  const idx = (x: number, y: number) => { const xi = Math.round(x), yi = Math.round(y); return xi < 0 || yi < 0 || xi >= w || yi >= h ? -1 : yi * w + xi; };
  return { w, h, ink: (x, y) => { const i = idx(x, y); return i >= 0 && mask[i] === 1; }, dist: (x, y) => { const i = idx(x, y); return i < 0 ? 99 : Math.sqrt(f[i]!); } };
}

export const degToPx = (fr: Frame, e: number) => (x: number, y: number): [number, number] =>
  [fr.leftX + ((x + e) / (2 * e)) * (fr.rightX - fr.leftX), fr.topY + ((e - y) / (2 * e)) * (fr.bottomY - fr.topY)];

/** Points every ~`step` px along plot-degree polylines, in scan pixels. */
export function samplePx(lines: ReadonlyArray<ReadonlyArray<readonly [number, number]>>, toPx: (x: number, y: number) => [number, number], step = 3): [number, number][] {
  const out: [number, number][] = [];
  for (const l of lines) for (let i = 1; i < l.length; i++) {
    const a = toPx(l[i - 1]![0], l[i - 1]![1]), b = toPx(l[i]![0], l[i]![1]);
    const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < m; k++) out.push([a[0] + ((b[0] - a[0]) * k) / m, a[1] + ((b[1] - a[1]) * k) / m]);
  }
  return out;
}

/** The translation (px) that best lays `pts` on the ink: mean distance truncated at `trunc`, searched ±`win` px. */
export function matchTranslation(ink: Ink, pts: [number, number][], win = 40, trunc = 12): { dx: number; dy: number; score: number } {
  const score = (dx: number, dy: number) => pts.reduce((s, [x, y]) => s + Math.min(ink.dist(x + dx, y + dy), trunc), 0) / pts.length;
  let best = { dx: 0, dy: 0, score: score(0, 0) };
  for (let dy = -win; dy <= win; dy += 2) for (let dx = -win; dx <= win; dx += 2) { const s = score(dx, dy); if (s < best.score) best = { dx, dy, score: s }; }
  for (let step of [1, 0.5, 0.25]) {
    const c = best;
    for (let dy = -2 * step; dy <= 2 * step; dy += step) for (let dx = -2 * step; dx <= 2 * step; dx += step) { const s = score(c.dx + dx, c.dy + dy); if (s < best.score) best = { dx: c.dx + dx, dy: c.dy + dy, score: s }; }
  }
  return best;
}

/** Signed distance (px) from each point to the nearest ink along its normal, within ±`win`; null when none. */
export function normalOffsets(ink: Ink, pts: [number, number][], win = 40): (number | null)[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 2)]!, b = pts[Math.min(pts.length - 1, i + 2)]!;
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
    for (let s = 0; s <= win; s += 0.5) for (const sg of [1, -1]) if (ink.ink(p[0] + sg * s * nx, p[1] + sg * s * ny)) return sg * s;
    return null;
  });
}

/**
 * Like normalOffsets, but a hit counts only where the ink runs parallel to the curve: at the same offset, at 5, 10
 * and 15 px along the tangent on both sides (`supportPx` = the outermost), ink must lie within 1.5 px. Strokes
 * crossing the curve (hatching) or wandering (coastlines) do not qualify, so a misplaced curve finds little or nothing
 * instead of the nearest crossing stroke.
 */
export function parallelOffsets(ink: Ink, pts: [number, number][], win = 40, supportPx = 15): (number | null)[] {
  const near = (x: number, y: number, nx: number, ny: number) => [-1.5, -0.75, 0, 0.75, 1.5].some((k) => ink.ink(x + k * nx, y + k * ny));
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 2)]!, b = pts[Math.min(pts.length - 1, i + 2)]!;
    const tx0 = b[0] - a[0], ty0 = b[1] - a[1], tl = Math.hypot(tx0, ty0) || 1, tx = tx0 / tl, ty = ty0 / tl, nx = -ty, ny = tx;
    for (let s = 0; s <= win; s += 0.5) for (const sg of [1, -1]) {
      const x = p[0] + sg * s * nx, y = p[1] + sg * s * ny;
      const steps = [supportPx / 3, (2 * supportPx) / 3, supportPx];
      if (ink.ink(x, y) && steps.every((d) => near(x + d * tx, y + d * ty, nx, ny) && near(x - d * tx, y - d * ty, nx, ny))) return sg * s;
    }
    return null;
  });
}
