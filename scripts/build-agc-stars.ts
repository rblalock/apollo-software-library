import { besselianEpochToJd } from '../packages/view-engine/src/index';
import { APOLLO_NAV_STARS, parseAgcStarTable } from './lib/agc';
import { download, today, writeJson } from './lib/provenance';

const COMMIT = 'c63dd9b528de0afd498b445dc81a6eef6419d5bf'; // last change to STAR_TABLES.agc
const URL_ = `https://raw.githubusercontent.com/virtualagc/virtualagc/${COMMIT}/Comanche055/STAR_TABLES.agc`;
const { bytes, source } = await download(URL_);
const table = parseAgcStarTable(new TextDecoder().decode(bytes));
if (table.size !== 37) throw new Error(`expected 37 stars, got ${table.size}`);
writeJson('data/derived/agc37.json', {
  provenance: {
    sources: [source],
    method: 'Unit vectors from Comanche055 (Colossus 2A, Apollo 11 CM) STAR_TABLES.agc. Names and HR numbers from the Apollo nav-star list (ALSJ); epoch established by the catalog epoch test.',
    script: 'scripts/build-agc-stars.ts',
    generated: today(),
  },
  epoch: 'B1970.0',
  epochJd: besselianEpochToJd(1970),
  stars: APOLLO_NAV_STARS.map((s) => ({ ...s, vector: table.get(s.navStar)! })),
});
console.log('agc37.json: 37 stars');
