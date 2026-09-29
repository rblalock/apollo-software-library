import { mkdirSync, readFileSync } from 'node:fs';
import { findBlobs, findFrame, isRoundDot, pxToDeg, snapToBlob } from './lib/digitize';
import { loadFigureConfigs } from './lib/figures';
import { readGray, writeGray } from './lib/png';
import { today, writeJson } from './lib/provenance';

const sources = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')) as Array<{ file: string; url: string; retrieved: string; sha256: string }>;
mkdirSync('tmp', { recursive: true });

for (const cfg of loadFigureConfigs(process.argv.slice(2))) {
  const image = `data/derived/scans/${cfg.scan}`;
  const img = readGray(image);
  const frame = findFrame(img);
  const blobs = findBlobs(img, frame);

  // Debug overlay for reading approximate positions: blob boxes drawn in mid-gray.
  const dbg = { ...img, data: img.data.slice() };
  for (const b of blobs) {
    const x0 = Math.round(b.cx - b.w / 2 - 3), x1 = Math.round(b.cx + b.w / 2 + 3);
    const y0 = Math.round(b.cy - b.h / 2 - 3), y1 = Math.round(b.cy + b.h / 2 + 3);
    for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) dbg.data[y * img.width + x] = 150;
    for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) dbg.data[y * img.width + x] = 150;
  }
  writeGray(`tmp/${cfg.id}-blobs.png`, dbg);

  const points = Object.entries(cfg.bodies).map(([id, v]) => {
    const label = v.actually ? { actually: v.actually, note: v.note } : {};
    if ('manualPx' in v) {
      const [x, y] = v.manualPx;
      return { id, kind: v.kind, ...label, px: [x, y], ...pxToDeg(frame, x, y, cfg.extentDeg), method: 'manual' };
    }
    const b = snapToBlob(blobs, v.approxPx);
    return { id, kind: v.kind, ...label, px: [+b.cx.toFixed(2), +b.cy.toFixed(2)], ...pxToDeg(frame, b.cx, b.cy, cfg.extentDeg), method: 'blob', area: b.area };
  });
  const dots = blobs.filter(isRoundDot).map((b) => ({ px: [+b.cx.toFixed(2), +b.cy.toFixed(2)], ...pxToDeg(frame, b.cx, b.cy, cfg.extentDeg) }));

  const src = sources.find((s) => s.file === cfg.source.file)!;
  writeJson(`data/derived/${cfg.id}-points.json`, {
    provenance: {
      sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
      method: `${cfg.source.file} PDF p. ${cfg.source.page} rendered at ${cfg.source.dpi} dpi (pdftoppm) and cropped (scripts/extract-figures.ts, data/manual/figures/${cfg.id}.json). The frame is registered from its ±${cfg.extentDeg}° border lines; each labeled glyph is snapped to the nearest detected dark blob from a hand-read approximate position, or measured by eye on a 4× zoom where it touches the frame or reticle (method: manual). Unlabeled plotter dots are detected as small filled discs (isRoundDot).`,
      script: 'scripts/digitize-figure.ts',
      generated: today(),
    },
    image: { path: image, widthPx: img.width, heightPx: img.height },
    frame,
    extentDeg: cfg.extentDeg,
    points,
    dots,
  });
  console.log(`${cfg.id}: frame ${frame.leftX.toFixed(1)}..${frame.rightX.toFixed(1)} × ${frame.topY.toFixed(1)}..${frame.bottomY.toFixed(1)}; ${blobs.length} blobs; ${points.length} points; ${dots.length} dots`);
}
