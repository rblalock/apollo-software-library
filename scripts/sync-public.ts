import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

// The site serves the primary-source PDFs and figure scans; data/ stays the single source of truth.
for (const [from, to, ext] of [['data/sources', 'site/public/docs', '.pdf'], ['data/derived/scans', 'site/public/scans', '.png']] as const) {
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from).filter((n) => n.endsWith(ext))) copyFileSync(`${from}/${f}`, `${to}/${f}`);
}
console.log('public/docs and public/scans synced');
