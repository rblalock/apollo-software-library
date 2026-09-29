import { describe, expect, it } from 'vitest';
import { matchRow, parseRtccOcr } from '../lib/rtcc';
import { radecToVec } from '../../packages/view-engine/src/index';

const OCR = [
  'no. designaticn and constellation@ Common name hr:min:sec deg:min:sec Magnitude',
  '1 ¢ And o  Andromedae Alpheratz 0:06:49.9 | +28:55:29 2.1',
  '2 B Cet 8 Ceti ‘| Diphda 0:42:05.0 | -18:09:0k 2.2',
  'N a Eri o Eridani | " ‘Acnernar 1:36:35.9 | ~57:23:20 , 0.6',
  "' - 104 ! k, Velorum e o L], 920100 | -5b:52:56 2.6",
  '< 1 Venus 4:52:16.98 20:01:45.2 w',
].join('\n');

describe('parseRtccOcr', () => {
  const rows = parseRtccOcr(OCR);
  it('numbers table rows in order and skips headers and planet rows', () => {
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4]);
  });
  it('parses RA, Dec and magnitude, fixing OCR digit confusions', () => {
    expect(rows[0]!.raDeg).toBeCloseTo((0 + 6 / 60 + 49.9 / 3600) * 15, 9);
    expect(rows[0]!.decAbsDeg).toBeCloseTo(28 + 55 / 60 + 29 / 3600, 9);
    expect(rows[0]!.decSign).toBe(1);
    expect(rows[0]!.mag).toBe(2.1);
    expect(rows[1]!.decAbsDeg).toBeCloseTo(18 + 9 / 60 + 4 / 3600, 9);
    expect(rows[1]!.decSign).toBe(-1);
    expect(rows[2]!.decSign).toBe(-1); // "~" is an OCR'd minus sign
  });
  it('leaves unparseable fields null instead of guessing', () => {
    expect(rows[3]!.raDeg).toBeNull();
    expect(rows[3]!.decAbsDeg).toBeCloseTo(54 + 52 / 60 + 56 / 3600, 9);
  });
});

describe('matchRow', () => {
  const candidates = [
    { hr: 15, direction: radecToVec((0 + 6 / 60 + 49.9 / 3600) * 15, 28 + 55 / 60 + 29 / 3600) },
    { hr: 999, direction: radecToVec(10, -28.9) },
  ];
  it('matches within tolerance, trying both signs when the sign is unknown', () => {
    const row = { seq: 1, line: '', raDeg: (0 + 6 / 60 + 49.9 / 3600) * 15, decAbsDeg: 28 + 55 / 60 + 29 / 3600, decSign: null, mag: null } as const;
    expect(matchRow(row, candidates, 0.05)!.hr).toBe(15);
  });
  it('returns null when nothing is within tolerance', () => {
    const row = { seq: 1, line: '', raDeg: 200, decAbsDeg: 10, decSign: 1, mag: null } as const;
    expect(matchRow(row, candidates, 0.05)).toBeNull();
  });
});

import { resolveRtccRows, type RtccOcrRow } from '../lib/rtcc';

describe('resolveRtccRows', () => {
  const pos = (ra: number, dec: number) => radecToVec(ra, dec);
  const stars = new Map([[15, pos(1.7, 28.9)], [188, pos(10.5, -18.2)], [911, pos(45.2, 4.0)], [1457, pos(68.6, 16.4)]]);
  const row = (seq: number, raDeg: number | null, decAbsDeg: number | null, decSign: 1 | -1 | null): RtccOcrRow =>
    ({ seq, line: `row ${seq} text`, raDeg, decAbsDeg, decSign, mag: 2 });
  const navHr = (seq: number) => ({ 1: 15, 2: 188 } as Record<number, number>)[seq] ?? null;

  it('verifies OCR rows, pinned nav rows and overrides, recording a separation for every row', () => {
    const { resolved, failures } = resolveRtccRows(
      [row(1, 1.7, 28.9, 1), row(2, 10.5, 18.2, null), row(3, null, null, null), row(4, 68.6, 16.4, 1)],
      { stars, navHr, tolDeg: 0.05, overrides: { '3': { hr: 911, ra: '3:00:48.0', dec: '+4:00:00', reason: 'test' } } },
    );
    expect(failures).toEqual([]);
    expect(resolved.map((r) => [r.seq, r.hr, r.via])).toEqual([[1, 15, 'ocr'], [2, 188, 'ocr'], [3, 911, 'override'], [4, 1457, 'ocr']]);
    for (const r of resolved) expect(r.separationDeg).toBeLessThanOrEqual(0.05);
    expect(resolved[1]!.printedDecDeg).toBeCloseTo(-18.2, 9); // unknown OCR sign resolved by the match
  });
  it('fails, naming the row, when a nav row has an unreadable position and no override', () => {
    const { failures } = resolveRtccRows([row(1, 1.7, null, null)], { stars, navHr, tolDeg: 0.05, overrides: {} });
    expect(failures).toEqual([expect.stringMatching(/^row 1: nav star HR 15 .*unreadable/)]);
  });
  it('fails, naming the row, when an override does not match its HR star', () => {
    const { failures } = resolveRtccRows([row(3, null, null, null)], {
      stars, navHr, tolDeg: 0.05, overrides: { '3': { hr: 911, ra: '9:00:00.0', dec: '+4:00:00', reason: 'wrong' } },
    });
    expect(failures).toEqual([expect.stringMatching(/^row 3: override HR 911 is .*° from its corrected printed position/)]);
  });
  it('fails, naming the row, when nothing matches and there is no override', () => {
    const { failures } = resolveRtccRows([row(9, 200, 10, 1)], { stars, navHr, tolDeg: 0.05, overrides: {} });
    expect(failures).toEqual([expect.stringMatching(/^row 9: no BSC match/)]);
  });
});
