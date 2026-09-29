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

/** A row whose OCR was unreadable: its HR number and the position read from the page image. */
export interface RtccOverride { hr: number; ra: string; dec: string; reason: string }

export interface ResolvedRtccRow {
  seq: number;
  hr: number;
  mag: number | null;
  /** The printed B1970 position (from OCR, or from the override's reading of the page image). */
  printedRaDeg: number;
  printedDecDeg: number;
  /** Separation between the printed position and the BSC star, degrees. Always verified ≤ tolDeg. */
  separationDeg: number;
  via: 'ocr' | 'override';
}

/** "h:mm:ss.s" → degrees. */
export function parseHms(s: string): number {
  const m = /^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(s.trim());
  if (!m) throw new Error(`bad RA "${s}"`);
  return (Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600) * 15;
}

/** "±d:mm:ss" → degrees. */
export function parseDms(s: string): number {
  const m = /^([+-])(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(s.trim());
  if (!m) throw new Error(`bad Dec "${s}"`);
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3]) / 60 + Number(m[4]) / 3600);
}

/**
 * Resolve every OCR row to a BSC star and verify it by position. Nav rows (navHr ≠ null) are pinned to
 * their Apollo star; overrides supply HR and position for unreadable rows. Nothing is accepted unchecked:
 * each failure names its row.
 */
export function resolveRtccRows(
  rows: RtccOcrRow[],
  opts: { stars: ReadonlyMap<number, Vec3>; navHr: (seq: number) => number | null; overrides: Readonly<Record<string, RtccOverride>>; tolDeg: number },
): { resolved: ResolvedRtccRow[]; failures: string[] } {
  const { stars, navHr, overrides, tolDeg } = opts;
  const candidates = [...stars].map(([hr, direction]) => ({ hr, direction }));
  const resolved: ResolvedRtccRow[] = [];
  const failures: string[] = [];
  const sepTo = (raDeg: number, decDeg: number, hr: number) => toDeg(angleBetween(radecToVec(raDeg, decDeg), stars.get(hr)!));

  for (const row of rows) {
    const override = overrides[String(row.seq)];
    if (override) {
      if (!stars.has(override.hr)) { failures.push(`row ${row.seq}: override HR ${override.hr} is not in the catalog`); continue; }
      const ra = parseHms(override.ra), dec = parseDms(override.dec);
      const sep = sepTo(ra, dec, override.hr);
      if (sep > tolDeg) { failures.push(`row ${row.seq}: override HR ${override.hr} is ${sep.toFixed(3)}° from its corrected printed position`); continue; }
      resolved.push({ seq: row.seq, hr: override.hr, mag: row.mag, printedRaDeg: ra, printedDecDeg: dec, separationDeg: sep, via: 'override' });
      continue;
    }
    const pinned = navHr(row.seq);
    if (pinned !== null) {
      if (!stars.has(pinned)) { failures.push(`row ${row.seq}: nav star HR ${pinned} is not in the catalog`); continue; }
      if (row.raDeg === null || row.decAbsDeg === null) {
        failures.push(`row ${row.seq}: nav star HR ${pinned} has an unreadable OCR position; add an override — "${row.line}"`);
        continue;
      }
      const signs = row.decSign === null ? [1, -1] : [row.decSign];
      const [sep, sign] = signs.map((s) => [sepTo(row.raDeg!, s * row.decAbsDeg!, pinned), s] as const).sort((a, b) => a[0] - b[0])[0]!;
      if (sep > tolDeg) { failures.push(`row ${row.seq}: nav star HR ${pinned} is ${sep.toFixed(3)}° from the printed position — "${row.line}"`); continue; }
      resolved.push({ seq: row.seq, hr: pinned, mag: row.mag, printedRaDeg: row.raDeg, printedDecDeg: sign * row.decAbsDeg, separationDeg: sep, via: 'ocr' });
      continue;
    }
    const m = matchRow(row, candidates, tolDeg);
    if (!m) { failures.push(`row ${row.seq}: no BSC match within ${tolDeg}°; add an override — "${row.line}"`); continue; }
    const sign = row.decSign ?? (sepTo(row.raDeg!, row.decAbsDeg!, m.hr) <= sepTo(row.raDeg!, -row.decAbsDeg!, m.hr) ? 1 : -1);
    resolved.push({ seq: row.seq, hr: m.hr, mag: row.mag, printedRaDeg: row.raDeg!, printedDecDeg: sign * row.decAbsDeg!, separationDeg: m.sepDeg, via: 'ocr' });
  }

  const hrs = resolved.map((r) => r.hr);
  const dupes = [...new Set(hrs.filter((h, i) => hrs.indexOf(h) !== i))];
  if (dupes.length) failures.push(`duplicate HR numbers: ${dupes.join(', ')}`);
  return { resolved, failures };
}
