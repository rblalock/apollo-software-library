import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { loadFigureConfigs } from './lib/figures';
import { crop, readGray, writeGray } from './lib/png';

// Crop boxes (data/manual/figures/*.json) are in page pixels at the given dpi; each must contain one whole panel
// frame plus its tick labels and headers.
mkdirSync('tmp/extract', { recursive: true });
mkdirSync('data/derived/scans', { recursive: true });
const ids = process.argv.slice(2);
const configs = [...loadFigureConfigs(), ...loadFigureConfigs(undefined, 'data/manual/globes')];
for (const f of ids.length ? configs.filter((c) => ids.includes(c.id)) : configs) {
  const prefix = `tmp/extract/${f.id}`;
  for (const old of readdirSync('tmp/extract').filter((n) => n.startsWith(`${f.id}-`))) rmSync(`tmp/extract/${old}`);
  execFileSync('pdftoppm', ['-r', String(f.source.dpi), '-gray', '-png', '-f', String(f.source.page), '-l', String(f.source.page), `data/sources/${f.source.file}`, prefix]);
  const page = readdirSync('tmp/extract').find((n) => n.startsWith(`${f.id}-`))!;
  const c = f.source.crop;
  writeGray(`data/derived/scans/${f.scan}`, crop(readGray(`tmp/extract/${page}`), c.x, c.y, c.w, c.h));
  console.log(`${f.scan} written`);
}
