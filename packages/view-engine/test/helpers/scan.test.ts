import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { loadInk, matchTranslation } from './scan';

function image(w: number, h: number, inkAt: (x: number, y: number) => boolean): Buffer {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, v = inkAt(x, y) ? 0 : 255;
    png.data[i] = png.data[i + 1] = png.data[i + 2] = v; png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

describe('scan helpers', () => {
  const pts: [number, number][] = [[10, 12], [30, 40], [55, 20]];
  const ink = loadInk(image(64, 48, (x, y) => pts.some(([px, py]) => px === x && py === y)));
  it('distance transform equals the brute-force Euclidean distance to the nearest ink pixel', () => {
    for (const [x, y] of [[0, 0], [20, 20], [63, 47], [30, 41], [45, 30]] as const) {
      const brute = Math.min(...pts.map(([px, py]) => Math.hypot(px - x, py - y)));
      expect(ink.dist(x, y)).toBeCloseTo(brute, 9);
    }
  });
  it('matchTranslation recovers a known shift', () => {
    const shifted = pts.map(([x, y]) => [x - 7, y + 4] as [number, number]);
    const m = matchTranslation(ink, shifted, 12, 6);
    expect(m.dx).toBeCloseTo(7, 6);
    expect(m.dy).toBeCloseTo(-4, 6);
    expect(m.score).toBeCloseTo(0, 6);
  });
});
