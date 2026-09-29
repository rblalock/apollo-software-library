/**
 * Pre-resolve the star catalogues for the site so the browser does not download the catalogues themselves
 * (roadmap item 8.4): the RTCC 148-star catalogue and the verified 1,078-star rows, as unit vectors at the
 * Apollo 11 platform epoch. Writes data/derived/site-stars.json (checked against a live resolution by
 * site/src/lib/stars.test.ts).
 */
import { readFileSync } from 'node:fs';
import {
  APOLLO_11, resolveCatalog, resolveVerifiedCatalog, type Agc37File, type BscFile, type RtccFile, type VerifiedCatalogFile,
} from '../packages/view-engine/src/index';
import { today, writeJson } from './lib/provenance';

const read = <T>(p: string) => JSON.parse(readFileSync(p, 'utf8')) as T;
const agc = read<Agc37File>('data/derived/agc37.json');
const round = (v: readonly number[]) => v.map((x) => +x.toFixed(12));
const rtcc = resolveCatalog(read<RtccFile>('data/derived/rtcc1970.json'), read<BscFile>('data/derived/bsc45.json'), agc, APOLLO_11.referenceEpochJd);
const cat1078 = resolveVerifiedCatalog(read<VerifiedCatalogFile>('data/derived/cat1078.json'), agc, APOLLO_11.referenceEpochJd);
writeJson('data/derived/site-stars.json', {
  provenance: { method: 'resolveCatalog / resolveVerifiedCatalog at the Apollo 11 reference epoch (B1970), directions rounded to 1e-12.', script: 'scripts/build-site-data.ts', generated: today(), epochJd: APOLLO_11.referenceEpochJd },
  rtcc: rtcc.map((s) => ({ ...s, direction: round(s.direction) })),
  cat1078: cat1078.map((s) => ({ ...s, direction: round(s.direction) })),
}, 0);
console.log(`site-stars: ${rtcc.length} RTCC, ${cat1078.length} verified 1,078-catalogue stars`);
