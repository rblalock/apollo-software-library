import { describe, expect, it } from 'vitest';
import { labelBox, placeLabels, type LabelRequest } from '../src/index';

const req = (text: string, x: number, y: number, r = 0.8): LabelRequest => ({ text, x, y, r, sizeDeg: 2.4 });
const overlap = (a: ReturnType<typeof labelBox>, b: ReturnType<typeof labelBox>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('placeLabels', () => {
  it('keeps the default place (right of and below the glyph) when it is free', () => {
    const [p] = placeLabels([req('Vega', 0, 0)], [], 50);
    expect(p!.anchor).toBe('start');
    expect(p!.x).toBeGreaterThan(0);
    expect(p!.y).toBeLessThan(0);
  });
  it('moves a label that would overlap another', () => {
    const placed = placeLabels([req('Capella', 0, 0), req('Menkalinan', 0.5, -0.6)], [], 50);
    expect(overlap(labelBox(placed[0]!), labelBox(placed[1]!))).toBe(false);
  });
  it('keeps labels off other glyphs', () => {
    const [p] = placeLabels([req('Rigel', 0, 0)], [{ x: 4, y: -2.2, r: 0.8 }], 50);
    const b = labelBox(p!);
    expect(4 > b.x0 - 0.8 && 4 < b.x1 + 0.8 && -2.2 > b.y0 - 0.8 && -2.2 < b.y1 + 0.8).toBe(false);
  });
  it('flips a label that would run off the frame', () => {
    const [p] = placeLabels([req('Fomalhaut', 47, 0)], [], 50);
    expect(labelBox(p!).x1).toBeLessThanOrEqual(50);
  });
});
