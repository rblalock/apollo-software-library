/**
 * The link-preview image (Open Graph / Twitter card): the library's name and summary beside the first frame of the
 * film's Earth reel, 1200x630, in the site's own paper, ink and IBM Plex type. rsvg-convert rasterizes it with the
 * site's own Plex font files, unpacked from WOFF and added to the system fonts through a private fontconfig setup, so
 * nothing needs installing.
 * Needs rsvg-convert (librsvg). Writes site/public/og.png.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { renderSvg } from '../packages/view-engine/src/index';
import { REELS } from '../site/src/lib/reels';

const OUT = 'site/public/og.png';
const W = 1200, H = 630;
const FONTS = [
  'ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff',
  'ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff',
  'ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff',
];
// The site's design tokens (site/src/styles/global.css, light theme).
const paper = '#f6f3ea', ink = '#1d1b17', muted = '#6a645a', accent = '#b4410f';

/** WOFF 1.0 to a plain TrueType/OpenType file: Pango loads fonts through HarfBuzz, which cannot read WOFF. */
function woffToSfnt(woff: Buffer): Buffer {
  const n = woff.readUInt16BE(12);
  const tables = Array.from({ length: n }, (_, i) => {
    const d = 44 + 20 * i;
    const offset = woff.readUInt32BE(d + 4), compLength = woff.readUInt32BE(d + 8), origLength = woff.readUInt32BE(d + 12);
    const raw = woff.subarray(offset, offset + compLength);
    return { tag: woff.subarray(d, d + 4), checksum: woff.readUInt32BE(d + 16), data: compLength < origLength ? inflateSync(raw) : raw };
  });
  const pow = 2 ** Math.floor(Math.log2(n));
  const dir = Buffer.alloc(12 + 16 * n);
  dir.writeUInt32BE(woff.readUInt32BE(4), 0);
  dir.writeUInt16BE(n, 4);
  dir.writeUInt16BE(pow * 16, 6);
  dir.writeUInt16BE(Math.log2(pow), 8);
  dir.writeUInt16BE(n * 16 - pow * 16, 10);
  const parts: Buffer[] = [dir];
  let offset = dir.length;
  tables.forEach((t, i) => {
    t.tag.copy(dir, 12 + 16 * i);
    dir.writeUInt32BE(t.checksum, 16 + 16 * i);
    dir.writeUInt32BE(offset, 20 + 16 * i);
    dir.writeUInt32BE(t.data.length, 24 + 16 * i);
    const padded = Buffer.alloc((t.data.length + 3) & ~3);
    t.data.copy(padded);
    parts.push(padded);
    offset += padded.length;
  });
  return Buffer.concat(parts);
}

const earth = REELS.find((r) => r.id === 'earth')!;
const frame = renderSvg(earth.frame(0).dl, { style: 'microfilm' }).replace('<svg ', `<svg x="${W - H}" y="0" width="${H}" height="${H}" `);
const lines = (x: number, y: number, step: number, texts: string[], attrs: string) =>
  texts.map((t, i) => `<text x="${x}" y="${y + i * step}" ${attrs}>${t}</text>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <text x="64" y="104" font-family="IBM Plex Mono" font-weight="500" font-size="19" letter-spacing="2.5" fill="${muted}">FIRST ENTRY: THE MSC VIEW PROGRAM</text>
  ${lines(62, 196, 74, ['Apollo', 'Software', 'Library'], `font-family="IBM Plex Sans" font-weight="600" font-size="70" fill="${ink}"`)}
  <rect x="64" y="378" width="56" height="5" fill="${accent}"/>
  ${lines(64, 436, 38, ['Working recreations of the software', 'that planned and flew the Apollo', 'missions, next to the NASA documents', 'they were rebuilt from.'], `font-family="IBM Plex Sans" font-size="26" fill="${ink}"`)}
  ${frame}
</svg>`;

const dir = mkdtempSync(join(tmpdir(), 'og-image-'));
try {
  for (const f of FONTS) writeFileSync(join(dir, f.split('/').pop()!.replace(/woff$/, 'ttf')), woffToSfnt(readFileSync(resolve('site/node_modules/@fontsource', f))));
  // The @fontsource files name each weight as its own family ("IBM Plex Sans SemiBold"); file them under the base
  // family so a weight in the SVG selects the right file instead of a synthesized bold.
  const rename = (from: string, to: string) =>
    `<match target="scan"><test name="family"><string>${from}</string></test><edit name="family" mode="assign" binding="same"><string>${to}</string></edit></match>`;
  writeFileSync(join(dir, 'fonts.conf'), `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>
    <include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>${dir}</dir><cachedir>${dir}/cache</cachedir>
    ${rename('IBM Plex Sans SemiBold', 'IBM Plex Sans')}${rename('IBM Plex Mono Medium', 'IBM Plex Mono')}</fontconfig>`);
  writeFileSync(join(dir, 'og.svg'), svg);
  const p = Bun.spawnSync(['rsvg-convert', '-w', String(W), '-h', String(H), '-o', OUT, join(dir, 'og.svg')], {
    env: { ...process.env, FONTCONFIG_FILE: join(dir, 'fonts.conf') }, stderr: 'pipe',
  });
  if (p.exitCode !== 0) throw new Error(`rsvg-convert failed: ${p.stderr.toString()}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`${OUT}: ${W}x${H}`);
