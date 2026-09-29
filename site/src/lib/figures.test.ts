import { describe, expect, it } from 'vitest';
import { displaySpec, FIGURES, residuals } from './figures';

describe('display specs', () => {
  it('views the Fig 3 panels from the reconstructed CSM position, with the Moon', () => {
    const s = displaySpec(FIGURES.fig3b!);
    expect(s.observerPositionKm).toBeDefined();
    expect(s.bodies).toContain('moon');
  });
  it('follows the GET the reader enters', () => {
    const a = displaySpec(FIGURES.fig3b!), b = displaySpec(FIGURES.fig3b!, { get: '125:10:00' });
    expect(b.get).toBe('125:10:00');
    expect(b.observerPositionKm).not.toEqual(a.observerPositionKm);
  });
  it('falls back to the Moon-centre observer where no CSM state exists', () => {
    expect(displaySpec(FIGURES.fig3b!, { get: '200:00:00' }).observerPositionKm).toBeUndefined();
  });
  it('leaves the AOT panels at the Moon-centre observer', () => {
    expect(displaySpec(FIGURES.fig4a!).observerPositionKm).toBeUndefined();
  });
  it('keeps the validation residuals on the registered spec (Menkar is still measured)', () => {
    const menkar = residuals(FIGURES.fig3b!).rows.find((r) => r.id === 'Menkar')!;
    expect(Number.isFinite(menkar.dist)).toBe(true);
  });
});
