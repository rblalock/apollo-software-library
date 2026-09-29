/** Minimal ESRI shapefile (.shp) and dBASE (.dbf) readers: points, polylines and polygons; C/N/F fields. */

export interface ShpRecord { type: number; parts: [number, number][][] }

export function parseShp(bytes: Uint8Array): ShpRecord[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (v.getInt32(0, false) !== 9994) throw new Error('not a shapefile (file code ≠ 9994)');
  const end = v.getInt32(24, false) * 2;
  const out: ShpRecord[] = [];
  for (let o = 100; o + 8 <= end;) {
    const len = v.getInt32(o + 4, false) * 2, c = o + 8;
    const type = v.getInt32(c, true);
    if (type === 1) out.push({ type, parts: [[[v.getFloat64(c + 4, true), v.getFloat64(c + 12, true)]]] });
    else if (type === 3 || type === 5) {
      const nParts = v.getInt32(c + 36, true), nPts = v.getInt32(c + 40, true);
      const starts = Array.from({ length: nParts }, (_, i) => v.getInt32(c + 44 + 4 * i, true));
      const p0 = c + 44 + 4 * nParts;
      const pt = (i: number): [number, number] => [v.getFloat64(p0 + 16 * i, true), v.getFloat64(p0 + 16 * i + 8, true)];
      out.push({ type, parts: starts.map((s, i) => Array.from({ length: (starts[i + 1] ?? nPts) - s }, (_, k) => pt(s + k))) });
    } else if (type !== 0) throw new Error(`unsupported shape type ${type}`);
    o = c + len;
  }
  return out;
}

export function parseDbf(bytes: Uint8Array, encoding = 'latin1'): Record<string, string | number>[] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = v.getUint32(4, true), hdr = v.getUint16(8, true), recLen = v.getUint16(10, true);
  const text = (o: number, len: number, enc = 'latin1') => new TextDecoder(enc).decode(bytes.subarray(o, o + len));
  const fields: { name: string; type: string; len: number; off: number }[] = [];
  for (let o = 32, off = 1; bytes[o] !== 0x0d; o += 32) {
    const name = text(o, 11).replace(/\0.*$/s, ''), len = bytes[o + 16]!;
    fields.push({ name, type: String.fromCharCode(bytes[o + 11]!), len, off });
    off += len;
  }
  return Array.from({ length: n }, (_, r) => {
    const o = hdr + r * recLen;
    const rec: Record<string, string | number> = {};
    for (const f of fields) {
      const raw = text(o + f.off, f.len, encoding).trim();
      rec[f.name] = f.type === 'N' || f.type === 'F' ? (raw === '' ? Number.NaN : Number(raw)) : raw;
    }
    return rec;
  });
}
