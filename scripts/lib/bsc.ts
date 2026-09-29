import type { CatalogStar } from '../../packages/view-engine/src/index';

// Byte ranges per the VizieR V/50 ReadMe (1-based inclusive → 0-based slices).
const f = (line: string, from: number, to: number) => line.slice(from - 1, to).trim();

export function parseBscCatalog(text: string): CatalogStar[] {
  const out: CatalogStar[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.padEnd(200);
    if (!f(line, 76, 77)) continue; // no J2000 position (removed entries)
    const ra = (Number(f(line, 76, 77)) + Number(f(line, 78, 79)) / 60 + Number(f(line, 80, 83)) / 3600) * 15;
    const decAbs = Number(f(line, 85, 86)) + Number(f(line, 87, 88)) / 60 + Number(f(line, 89, 90)) / 3600;
    const vmag = f(line, 103, 107);
    out.push({
      hr: Number(f(line, 1, 4)),
      name: f(line, 5, 14),
      raDeg: ra,
      decDeg: line[83] === '-' ? -decAbs : decAbs,
      pmRaArcsecPerYr: Number(f(line, 149, 154) || 0),
      pmDecArcsecPerYr: Number(f(line, 155, 160) || 0),
      vmag: vmag ? Number(vmag) : 99,
    });
  }
  return out;
}
