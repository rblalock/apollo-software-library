/**
 * Hand-digitizing aid: `bun scripts/zoom-grid.ts <scan.png> <cx> <cy> [half=60] [scale=6] <out.png>` writes a
 * zoomed crop centred on (cx, cy) with a 5 px grid (every 10 px darker, labelled every 20 px in scan pixels).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [scan, cxs, cys, halfs = '60', scales = '6', out = 'tmp/zoom.png'] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
const cx = Math.round(Number(cxs)), cy = Math.round(Number(cys)), half = Number(halfs), k = Number(scales);
const x0 = cx - half, y0 = cy - half, size = 2 * half;
const png = execFileSync('magick', [scan!, '-crop', `${size}x${size}+${x0}+${y0}`, '+repage', '-filter', 'point', '-resize', `${size * k}x${size * k}`, 'png:-']);
const parts = [`<image href="data:image/png;base64,${png.toString('base64')}" x="0" y="0" width="${size * k}" height="${size * k}"/>`];
for (let v = Math.ceil(x0 / 5) * 5; v <= x0 + size; v += 5) {
  const p = (v - x0) * k, strong = v % 10 === 0;
  parts.push(`<line x1="${p}" y1="0" x2="${p}" y2="${size * k}" stroke="${strong ? '#e0301e' : '#f4a79d'}" stroke-width="${strong ? 1 : 0.5}"/>`);
  if (v % 20 === 0) parts.push(`<text x="${p + 2}" y="12" font-size="11" fill="#1f4fd1">${v}</text>`);
}
for (let v = Math.ceil(y0 / 5) * 5; v <= y0 + size; v += 5) {
  const p = (v - y0) * k, strong = v % 10 === 0;
  parts.push(`<line x1="0" y1="${p}" x2="${size * k}" y2="${p}" stroke="${strong ? '#e0301e' : '#f4a79d'}" stroke-width="${strong ? 1 : 0.5}"/>`);
  if (v % 20 === 0) parts.push(`<text x="2" y="${p - 2}" font-size="11" fill="#1f4fd1">${v}</text>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size * k}" height="${size * k}">${parts.join('')}</svg>`;
writeFileSync(`${out}.svg`, svg);
execFileSync('magick', [`${out}.svg`, out]);
console.log(`${out}: scan x ${x0}..${x0 + size}, y ${y0}..${y0 + size}`);
