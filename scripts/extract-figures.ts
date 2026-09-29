import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { crop, readGray, writeGray } from './lib/png';

/** Crop boxes are in 300-dpi page pixels; they must include the whole ±50° frame plus its tick labels. */
const FIGURES = [
  { id: 'tnd6853-fig3a', pdf: 'data/sources/tn-d-6853.pdf', page: 10, crop: { x: 150, y: 215, w: 1080, h: 1040 } },
];

mkdirSync('tmp/extract', { recursive: true });
mkdirSync('data/derived/scans', { recursive: true });
for (const f of FIGURES) {
  const prefix = `tmp/extract/${f.id}`;
  execFileSync('pdftoppm', ['-r', '300', '-gray', '-png', '-f', String(f.page), '-l', String(f.page), f.pdf, prefix]);
  const page = readdirSync('tmp/extract').find((n) => n.startsWith(`${f.id}-`))!;
  writeGray(`data/derived/scans/${f.id}.png`, crop(readGray(`tmp/extract/${page}`), f.crop.x, f.crop.y, f.crop.w, f.crop.h));
  console.log(`${f.id}.png written`);
}
