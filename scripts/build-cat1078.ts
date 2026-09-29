import { readFileSync } from 'node:fs';
import { angleBetween, besselianEpochToJd, precessionMatrix, radecToVec, starDirection, toDeg, vecToRadec, type CatalogStar, type Vec3 } from '../packages/view-engine/src/index';
import { parseBscCatalog } from './lib/bsc';
import { loadBscCatalog } from './lib/bsc-source';
import { parseCat1078Row } from './lib/cat1078';
import { today, writeJson } from './lib/provenance';

/**
 * 69-FM-107 Table I (1,078 stars, "visual magnitude to 4.5") from two OCR passes (300 and 400 dpi). A row is
 * VERIFIED when one of its readings (decimal or sexagesimal RA/Dec) lies within 0.05° of a BSC5 star at the
 * table's epoch, B1965.0 (established by the epoch scan in the ledger). Rows are deduplicated by HR.
 */
// 20″: a correct reading lands within a few arcseconds (the table prints 0.1 s and 1″); at 0.05° the
// expected chance matches from ~30 candidate readings per failed row would be ~20–30, at 20″ about 0.4.
const TOL_DEG = 20 / 3600;
const EPOCH = 1965.0;
const OCR_FILES = ['data/derived/cat1078-ocr.txt', 'data/derived/cat1078-ocr-400.txt'];

const { text, source: bscSource } = await loadBscCatalog();
const bsc = parseBscCatalog(text).filter((s) => s.vmag <= 6.0);
const jd = besselianEpochToJd(EPOCH), P = precessionMatrix(jd);
const cells = new Map<string, Array<{ star: CatalogStar; v: Vec3 }>>();
const key = (raDeg: number, decDeg: number) => `${Math.floor(raDeg)}:${Math.floor(decDeg)}`;
for (const star of bsc) {
  const v = starDirection(star, jd, P); const { raDeg, decDeg } = vecToRadec(v);
  const k = key(raDeg, decDeg); (cells.get(k) ?? cells.set(k, []).get(k)!).push({ star, v });
}
function nearest(raDeg: number, decDeg: number): { star: CatalogStar; sep: number } | null {
  const v = radecToVec(raDeg, decDeg);
  let best: { star: CatalogStar; sep: number } | null = null;
  const span = Math.abs(decDeg) > 80 ? 180 : 1;
  for (let dr = -span; dr <= span; dr++) for (let dd = -1; dd <= 1; dd++) {
    for (const c of cells.get(key((((Math.floor(raDeg) + dr) % 360) + 360) % 360, Math.floor(decDeg) + dd)) ?? []) {
      const sep = toDeg(angleBetween(v, c.v));
      if (sep <= TOL_DEG && (!best || sep < best.sep)) best = { star: c.star, sep };
    }
  }
  return best;
}

const verified = new Map<number, { hr: number; bscName: string; seqOcr: number | null; mag: number | null; printedRaDeg: number; printedDecDeg: number; separationDeg: number }>();
let rows = 0;
for (const file of OCR_FILES) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.startsWith('#') || line.startsWith('===')) continue;
    const r = parseCat1078Row(line);
    if (!r || !r.raCandidates.length || !r.decCandidates.length) continue;
    rows++;
    let best: { star: CatalogStar; sep: number; ra: number; dec: number } | null = null;
    for (const ra of r.raCandidates) for (const dec of r.decCandidates) {
      const m = nearest(ra * 15, dec);
      if (m && (!best || m.sep < best.sep)) best = { ...m, ra: ra * 15, dec };
    }
    if (!best) continue;
    const prev = verified.get(best.star.hr);
    if (!prev || best.sep < prev.separationDeg) {
      verified.set(best.star.hr, { hr: best.star.hr, bscName: best.star.name, seqOcr: r.seq, mag: r.mag, printedRaDeg: best.ra, printedDecDeg: best.dec, separationDeg: best.sep });
    }
  }
}
const stars = [...verified.values()].sort((a, b) => a.printedRaDeg - b.printedRaDeg).map((v) => ({
  ...v, ...(({ hr, name, ...pos }) => ({ bsc: pos }))(bsc.find((s) => s.hr === v.hr)!),
}));
const sources = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-107.pdf');
writeJson('data/derived/cat1078.json', {
  provenance: {
    sources: [{ url: sources.url, retrieved: sources.retrieved, sha256: sources.sha256 }, bscSource],
    method: `OCR (tesseract, two passes at 300 and 400 dpi) of 69-FM-107 Table I, PDF pp. 14–32. A row is kept only when one of its printed readings lies within 20″ of a BSC5 star (V ≤ 6.0) precessed with proper motion to the table's epoch B${EPOCH.toFixed(1)}; rows are deduplicated by HR. Each entry carries the BSC J2000 position and proper motion for use at any epoch.`,
    script: 'scripts/build-cat1078.ts',
    generated: today(),
  },
  epoch: `B${EPOCH.toFixed(1)}`,
  tableRows: 1078,
  stars,
});
console.log(`cat1078.json: ${stars.length} verified of 1078 table rows (${rows} parsed OCR rows across ${OCR_FILES.length} passes); max separation ${Math.max(...stars.map((s) => s.separationDeg)).toFixed(4)}°`);
