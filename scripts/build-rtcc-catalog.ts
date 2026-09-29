import { readFileSync } from 'node:fs';
import { besselianEpochToJd, precessionMatrix, starDirection, type CatalogStar } from '../packages/view-engine/src/index';
import { APOLLO_NAV_STARS } from './lib/agc';
import { parseRtccOcr, resolveRtccRows, type RtccOverride } from './lib/rtcc';
import { today, writeJson } from './lib/provenance';

const TOL_DEG = 0.05;
const epochJd = besselianEpochToJd(1970);
const P = precessionMatrix(epochJd);
const bsc = JSON.parse(readFileSync('data/derived/bsc45.json', 'utf8')) as { provenance: { sources: unknown[] }; stars: CatalogStar[] };
const byHr = new Map(bsc.stars.map((s) => [s.hr, s]));
const stars = new Map(bsc.stars.map((s) => [s.hr, starDirection(s, epochJd, P)]));
const { _comment, ...overrides } = JSON.parse(readFileSync('data/manual/rtcc-overrides.json', 'utf8')) as Record<string, RtccOverride> & { _comment: string };
const rows = parseRtccOcr(readFileSync('data/derived/rtcc1970-ocr.txt', 'utf8'));
if (rows.length !== 148) throw new Error(`expected 148 catalogue rows, parsed ${rows.length}:\n${rows.map((r) => `${r.seq}: ${r.line}`).join('\n')}`);

const { resolved, failures } = resolveRtccRows(rows, {
  stars,
  navHr: (seq) => (seq <= 37 ? APOLLO_NAV_STARS[seq - 1]!.hr : null),
  overrides,
  tolDeg: TOL_DEG,
});
if (failures.length) throw new Error(`RTCC catalogue build failed:\n${failures.join('\n')}`);

const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-197.pdf');
writeJson('data/derived/rtcc1970.json', {
  provenance: {
    sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }, ...bsc.provenance.sources],
    method: 'OCR (tesseract) of the "RTCC star catalogue for Besselian year 1970", 69-FM-197 PDF pp. 309–313. Every row is verified by position: its printed B1970 position must lie within 0.05° of its BSC5 star (data/derived/bsc45.json, precessed to B1970 with proper motion). Rows 1–37 are pinned to the Apollo nav-star HR numbers; rows with unreadable OCR use data/manual/rtcc-overrides.json, whose HR and position were read from the page image and are checked the same way.',
    script: 'scripts/build-rtcc-catalog.ts',
    generated: today(),
  },
  epoch: 'B1970.0',
  stars: resolved.map((r) => ({ ...r, bscName: byHr.get(r.hr)!.name })),
});
console.log(`rtcc1970.json: ${resolved.length} stars (${resolved.filter((s) => s.via === 'override').length} via overrides), max separation ${Math.max(...resolved.map((r) => r.separationDeg)).toFixed(4)}°`);
