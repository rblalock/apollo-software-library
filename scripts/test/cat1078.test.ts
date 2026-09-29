import { describe, expect, it } from 'vitest';
import { groupRows, parseCat1078Row, type OcrWord } from '../lib/cat1078';

describe('parseCat1078Row (real OCR rows, 69-FM-107 Table I)', () => {
  it('reads seq, GC, RA and Dec from clean-ish rows', () => {
    const r = parseCat1078Row('404 12018 8+7030832¢0 8¢0 42+0 11e} =33+05944400 =33¢0 30 34.0 3e70 04 PyX')!;
    expect(r.seq).toBe(404);
    expect(r.gc).toBe(12018);
    expect(r.raHours).toBeCloseTo(8.7030832, 6);
    expect(r.decDeg).toBeCloseTo(-33.059444, 5);
  });
  it('handles names, positive declinations and "+" for the decimal point', () => {
    const r = parseCat1078Row('405 12022 ASELLUS-AUSTR, 8071163880 8.0 4240 4)e9 18+42841 6600 lee0 1740 3.0 4047 47 0 CNC')!;
    expect(r.gc).toBe(12022);
    expect(r.decDeg).toBeCloseTo(18.4284166, 5);
  });
  it('treats =, -, ~, « and “ as minus signs on the declination', () => {
    expect(parseCat1078Row('406 12050 8+71913870 8.0 430 89 ~42052166600 =4240 31,0 1840 412 0 VEL')!.decSign).toBe(-1);
    expect(parseCat1078Row('409 12097 8474536100 8.0 44.0 433 “l3e4i808870 <1340 25,0 8.0 ARl 12 HYA')!.decSign).toBe(-1);
  });
  it('reads RA below 1 hour, printed with no integer digit (".00275000" = 0h 0m 9.9s)', () => {
    const r = parseCat1078Row('1 33330 «00275000 ] ] 99 ~6e20861110 =40 1240 3140 466 30 119')!;
    expect(r.raCandidates.some((h) => Math.abs(h - 0.00275) < 1e-7)).toBe(true);
    const a = parseCat1078Row('“ 127 ALPHER,TZ SIRR,\\H v 10955555 v0 60 J4ey 28:89722100 2840 53,0 0,0 215 21 aND')!;
    expect(a.raCandidates.some((h) => Math.abs(h - 0.10955555) < 1e-7)).toBe(true);
  });
  it('also reads the sexagesimal h m s / d m s fields as independent candidates', () => {
    const r = parseCat1078Row('78 2742 2025377770 2.0 15+0 i3¢e 334604638000 3ye0 “i,0 11,0 4.07 ’ 6 TRl')!;
    // d m s: 34° 1' 11" (the decimal Dec field is garbled beyond use)
    expect(r.decCandidates.some((d) => Math.abs(d - (34 + 1 / 60 + 11 / 3600)) < 1e-6)).toBe(true);
    expect(r.raCandidates.some((h) => Math.abs(h - (2 + 15 / 60 + 13 / 3600)) < 1e-6)).toBe(true);
  });
  it('returns null for header and junk lines', () => {
    expect(parseCat1078Row('TABLZ |. - STAR IDENTIFICATION CATALOGUE - Continued')).toBeNull();
    expect(parseCat1078Row("‘lII |II| F | ‘IIII' ' | ‘IIII’ ‘llll)")).toBeNull();
  });
});

describe('groupRows', () => {
  it('groups OCR words into printer rows by their vertical position', () => {
    const w = (text: string, left: number, top: number): OcrWord => ({ text, left, top, height: 30 });
    const rows = groupRows([w('12018', 200, 101), w('404', 100, 100), w('405', 100, 162), w('12022', 200, 160)]);
    expect(rows).toEqual(['404 12018', '405 12022']);
  });
});
