import { readFileSync } from 'node:fs';
import { angleBetween, besselianEpochToJd, precessionMatrix, radecToVec, starDirection, toDeg, type CatalogStar } from '../packages/view-engine/src/index';
import { APOLLO_NAV_STARS } from './lib/agc';
import { matchRow, parseRtccOcr } from './lib/rtcc';
import { today, writeJson } from './lib/provenance';

const TOL_DEG = 0.05;
const epochJd = besselianEpochToJd(1970);
const P = precessionMatrix(epochJd);
const bsc = JSON.parse(readFileSync('data/derived/bsc45.json', 'utf8')) as { stars: CatalogStar[] };
const byHr = new Map(bsc.stars.map((s) => [s.hr, s]));
const candidates = bsc.stars.map((s) => ({ hr: s.hr, direction: starDirection(s, epochJd, P) }));
const overrides = JSON.parse(readFileSync('data/manual/rtcc-overrides.json', 'utf8')) as Record<string, { hr: number; reason: string } | string>;
const rows = parseRtccOcr(readFileSync('data/derived/rtcc1970-ocr.txt', 'utf8'));
if (rows.length !== 148) throw new Error(`expected 148 catalogue rows, parsed ${rows.length}:\n${rows.map((r) => `${r.seq}: ${r.line}`).join('\n')}`);

const failures: string[] = [];
const stars = rows.map((row) => {
  const override = overrides[String(row.seq)];
  const nav = row.seq <= 37 ? APOLLO_NAV_STARS[row.seq - 1]! : null;
  let hr: number | null = null, via: 'ocr' | 'override' = 'ocr', sepDeg: number | null = null;
  if (override && typeof override !== 'string') { hr = override.hr; via = 'override'; }
  else if (nav) { hr = nav.hr; }
  else { const m = matchRow(row, candidates, TOL_DEG); if (m) { hr = m.hr; sepDeg = m.sepDeg; } }
  if (hr === null || !byHr.has(hr)) { failures.push(`row ${row.seq}: no BSC match within ${TOL_DEG}° — "${row.line}"`); return null; }
  if (via === 'ocr' && row.raDeg !== null && row.decAbsDeg !== null && sepDeg === null) {
    const dir = starDirection(byHr.get(hr)!, epochJd, P);
    const signs = row.decSign === null ? [1, -1] : [row.decSign];
    sepDeg = Math.min(...signs.map((s) => toDeg(angleBetween(radecToVec(row.raDeg!, s * row.decAbsDeg!), dir))));
    if (sepDeg > TOL_DEG) failures.push(`row ${row.seq}: HR ${hr} is ${sepDeg.toFixed(3)}° from the printed position — "${row.line}"`);
  }
  // Override rows had unreadable OCR digits: their printed position is in the override's reason, not here.
  const ocrOk = via === 'ocr';
  const printedDecDeg = !ocrOk || row.decAbsDeg === null || row.decSign === null ? null : row.decSign * row.decAbsDeg;
  return { seq: row.seq, hr, bscName: byHr.get(hr)!.name, mag: row.mag, printedRaDeg: ocrOk ? row.raDeg : null, printedDecDeg, separationDeg: sepDeg, via };
});
const hrs = stars.filter(Boolean).map((s) => s!.hr);
const dupes = hrs.filter((h, i) => hrs.indexOf(h) !== i);
if (dupes.length) failures.push(`duplicate HR numbers: ${[...new Set(dupes)].join(', ')}`);
if (failures.length) throw new Error(`RTCC catalogue build failed:\n${failures.join('\n')}`);

const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-197.pdf');
writeJson('data/derived/rtcc1970.json', {
  provenance: {
    sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
    method: 'OCR (tesseract) of the "RTCC star catalogue for Besselian year 1970", 69-FM-197 PDF pp. 309–313. Each row is matched by its printed B1970 position to a BSC5 star (V ≤ 4.5) within 0.05°; rows 1–37 are pinned to the Apollo nav-star HR numbers; unreadable rows are resolved in data/manual/rtcc-overrides.json.',
    script: 'scripts/build-rtcc-catalog.ts',
    generated: today(),
  },
  epoch: 'B1970.0',
  stars,
});
console.log(`rtcc1970.json: ${stars.length} stars (${stars.filter((s) => s!.via === 'override').length} via overrides)`);
