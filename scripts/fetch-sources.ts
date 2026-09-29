import { mkdirSync, writeFileSync } from 'node:fs';
import { download, writeJson } from './lib/provenance';

const SOURCES = [
  {
    file: 'tn-d-6853.pdf',
    title: 'NASA TN D-6853, Apollo Experience Report – The Application of a Computerized Visualization Capability to Lunar Missions (Hyle & Lunde, June 1972)',
    url: 'https://ntrs.nasa.gov/api/citations/19720017950/downloads/19720017950.pdf',
  },
  {
    file: '69-fm-197.pdf',
    title: 'MSC IN 69-FM-197 Rev 1, Views from the CM and LM During the Flight of Apollo 11 (Mission G) (A. N. Lunde, 3 July 1969)',
    url: 'https://www.ibiblio.org/apollo/Documents/19740073250.pdf',
  },
  {
    file: '69-fm-107.pdf',
    title: 'MSC IN 69-FM-107, Views from the Spacecraft During Apollo 10 (Mission F) (22 April 1969)',
    url: 'https://web.archive.org/web/20250615183849id_/https://www.nasa.gov/wp-content/uploads/static/history/afj/ap10fj/pdf/a10-views-from-sc-1969-05-18-launch-19690422.pdf',
  },
];

mkdirSync('data/sources', { recursive: true });
const records = [];
for (const s of SOURCES) {
  const { bytes, source } = await download(s.url);
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error(`${s.url} is not a PDF`);
  writeFileSync(`data/sources/${s.file}`, bytes);
  records.push({ ...s, ...source, bytes: bytes.length });
  console.log(`${s.file}: ${bytes.length} bytes`);
}
writeJson('data/sources/sources.json', records);
writeFileSync('data/sources/SOURCES.md', [
  '# Primary sources',
  '',
  'All documents are U.S. Government works (NASA), in the public domain. Regenerate with `bun scripts/fetch-sources.ts`.',
  '',
  '| File | Document | URL | Retrieved | SHA-256 |',
  '|---|---|---|---|---|',
  ...records.map((r) => `| \`${r.file}\` | ${r.title} | ${r.url} | ${r.retrieved} | \`${r.sha256}\` |`),
  '',
].join('\n'));
