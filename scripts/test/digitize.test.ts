import { describe, expect, it } from 'vitest';
import { findBlobs, findFrame, pxToDeg, snapToBlob } from '../lib/digitize';
import type { GrayImage } from '../lib/png';

function synthetic(): GrayImage {
  const w = 400, h = 400, data = new Uint8Array(w * h).fill(255);
  const dark = (x: number, y: number) => { data[y * w + x] = 0; };
  for (let y = 40; y <= 340; y++) for (const x of [50, 51, 350, 351]) dark(x, y);
  for (let x = 50; x <= 351; x++) for (const y of [40, 41, 340, 341]) dark(x, y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { dark(200 + dx, 190 + dy); dark(100 + dx, 300 + dy); }
  return { width: w, height: h, data };
}

describe('digitize', () => {
  const img = synthetic();
  const frame = findFrame(img);
  it('finds the frame lines to sub-pixel precision', () => {
    expect(frame.leftX).toBeCloseTo(50.5, 0);
    expect(frame.rightX).toBeCloseTo(350.5, 0);
    expect(frame.topY).toBeCloseTo(40.5, 0);
    expect(frame.bottomY).toBeCloseTo(340.5, 0);
  });
  it('finds dot blobs inside the frame and snaps to them', () => {
    const blobs = findBlobs(img, frame);
    expect(blobs).toHaveLength(2);
    const b = snapToBlob(blobs, [198, 193]);
    expect(b.cx).toBe(200);
    expect(b.cy).toBe(190);
    expect(() => snapToBlob(blobs, [20, 20])).toThrow(/no blob/);
  });
  it('maps pixels to plot degrees (frame center = origin)', () => {
    const p = pxToDeg(frame, (frame.leftX + frame.rightX) / 2, (frame.topY + frame.bottomY) / 2);
    expect(p.xDeg).toBeCloseTo(0, 9);
    expect(p.yDeg).toBeCloseTo(0, 9);
  });
});
