import { describe, expect, it } from 'vitest';
import { parseDbf, parseShp } from '../lib/shapefile';
import { simplifyLine } from '../lib/simplify';

/** A minimal .shp with one polygon record of two parts (shape type 5). */
function shpPolygon(parts: [number, number][][]): Uint8Array {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const content = 4 + 32 + 4 + 4 + 4 * parts.length + 16 * n;
  const buf = new ArrayBuffer(100 + 8 + content), v = new DataView(buf);
  v.setInt32(0, 9994, false); v.setInt32(24, (100 + 8 + content) / 2, false); v.setInt32(28, 1000, true); v.setInt32(32, 5, true);
  v.setInt32(100, 1, false); v.setInt32(104, content / 2, false);
  let o = 108;
  v.setInt32(o, 5, true); o += 4 + 32;
  v.setInt32(o, parts.length, true); v.setInt32(o + 4, n, true); o += 8;
  let start = 0;
  for (const p of parts) { v.setInt32(o, start, true); o += 4; start += p.length; }
  for (const p of parts) for (const [x, y] of p) { v.setFloat64(o, x, true); v.setFloat64(o + 8, y, true); o += 16; }
  return new Uint8Array(buf);
}

/** A minimal .dbf with a character field NAME (10) and a numeric field DIAM (8). */
function dbf(rows: [string, number][]): Uint8Array {
  const recLen = 1 + 10 + 8, hdr = 32 + 2 * 32 + 1;
  const buf = new Uint8Array(hdr + rows.length * recLen + 1), v = new DataView(buf.buffer);
  buf[0] = 3; v.setUint32(4, rows.length, true); v.setUint16(8, hdr, true); v.setUint16(10, recLen, true);
  const field = (i: number, name: string, type: string, len: number) => {
    const o = 32 + 32 * i;
    for (let k = 0; k < name.length; k++) buf[o + k] = name.charCodeAt(k);
    buf[o + 11] = type.charCodeAt(0); buf[o + 16] = len;
  };
  field(0, 'NAME', 'C', 10); field(1, 'DIAM', 'N', 8);
  buf[hdr - 1] = 0x0d;
  rows.forEach(([name, d], r) => {
    const o = hdr + r * recLen;
    buf[o] = 0x20;
    const text = name.padEnd(10) + String(d).padStart(8);
    for (let k = 0; k < text.length; k++) buf[o + 1 + k] = text.charCodeAt(k);
  });
  buf[buf.length - 1] = 0x1a;
  return buf;
}

describe('shapefile reader', () => {
  it('reads polygon parts as coordinate rings', () => {
    const rec = parseShp(shpPolygon([[[0, 0], [1, 0], [1, 1], [0, 0]], [[5, 5], [6, 5], [5, 6], [5, 5]]]));
    expect(rec).toHaveLength(1);
    expect(rec[0]!.type).toBe(5);
    expect(rec[0]!.parts).toEqual([[[0, 0], [1, 0], [1, 1], [0, 0]], [[5, 5], [6, 5], [5, 6], [5, 5]]]);
  });
  it('reads dBASE records by field name, trimmed and typed', () => {
    expect(parseDbf(dbf([['Copernicus', 96.07], ['Tycho', 85.29]]))).toEqual([{ NAME: 'Copernicus', DIAM: 96.07 }, { NAME: 'Tycho', DIAM: 85.29 }]);
  });
});

describe('simplifyLine (Douglas–Peucker)', () => {
  it('drops points within tolerance and keeps the ends and corners', () => {
    const line: [number, number][] = [[0, 0], [1, 0.01], [2, -0.01], [3, 0], [3, 1], [3, 2]];
    expect(simplifyLine(line, 0.05)).toEqual([[0, 0], [3, 0], [3, 2]]);
  });
  it('keeps a closed ring closed', () => {
    const ring: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const s = simplifyLine(ring, 0.1);
    expect(s[0]).toEqual(s.at(-1));
    expect(s.length).toBeGreaterThanOrEqual(4);
  });
});

describe('derived geodata (data/derived, from scripts/fetch-geodata.ts)', async () => {
  const coast = (await import('../../data/derived/earth-coastline.json')).default as { lines: [number, number][][] };
  const moon = (await import('../../data/derived/moon-features.json')).default as { craters: { name: string; lat: number; lon: number; diamKm: number }[]; areas: { name: string; lat: number; lon: number }[] };
  const maria = (await import('../../data/derived/moon-maria.json')).default as { outlines: { name: string; ring: [number, number][] }[] };
  const inside = (p: [number, number], ring: [number, number][]) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  it('has Africa’s southern tip (Cape Agulhas, 34.8° S 20.0° E) within 1°', () => {
    expect(coast.lines.flat().some(([lon, lat]) => Math.hypot(lon - 20.0, lat + 34.83) < 1)).toBe(true);
  });
  it('has Copernicus (9.6° N 20.1° W, 96 km) and Archimedes', () => {
    const c = moon.craters.find((x) => x.name === 'Copernicus')!;
    expect(c.lat).toBeCloseTo(9.6, 0);
    expect(c.lon).toBeCloseTo(-20.1, 0);
    expect(c.diamKm).toBeGreaterThan(90);
    expect(moon.craters.some((x) => x.name === 'Archimedes')).toBe(true);
  });
  it('outlines Mare Serenitatis around its IAU centre', () => {
    const centre = moon.areas.find((a) => a.name === 'Mare Serenitatis')!;
    expect(maria.outlines.filter((o) => o.name === 'Mare Serenitatis').some((o) => inside([centre.lon, centre.lat], o.ring))).toBe(true);
  });
});

describe('fitCircle (robust)', async () => {
  const { fitCircle } = await import('../lib/circle');
  it('recovers a circle from noisy points despite outliers', () => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 200; i++) {
      const a = (2 * Math.PI * i) / 200, n = 0.01 * Math.sin(17 * i);
      pts.push([1.5 + (2 + n) * Math.cos(a), -0.5 + (2 + n) * Math.sin(a)]);
    }
    for (let i = 0; i < 30; i++) pts.push([1.5 + 0.3 * Math.cos(i), -0.5 + 0.3 * Math.sin(i)]); // ink inside the disc
    const c = fitCircle(pts);
    expect(c.cx).toBeCloseTo(1.5, 2);
    expect(c.cy).toBeCloseTo(-0.5, 2);
    expect(c.r).toBeCloseTo(2, 2);
    expect(c.used).toBeGreaterThanOrEqual(190);
  });
});
