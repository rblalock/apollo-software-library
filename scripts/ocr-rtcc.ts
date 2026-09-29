import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const PDF = 'data/sources/69-fm-197.pdf';
const PAGES = [309, 310, 311, 312, 313]; // printed pp. 291–295: "RTCC star catalogue for Besselian year 1970"
const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-197.pdf');
mkdirSync('tmp/rtcc', { recursive: true });

const chunks: string[] = [
  `# OCR of ${PDF} (sha256 ${src.sha256}), PDF pages ${PAGES.join(', ')}`,
  `# pdftoppm -r 300 -gray; tesseract --psm 6 (original page orientation). Generated ${new Date().toISOString().slice(0, 10)} by scripts/ocr-rtcc.ts`,
];
for (const p of PAGES) {
  execFileSync('pdftoppm', ['-r', '300', '-gray', '-png', '-f', String(p), '-l', String(p), PDF, `tmp/rtcc/p${p}`]);
  const png = readdirSync('tmp/rtcc').find((f) => f.startsWith(`p${p}-`))!;
  const text = execFileSync('tesseract', [`tmp/rtcc/${png}`, '-', '--psm', '6'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  chunks.push(`=== page ${p} ===`, text);
}
writeFileSync('data/derived/rtcc1970-ocr.txt', chunks.join('\n'));
console.log('rtcc1970-ocr.txt written');
