import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { download, sha256, today, type ProvenanceSource } from './provenance';

const URL_ = 'https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz';
const CACHE = 'tmp/bsc5-catalog.gz';

/** The full Yale Bright Star Catalog (VizieR V/50) text, downloaded once and cached under tmp/. */
export async function loadBscCatalog(): Promise<{ text: string; source: ProvenanceSource }> {
  if (!existsSync(CACHE)) {
    const { bytes } = await download(URL_);
    mkdirSync('tmp', { recursive: true });
    writeFileSync(CACHE, bytes);
  }
  const bytes = new Uint8Array(readFileSync(CACHE));
  return { text: gunzipSync(bytes).toString('latin1'), source: { url: URL_, retrieved: today(), sha256: sha256(bytes) } };
}
