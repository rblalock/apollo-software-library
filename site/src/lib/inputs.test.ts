import { describe, expect, it } from 'vitest';
import { parseAngleDraft } from './inputs';

const RANGE = { min: -360, max: 360 };

describe('parseAngleDraft', () => {
  it('accepts signed decimals exactly as typed', () => {
    expect(parseAngleDraft('-45', RANGE)).toEqual({ ok: true, value: -45 });
    expect(parseAngleDraft(' 49.1 ', RANGE)).toEqual({ ok: true, value: 49.1 });
    expect(parseAngleDraft('+90', RANGE)).toEqual({ ok: true, value: 90 });
    expect(parseAngleDraft('-90', RANGE)).toEqual({ ok: true, value: -90 });
  });
  it('rejects partial, empty and non-numeric drafts with a message', () => {
    for (const bad of ['', '-', '.', 'abc', '4 5', '1e3']) {
      const r = parseAngleDraft(bad, RANGE);
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/number/);
    }
  });
  it('rejects out-of-range values instead of rendering them', () => {
    const r = parseAngleDraft('4590', RANGE);
    expect(r).toEqual({ ok: false, error: 'Enter a number from -360 to 360' });
  });
});
