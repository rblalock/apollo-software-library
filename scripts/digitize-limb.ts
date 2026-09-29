/**
 * Digitize the Moon's limb on TN D-6853 Fig 3b: for each scan column, the centre of the lowest dark run between
 * the frame's tick band and y = +32.5° (below that sits Menkar's glyph). Writes data/derived/fig3b-limb.json.
 */
import { readFileSync } from 'node:fs';
import { readGray } from './lib/png';
import { writeJson } from './lib/provenance';

const points = JSON.parse(readFileSync('data/derived/fig3b-points.json', 'utf8'));
const { leftX, rightX, topY, bottomY } = points.frame;
const img = readGray(points.image.path);
const dark = (x: number, y: number) => img.data[y * img.width + x]! < 128;
const toDeg = (px: number, py: number) => ({ xDeg: -50 + ((px - leftX) / (rightX - leftX)) * 100, yDeg: 50 - ((py - topY) / (bottomY - topY)) * 100 });
const rowOf = (yDeg: number) => Math.round(topY + ((50 - yDeg) / 100) * (bottomY - topY));

const TICK_BAND_PX = 14, SIDE_MARGIN_DEG = 5; // the side frames carry 1.6° ticks
const colOf = (xDeg: number) => leftX + ((xDeg + 50) / 100) * (rightX - leftX);
// Columns next to a labelled glyph whose top reaches the search band (Menkar at y ≈ 31°) are skipped.
const glyphs = (points.points as { id: string; xDeg: number; yDeg: number }[]).filter((g) => g.yDeg > 28);
const nearGlyph = (xDeg: number) => glyphs.some((g) => Math.abs(g.xDeg - xDeg) < 2.5);
const raw: { px: number; py: number; xDeg: number; yDeg: number }[] = [];
for (let px = Math.ceil(colOf(-50 + SIDE_MARGIN_DEG)); px <= Math.floor(colOf(50 - SIDE_MARGIN_DEG)); px += 8) {
  let low = -1;
  for (let py = rowOf(32.5); py >= Math.ceil(topY) + TICK_BAND_PX; py--) if (dark(px, py)) { low = py; break; }
  if (low < 0 || nearGlyph(toDeg(px, 0).xDeg)) continue;
  let high = low;
  while (high > topY && dark(px, high - 1)) high--;
  const py = (low + high) / 2;
  raw.push({ px, py, ...toDeg(px, py) });
}
// The limb is smooth: drop a point that jumps more than 1.5° from both neighbours (a stray glyph or dot).
const out = raw.filter((p, i) => [raw[i - 1], raw[i + 1]].some((q) => q && Math.abs(q.yDeg - p.yDeg) <= 1.5));

writeJson('data/derived/fig3b-limb.json', {
  source: 'TN D-6853 Fig 3b scan (data/derived/scans/tnd6853-fig3b.png), frame from data/derived/fig3b-points.json',
  method: `Every 8th column with |x| ≤ ${50 - SIDE_MARGIN_DEG}°: centre of the lowest dark run (gray < 128) between ${TICK_BAND_PX} px below the frame top and y = +32.5°; columns within 2.5° of ${glyphs.map((g) => g.id).join(', ')} skipped; points jumping > 1.5° from both neighbours dropped (${raw.length} → kept below).`,
  points: out,
});
console.log(`${out.length} limb points, x ${out[0]?.xDeg.toFixed(1)}…${out.at(-1)?.xDeg.toFixed(1)}°, lowest y ${Math.min(...out.map((p) => p.yDeg)).toFixed(2)}°`);
