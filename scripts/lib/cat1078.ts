/** Parsing the line-printer "Star identification catalogue" (69-FM-107 Table I) from tesseract output. */

export interface OcrWord { text: string; left: number; top: number; height: number }

/** Group OCR words into printer rows by vertical position, each row read left to right. */
export function groupRows(words: OcrWord[]): string[] {
  const sorted = [...words].sort((a, b) => a.top - b.top);
  const rows: OcrWord[][] = [];
  for (const w of sorted) {
    const last = rows.at(-1);
    if (last && Math.abs(w.top - last[0]!.top) < 0.6 * Math.max(w.height, last[0]!.height)) last.push(w);
    else rows.push([w]);
  }
  return rows.map((r) => r.sort((a, b) => a.left - b.left).map((w) => w.text).join(' '));
}

export interface Cat1078Row {
  seq: number | null;
  gc: number | null;
  line: string;
  /** Best-guess decimal RA (hours) and signed Dec (degrees), plus alternative readings for matching. */
  raHours: number | null;
  decDeg: number | null;
  decSign: 1 | -1 | null;
  raCandidates: number[];
  decCandidates: number[];
  mag: number | null;
}

const DIGIT: Record<string, string> = {
  o: '0', O: '0', Q: '0', D: '0', l: '1', I: '1', i: '1', '|': '1', '!': '1', ']': '1', Z: '2', z: '2',
  S: '5', s: '5', $: '5', '§': '5', B: '8', b: '4', h: '4', k: '4', L: '4', y: '4', Y: '4', T: '7', g: '9', q: '9', G: '6',
};
const toDigits = (s: string) => [...s].map((c) => (/\d/.test(c) ? c : DIGIT[c] ?? '')).join('');
const MINUS = /^[-=~«<“*]/;

/** Candidate decimal values from an OCR'd "dd.dddddddd" field whose point may be misread or missing. */
function decimalCandidates(token: string, intDigits: number[]): number[] {
  const out = new Set<number>();
  const body = token.replace(MINUS, '');
  // (1) an explicit separator (any non-digit-looking char) after 1–2 leading digits
  const m = /^([0-9oOlIZSB]{1,2})([^0-9oOlIZSB])(.*)$/.exec(body);
  if (m) {
    const frac = toDigits(m[3]!).slice(0, 8);
    if (frac.length >= 6) out.add(Number(toDigits(m[1]!)) + Number(frac) / 10 ** frac.length);
  }
  // (2) no usable separator: the point was read as a digit, or dropped
  const d = toDigits(body);
  for (const n of intDigits) {
    if (d.length >= n + 7) {
      out.add(Number(d.slice(0, n)) + Number(d.slice(n + 1, n + 9)) / 10 ** Math.min(8, d.length - n - 1)); // point read as a digit
      out.add(Number(d.slice(0, n)) + Number(d.slice(n, n + 8)) / 10 ** Math.min(8, d.length - n)); // point dropped
    }
  }
  // (3) values below 1 are printed with no integer digit (".00275000"): 8 fraction digits, possibly after a
  // point misread as a digit.
  if (d.length === 8) out.add(Number(d) / 1e8);
  if (d.length === 9) out.add(Number(d.slice(1)) / 1e8);
  return [...out].filter(Number.isFinite);
}

/** "8.0 42.0 11.1"-style h m s (or d m s) fields, each printed as a float; null unless all three read. */
function sexagesimal(parts: string[]): number | null {
  if (parts.length < 3) return null;
  const digitLike = (c: string | undefined) => c !== undefined && (/\d/.test(c) || c in DIGIT);
  const num = (t: string, maxInt: number) => {
    // 1–2 digit-like chars, then optionally a separator and a tenths digit (trailing noise tolerated).
    let n = 0;
    while (n < t.length && n < 2 && digitLike(t[n])) n++;
    if (n === 0 || (n < t.length && digitLike(t[n]))) return null;
    const tenths = digitLike(t[n + 1]) ? Number(toDigits(t[n + 1]!)) / 10 : 0;
    const v = Number(toDigits(t.slice(0, n))) + tenths;
    return v <= maxInt ? v : null;
  };
  const a = num(parts[0]!, 90), b = num(parts[1]!, 59), c = num(parts[2]!, 59.9);
  return a === null || b === null || c === null || !Number.isInteger(b) ? null : Math.trunc(a) + b / 60 + c / 3600;
}

export function parseCat1078Row(line: string): Cat1078Row | null {
  const tokens = line.trim().split(/\s+/);
  // Long numeric-looking tokens (≥ 7 digit-like chars) are the decimal RA and Dec fields; a following
  // all-digit fragment is glued on when the OCR split the field.
  const longIdx: number[] = [];
  const realDigits = (t: string) => (t.match(/\d/g) ?? []).length;
  for (let i = 0; i < tokens.length; i++) {
    if (toDigits(tokens[i]!.replace(MINUS, '')).length >= 7 && realDigits(tokens[i]!) >= 4) longIdx.push(i);
  }
  const lead = tokens.slice(0, 2).map((t) => toDigits(t));
  const seq = /^\d{1,4}$/.test(lead[0] ?? '') ? Number(lead[0]) : null;
  const gc = /^\d{3,5}$/.test(lead[1] ?? '') ? Number(lead[1]) : null;
  const raIdx = longIdx.find((i) => i >= 1 && toDigits(tokens[i]!).length <= 12 && !(i === 1 && gc !== null));
  if (raIdx === undefined) return null;
  const decIdx = longIdx.find((i) => i > raIdx);
  const glued = (i: number) => (tokens[i + 1] && /^\d{2,6}$/.test(tokens[i + 1]!) && toDigits(tokens[i]!.replace(MINUS, '')).length < 10 ? tokens[i]! + tokens[i + 1]! : tokens[i]!);
  const raCandidates = decimalCandidates(tokens[raIdx]!, [1, 2]).filter((h) => h >= 0 && h < 24);
  const hms = sexagesimal(tokens.slice(raIdx + 1, raIdx + 4));
  if (hms !== null && hms < 24) raCandidates.push(hms);
  const decToken = decIdx === undefined ? null : glued(decIdx);
  const dmsTokens = decIdx === undefined ? [] : tokens.slice(decIdx + 1, decIdx + 4);
  const decSign: 1 | -1 | null = decToken === null ? null
    : MINUS.test(decToken) || MINUS.test(dmsTokens[0] ?? '') ? -1
    : /^[0-9oOlIZSB+]/.test(decToken) ? 1 : null;
  const decAbs = decToken === null ? [] : decimalCandidates(decToken, [1, 2]).filter((v) => v <= 90);
  const dms = sexagesimal(dmsTokens.map((t) => t.replace(MINUS, '').replace(MINUS, '')));
  if (dms !== null && dms <= 90) decAbs.push(dms);
  const signs = decSign === null ? [1, -1] : [decSign];
  const decCandidates = decAbs.flatMap((v) => signs.map((s) => s * v));
  const tail = decIdx === undefined ? [] : tokens.slice(decIdx + 4);
  const magTok = tail.find((t) => /^-?\d[.,e+]\d{1,2}$/.test(t));
  return {
    seq, gc, line: line.trim(),
    raHours: raCandidates[0] ?? null,
    decDeg: decCandidates[0] ?? null,
    decSign,
    raCandidates, decCandidates,
    mag: magTok ? Number(magTok.replace(/[,e+]/, '.')) : null,
  };
}
