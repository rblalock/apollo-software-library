import type { GrayImage } from './png';

export interface Frame { leftX: number; rightX: number; topY: number; bottomY: number }
export interface Blob { cx: number; cy: number; area: number; w: number; h: number }

const DARK = 128;

/** Weighted center of the strongest line in counts[from, to). */
function peak(counts: number[], from: number, to: number): number {
  let best = from;
  for (let i = from; i < to; i++) if (counts[i]! > counts[best]!) best = i;
  let sum = 0, weight = 0;
  for (let i = Math.max(from, best - 4); i <= Math.min(to - 1, best + 4); i++) {
    if (counts[i]! >= 0.5 * counts[best]!) { sum += i * counts[i]!; weight += counts[i]!; }
  }
  return sum / weight;
}

/** The plot frame: the strongest dark column/row in each outer third of the image. */
export function findFrame(img: GrayImage): Frame {
  const { width: w, height: h, data } = img;
  const cols = new Array<number>(w).fill(0), rows = new Array<number>(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x]! < DARK) { cols[x] = cols[x]! + 1; rows[y] = rows[y]! + 1; }
    }
  }
  return {
    leftX: peak(cols, 0, Math.floor(w / 3)),
    rightX: peak(cols, Math.ceil((2 * w) / 3), w),
    topY: peak(rows, 0, Math.floor(h / 3)),
    bottomY: peak(rows, Math.ceil((2 * h) / 3), h),
  };
}

/** 8-connected dark components strictly inside the frame, excluding large ones (reticle, text runs). */
export function findBlobs(img: GrayImage, frame: Frame, inset = 12, maxSizePx = 60): Blob[] {
  const { width: w, data } = img;
  const x0 = Math.ceil(frame.leftX + inset), x1 = Math.floor(frame.rightX - inset);
  const y0 = Math.ceil(frame.topY + inset), y1 = Math.floor(frame.bottomY - inset);
  const seen = new Uint8Array(data.length);
  const blobs: Blob[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const start = y * w + x;
      if (seen[start] || data[start]! >= DARK) continue;
      seen[start] = 1;
      const stack = [start];
      let sx = 0, sy = 0, n = 0, minX = x, maxX = x, minY = y, maxY = y;
      while (stack.length) {
        const j = stack.pop()!;
        const jx = j % w, jy = (j - jx) / w;
        sx += jx; sy += jy; n++;
        minX = Math.min(minX, jx); maxX = Math.max(maxX, jx); minY = Math.min(minY, jy); maxY = Math.max(maxY, jy);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = jx + dx, ny = jy + dy;
            if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
            const k = ny * w + nx;
            if (!seen[k] && data[k]! < DARK) { seen[k] = 1; stack.push(k); }
          }
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      if (bw <= maxSizePx && bh <= maxSizePx) blobs.push({ cx: sx / n, cy: sy / n, area: n, w: bw, h: bh });
    }
  }
  return blobs;
}

export function pxToDeg(frame: Frame, px: number, py: number, extentDeg = 50): { xDeg: number; yDeg: number } {
  return {
    xDeg: -extentDeg + (2 * extentDeg * (px - frame.leftX)) / (frame.rightX - frame.leftX),
    yDeg: extentDeg - (2 * extentDeg * (py - frame.topY)) / (frame.bottomY - frame.topY),
  };
}

export function snapToBlob(blobs: Blob[], approx: readonly [number, number], maxDistPx = 20, minArea = 6): Blob {
  let best: Blob | null = null, bestD = Infinity;
  for (const b of blobs) {
    if (b.area < minArea) continue;
    const d = Math.hypot(b.cx - approx[0], b.cy - approx[1]);
    if (d < bestD) { best = b; bestD = d; }
  }
  if (!best || bestD > maxDistPx) throw new Error(`no blob within ${maxDistPx}px of (${approx.join(', ')})`);
  return best;
}
