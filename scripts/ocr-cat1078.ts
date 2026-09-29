import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { groupRows, type OcrWord } from './lib/cat1078';

const PDF = 'data/sources/69-fm-107.pdf';
const DPI = Number(process.argv[2] ?? 300);
const OUT = DPI === 300 ? 'data/derived/cat1078-ocr.txt' : `data/derived/cat1078-ocr-${DPI}.txt`;
const PAGES = Array.from({ length: 19 }, (_, i) => 14 + i); // Table I "Star identification catalogue", PDF pp. 14–32
const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-107.pdf');
mkdirSync('tmp/c1078', { recursive: true });

function ocrWords(png: string): OcrWord[] {
  const tsv = execFileSync('tesseract', [png, '-', '--psm', '6', 'tsv'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return tsv.split('\n').slice(1).map((l) => l.split('\t')).filter((c) => c.length >= 12 && c[11]!.trim())
    .map((c) => ({ left: Number(c[6]), top: Number(c[7]), height: Number(c[9]), text: c[11]!.trim() }));
}
const raLike = (rows: string[]) => rows.filter((r) => /\d{1,2}[^\d\s]\d{6,}/.test(r)).length;

const chunks: string[] = [
  `# OCR of ${PDF} (sha256 ${src.sha256}), PDF pages ${PAGES[0]}–${PAGES.at(-1)}`,
  `# pdftoppm -r ${DPI} -gray; each page rotated 270° or 90° (whichever yields more rows); tesseract --psm 6 word boxes regrouped into printer rows by y. Generated ${new Date().toISOString().slice(0, 10)} by scripts/ocr-cat1078.ts`,
];
for (const p of PAGES) {
  execFileSync('pdftoppm', ['-r', String(DPI), '-gray', '-png', '-f', String(p), '-l', String(p), PDF, `tmp/c1078/d${DPI}p${p}`]);
  const png = readdirSync('tmp/c1078').find((f) => f.startsWith(`d${DPI}p${p}-`))!;
  const tries = [270, 90].map((rot) => {
    execFileSync('magick', [`tmp/c1078/${png}`, '-rotate', String(rot), `tmp/c1078/d${DPI}r${p}-${rot}.png`]);
    const rows = groupRows(ocrWords(`tmp/c1078/d${DPI}r${p}-${rot}.png`));
    return { rot, rows, score: raLike(rows) };
  });
  const best = tries.sort((a, b) => b.score - a.score)[0]!;
  chunks.push(`=== page ${p} (rotated ${best.rot}°, ${best.score} rows with an RA-like field) ===`, ...best.rows);
}
writeFileSync(OUT, chunks.join('\n') + '\n');
console.log(`${OUT} written`);
