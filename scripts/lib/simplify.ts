type P = [number, number];

function dist(p: P, a: P, b: P): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

function dp(pts: P[], tol: number): P[] {
  if (pts.length <= 2) return pts;
  let iMax = 0, dMax = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(pts[i]!, pts[0]!, pts.at(-1)!);
    if (d > dMax) { dMax = d; iMax = i; }
  }
  if (dMax <= tol) return [pts[0]!, pts.at(-1)!];
  return [...dp(pts.slice(0, iMax + 1), tol).slice(0, -1), ...dp(pts.slice(iMax), tol)];
}

/** Douglas–Peucker simplification in the coordinates' own units; a closed ring is split at its farthest point. */
export function simplifyLine(pts: P[], tol: number): P[] {
  const closed = pts.length > 3 && pts[0]![0] === pts.at(-1)![0] && pts[0]![1] === pts.at(-1)![1];
  if (!closed) return dp(pts, tol);
  let k = 1;
  for (let i = 1; i < pts.length - 1; i++) if (Math.hypot(pts[i]![0] - pts[0]![0], pts[i]![1] - pts[0]![1]) > Math.hypot(pts[k]![0] - pts[0]![0], pts[k]![1] - pts[0]![1])) k = i;
  return [...dp(pts.slice(0, k + 1), tol).slice(0, -1), ...dp(pts.slice(k), tol)];
}
