import { gunzipSync } from 'node:zlib';
import { download, today, writeJson } from './lib/provenance';
import { parseBscCatalog } from './lib/bsc';

const URL_ = 'https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz';
const { bytes, source } = await download(URL_);
const stars = parseBscCatalog(gunzipSync(bytes).toString('latin1')).filter((s) => s.vmag <= 4.5);
writeJson('data/derived/bsc45.json', {
  provenance: {
    sources: [source],
    method: 'Yale Bright Star Catalog 5th ed. (VizieR V/50), stars with V ≤ 4.5; J2000 positions and FK5 proper motions as published.',
    script: 'scripts/build-bsc.ts',
    generated: today(),
  },
  stars,
});
console.log(`bsc45.json: ${stars.length} stars`);
