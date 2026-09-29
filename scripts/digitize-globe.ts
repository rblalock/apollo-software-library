/**
 * Measure TN D-6853 Figs 6–7 (globe views) without reference to any model: the frame from its border lines and the
 * limb as a robust circle fit to the outermost ink along rays from the frame centre. Writes
 * data/derived/<id>-globe.json. (Features and the terminator are located by the golden tests; ledger Item 2.4.)
 */
import { readFileSync } from 'node:fs';
import { fitCircle } from './lib/circle';
import { findFrame, pxToDeg, type Frame } from './lib/digitize';
import { readGray } from './lib/png';
import { today, writeJson } from './lib/provenance';

interface GlobeConfig {
  id: string;
  scan: string;
  source: { file: string; page: number; dpi: number; crop: { x: number; y: number; w: number; h: number } };
  extentDeg: number;
  body: 'earth' | 'moon';
  get: string;
  frameOverride?: Partial<Frame>;
}

const sources = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')) as Array<{ file: string; url: string; retrieved: string; sha256: string }>;
const ids = process.argv.slice(2);
const DARK = 128, FRAME_INSET_PX = 22;

for (const id of ids.length ? ids : ['fig6a', 'fig6b', 'fig6c', 'fig6d', 'fig7a', 'fig7b']) {
  const cfg = JSON.parse(readFileSync(`data/manual/globes/${id}.json`, 'utf8')) as GlobeConfig;
  const image = `data/derived/scans/${cfg.scan}`;
  const img = readGray(image);
  const frame = { ...findFrame(img), ...cfg.frameOverride };
  const deg = (x: number, y: number) => pxToDeg(frame, x, y, cfg.extentDeg);

  // Limb: along 720 rays from the frame centre, the outermost dark pixel short of the frame's tick band.
  const cx = (frame.leftX + frame.rightX) / 2, cy = (frame.topY + frame.bottomY) / 2;
  const limbPts: [number, number][] = [];
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * 2 * Math.PI, dx = Math.cos(a), dy = Math.sin(a);
    let last: [number, number] | null = null;
    for (let s = 0; ; s += 0.5) {
      const x = Math.round(cx + dx * s), y = Math.round(cy + dy * s);
      if (x < frame.leftX + FRAME_INSET_PX || x > frame.rightX - FRAME_INSET_PX || y < frame.topY + FRAME_INSET_PX || y > frame.bottomY - FRAME_INSET_PX) break;
      if (img.data[y * img.width + x]! < DARK) last = [x, y];
    }
    if (last) { const d = deg(last[0], last[1]); limbPts.push([d.xDeg, d.yDeg]); }
  }
  const limb = fitCircle(limbPts);

  const src = sources.find((s) => s.file === cfg.source.file)!;
  writeJson(`data/derived/${id}-globe.json`, {
    provenance: {
      sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
      method: `${cfg.source.file} PDF p. ${cfg.source.page} at ${cfg.source.dpi} dpi, cropped (scripts/extract-figures.ts). Frame from its border lines${cfg.frameOverride ? ` (override: ${JSON.stringify(cfg.frameOverride)})` : ''}, mapped to ±${cfg.extentDeg}° (the printed field of view). Limb: robust circle fit to the outermost dark pixel on each of 720 rays from the frame centre, ${FRAME_INSET_PX} px inside the frame.`,
      script: 'scripts/digitize-globe.ts',
      generated: today(),
    },
    image: { path: image, widthPx: img.width, heightPx: img.height },
    frame,
    extentDeg: cfg.extentDeg,
    body: cfg.body,
    get: cfg.get,
    limb: { cxDeg: limb.cx, cyDeg: limb.cy, rDeg: limb.r, rmsDeg: limb.rms, used: limb.used, rays: limbPts.length },
  });
  console.log(`${id}: frame ${(frame.rightX - frame.leftX).toFixed(0)}×${(frame.bottomY - frame.topY).toFixed(0)} px; limb centre (${limb.cx.toFixed(3)}, ${limb.cy.toFixed(3)})°, radius ${limb.r.toFixed(4)}° (rms ${limb.rms.toFixed(4)}°, ${limb.used}/${limbPts.length} rays)`);
}
