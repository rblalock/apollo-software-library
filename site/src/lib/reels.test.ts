import { describe, expect, it } from 'vitest';
import { REELS } from './reels';

describe('film reels', () => {
  it('offers the four reels, each a fixed number of frames', () => {
    expect(REELS.map((r) => r.id)).toEqual(['earth', 'moon', 'sct', 'lm']);
    for (const r of REELS) expect(r.frames).toBeGreaterThan(50);
  });
  it('steps the Earth reel three minutes a frame from 22:00 GET', () => {
    const earth = REELS.find((r) => r.id === 'earth')!;
    expect(earth.frame(0).caption).toContain('022:00:00');
    expect(earth.frame(1).caption).toContain('022:03:00');
    expect(earth.frame(earth.frames - 1).dl.primitives.length).toBeGreaterThan(50);
  });
  it('lets the lunar limb sweep through the telescope while the attitude is held', () => {
    const sct = REELS.find((r) => r.id === 'sct')!;
    const withLimb = Array.from({ length: sct.frames }, (_, i) => i).filter((i) =>
      sct.frame(i).dl.primitives.some((p) => p.kind === 'polyline' && !p.closed && p.points.length > 20));
    expect(withLimb.length).toBeGreaterThan(0);
    expect(withLimb.length).toBeLessThan(sct.frames);
  });
  it('turns the LM a full circle', () => {
    const lm = REELS.find((r) => r.id === 'lm')!;
    expect(lm.frame(0).caption).toMatch(/azimuth 0°/);
    expect(lm.frame(lm.frames - 1).caption).toMatch(/azimuth 357°/);
  });
});
