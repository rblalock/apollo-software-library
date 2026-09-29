import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crossAngles } from '../lib/digitize';
import { readGray } from '../lib/png';

// The 1969 program drew the AOT reticle cross rotated in each detent's view. Measuring it on the scans gives the
// image-rotation convention independently of any star position: cross angle ≡ −(detent azimuth) (mod 90°).
const PANELS = [['fig4a', 0], ['fig4b', 300], ['fig4c', 240], ['fig4d', 180], ['fig4e', 120], ['fig4f', 60]] as const;
const mod90 = (a: number) => ((a % 90) + 90) % 90;
const diff90 = (a: number, b: number) => { const d = Math.abs(mod90(a) - mod90(b)); return Math.min(d, 90 - d); };

describe('Fig 4 reticle crosses on the 1972 scans', () => {
  it.each(PANELS)('%s cross is rotated by −(detent azimuth %i°), within 3°', (id, az) => {
    const pts = JSON.parse(readFileSync(`data/derived/${id}-points.json`, 'utf8'));
    const [a, b] = crossAngles(readGray(pts.image.path), pts.frame);
    expect(diff90(a!, -az)).toBeLessThan(3);
    expect(diff90(b!, -az + 90)).toBeLessThan(3);
  });
});
