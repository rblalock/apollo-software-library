/** A label wanted beside a glyph of radius `r` at (x, y), in plot degrees. */
export interface LabelRequest { text: string; x: number; y: number; r: number; sizeDeg: number }
export interface PlacedLabel { text: string; x: number; y: number; anchor: 'start' | 'end' | 'middle'; sizeDeg: number }
export interface Obstacle { x: number; y: number; r: number }
export interface Box { x0: number; x1: number; y0: number; y1: number }

/** The box a label occupies (monospace width estimate, text vertically centred on y). */
export function labelBox(p: PlacedLabel): Box {
  const w = 0.62 * p.sizeDeg * p.text.length, h = 0.6 * p.sizeDeg;
  const x0 = p.anchor === 'start' ? p.x : p.anchor === 'end' ? p.x - w : p.x - w / 2;
  return { x0, x1: x0 + w, y0: p.y - h, y1: p.y + h };
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const hitsCircle = (b: Box, o: Obstacle) => {
  const cx = Math.max(b.x0, Math.min(o.x, b.x1)), cy = Math.max(b.y0, Math.min(o.y, b.y1));
  return Math.hypot(cx - o.x, cy - o.y) < o.r;
};

/**
 * Greedy label placement: each label, in order, takes the first of eight positions around its glyph (right-below
 * first, as the 1969 plots did) that stays inside the ±`extentDeg` frame and clears the labels already placed and
 * the other glyphs. With no clear position it keeps the first one inside the frame.
 */
export function placeLabels(requests: LabelRequest[], glyphs: Obstacle[], extentDeg: number): PlacedLabel[] {
  const taken: Box[] = [];
  const inside = (b: Box) => b.x0 >= -extentDeg && b.x1 <= extentDeg && b.y0 >= -extentDeg && b.y1 <= extentDeg;
  return requests.map((q) => {
    const g = q.r + 0.4, v = q.r + 1.4;
    const candidates: PlacedLabel[] = ([
      [q.x + g, q.y - v, 'start'], [q.x + g, q.y + v, 'start'], [q.x - g, q.y - v, 'end'], [q.x - g, q.y + v, 'end'],
      [q.x + g + 0.2, q.y, 'start'], [q.x - g - 0.2, q.y, 'end'], [q.x, q.y - v - 0.2, 'middle'], [q.x, q.y + v + 0.2, 'middle'],
    ] as const).map(([x, y, anchor]) => ({ text: q.text, x, y, anchor, sizeDeg: q.sizeDeg }));
    const others = glyphs.filter((o) => Math.hypot(o.x - q.x, o.y - q.y) > 1e-9).map((o) => ({ ...o, r: o.r + 0.3 }));
    const pick = candidates.find((c) => { const b = labelBox(c); return inside(b) && !taken.some((t) => overlaps(t, b)) && !others.some((o) => hitsCircle(b, o)); })
      ?? candidates.find((c) => inside(labelBox(c))) ?? candidates[0]!;
    taken.push(labelBox(pick));
    return pick;
  });
}
