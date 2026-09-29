import { mkdirSync, readFileSync } from 'node:fs';
import { findBlobs, findFrame, pxToDeg, snapToBlob } from './lib/digitize';
import { readGray, writeGray } from './lib/png';
import { today, writeJson } from './lib/provenance';

const IMAGE = 'data/derived/scans/tnd6853-fig3a.png';
const img = readGray(IMAGE);
const frame = findFrame(img);
const blobs = findBlobs(img, frame);

// Debug overlay for reading approximate positions: blob boxes drawn in mid-gray.
mkdirSync('tmp', { recursive: true });
const dbg = { ...img, data: img.data.slice() };
for (const b of blobs) {
  const x0 = Math.round(b.cx - b.w / 2 - 3), x1 = Math.round(b.cx + b.w / 2 + 3);
  const y0 = Math.round(b.cy - b.h / 2 - 3), y1 = Math.round(b.cy + b.h / 2 + 3);
  for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) dbg.data[y * img.width + x] = 150;
  for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) dbg.data[y * img.width + x] = 150;
}
writeGray('tmp/fig3a-blobs.png', dbg);

// approxPx: snapped to the nearest detected blob. manualPx: used as-is, for glyphs that touch the
// frame line and so cannot be separated from it as a blob (measured by eye on a 4× zoom).
type NameEntry = { kind: string; approxPx: [number, number] } | { kind: string; manualPx: [number, number] };
const names = JSON.parse(readFileSync('data/manual/fig3a-names.json', 'utf8')) as Record<string, NameEntry | string>;
const points = Object.entries(names)
  .filter((e): e is [string, NameEntry] => typeof e[1] !== 'string')
  .map(([id, v]) => {
    if ('manualPx' in v) {
      const [x, y] = v.manualPx;
      return { id, kind: v.kind, px: [x, y], ...pxToDeg(frame, x, y), method: 'manual' };
    }
    const b = snapToBlob(blobs, v.approxPx);
    return { id, kind: v.kind, px: [+b.cx.toFixed(2), +b.cy.toFixed(2)], ...pxToDeg(frame, b.cx, b.cy), method: 'blob', area: b.area };
  });

const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === 'tn-d-6853.pdf');
writeJson('data/derived/fig3a-points.json', {
  provenance: {
    sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
    method: 'TN D-6853 PDF p. 10 rendered at 300 dpi (pdftoppm) and cropped (scripts/extract-figures.ts). The frame is registered from its ±50° border lines; each labeled glyph is snapped to the nearest detected dark blob from a hand-read approximate position (data/manual/fig3a-names.json); glyphs touching the frame line or the reticle (Sirius, Navi, Venus, Saturn) are measured by eye on a 4× zoom (method: manual).',
    script: 'scripts/digitize-fig3a.ts',
    generated: today(),
  },
  image: { path: IMAGE, widthPx: img.width, heightPx: img.height },
  frame,
  extentDeg: 50,
  points,
});
console.log(`frame ${JSON.stringify(frame)}; ${blobs.length} blobs; ${points.length} points`);
