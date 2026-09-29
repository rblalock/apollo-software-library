import { angleBetween, radecToVec, toDeg, type Vec3 } from '../../packages/view-engine/src/index';

export interface RtccOcrRow {
  seq: number;
  line: string;
  raDeg: number | null;
  decAbsDeg: number | null;
  decSign: 1 | -1 | null;
  mag: number | null;
}

// Characters tesseract substitutes for digits in this typewritten table.
const FIX: Record<string, string> = { k: '4', h: '4', L: '4', U: '4', b: '4', T: '7', O: '0', o: '0', l: '1', I: '1', S: '5', ',': '.' };
const D = '[0-9khLUbTOolIS]';
const RA_RE = new RegExp(`(?<![0-9:])(${D}{1,2}):(${D}{2}):(${D}{2})[.,](${D})(?![0-9])`);
const DEC_RE = new RegExp(`([+\\-~=]{0,2})\\s*(${D}{1,2}):(${D}{2}):(${D}{2})(?![0-9.,])`);
const MAG_RE = /(^|\s)(-?\d\.\d)(?=\s|$)/;
const ROW_HINT = /[0-9A-Za-z]{1,3}:[0-9A-Za-z]{2,3}:[0-9A-Za-z]{2,4}/;
const PLANET = /\b(Venus|Mars|Jupiter|Saturn)\b/;

const fix = (s: string): number => Number(s.replace(/[khLUbTOolIS,]/g, (c) => FIX[c]!));

export function parseRtccOcr(text: string): RtccOcrRow[] {
  const rows: RtccOcrRow[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.startsWith('===')) continue;
    if (/hr:min|deg:min/.test(line) || PLANET.test(line) || !ROW_HINT.test(line)) continue;
    const ra = RA_RE.exec(line);
    const afterRa = ra ? line.slice(ra.index + ra[0].length) : line;
    const dec = DEC_RE.exec(afterRa);
    const raDeg = ra ? (fix(ra[1]!) + fix(ra[2]!) / 60 + (fix(ra[3]!) + fix(ra[4]!) / 10) / 3600) * 15 : null;
    const decAbsDeg = dec ? fix(dec[2]!) + fix(dec[3]!) / 60 + fix(dec[4]!) / 3600 : null;
    const sign = dec?.[1] ?? '';
    const decSign: 1 | -1 | null = /[-~]/.test(sign) ? -1 : sign.includes('+') ? 1 : null;
    const afterDec = dec ? afterRa.slice(dec.index + dec[0].length) : '';
    const mag = MAG_RE.exec(afterDec);
    rows.push({
      seq: rows.length + 1,
      line: line.trim(),
      raDeg: raDeg !== null && Number.isFinite(raDeg) && raDeg < 360 ? raDeg : null,
      decAbsDeg: decAbsDeg !== null && Number.isFinite(decAbsDeg) && decAbsDeg <= 90 ? decAbsDeg : null,
      decSign,
      mag: mag ? Number(mag[2]) : null,
    });
  }
  return rows;
}

/** Nearest candidate within `tolDeg` of the row's printed B1970 position. An unknown sign tries both. */
export function matchRow(
  row: RtccOcrRow,
  candidates: ReadonlyArray<{ hr: number; direction: Vec3 }>,
  tolDeg: number,
): { hr: number; sepDeg: number } | null {
  if (row.raDeg === null || row.decAbsDeg === null) return null;
  const signs = row.decSign === null ? [1, -1] : [row.decSign];
  let best: { hr: number; sepDeg: number } | null = null;
  for (const s of signs) {
    const v = radecToVec(row.raDeg, s * row.decAbsDeg);
    for (const c of candidates) {
      const sepDeg = toDeg(angleBetween(v, c.direction));
      if (sepDeg <= tolDeg && (!best || sepDeg < best.sepDeg)) best = { hr: c.hr, sepDeg };
    }
  }
  return best;
}
