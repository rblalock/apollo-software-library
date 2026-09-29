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

describe('CM window views (Figs 1–2)', () => {
  it('are seen from the spacecraft at the printed altitude, attitude fitted from their stars', () => {
    const s = FIGURES.fig1!.spec;
    expect(s.instrument.kind).toBe('fixed');
    expect(s.observerPositionKm).toBeDefined();
    expect(s.get.startsWith('02:49:5')).toBe(true);
  });
  it('lands the labelled stars within 1° and shows the Sun off by the recorded 3.5°', () => {
    const rows = residuals(FIGURES.fig1!).rows;
    for (const id of ['Capella', 'Mirfak', 'Dnoces', 'Sirius', 'Rigel', 'Procyon', 'Aldebaran']) expect(rows.find((r) => r.id === id)!.dist, id).toBeLessThan(1);
    expect(rows.find((r) => r.id === 'Sun')!.dist).toBeGreaterThan(3);
  });
});

describe('what a residuals table may claim', async () => {
  const { verdict } = await import('./figures');
  const good = { rmsDeg: 0.3, maxDeg: 0.6 };
  it('states acceptance only for predictions', () => {
    expect(verdict(FIGURES.fig3b!, good)).toMatch(/met/);
    expect(verdict(FIGURES.fig4c!, { rmsDeg: 1.9, maxDeg: 3 })).toMatch(/not met/);
  });
  it.each(['fig1', 'fig2', 'fig4a', 'pdiA', 'pdiP'])('%s: attitude fitted to the scored stars, so no acceptance claim', (id) => {
    const v = verdict(FIGURES[id]!, good);
    expect(v).toMatch(/fitted/);
    expect(v).not.toMatch(/\bmet\b/);
  });
  it('flags the calibration and consistency figures', () => {
    expect(verdict(FIGURES.fig3a!, good)).toMatch(/calibration/);
    expect(verdict(FIGURES.fig3c!, good)).toMatch(/consistency/);
  });
  it('names each scan’s own source and year', () => {
    expect(FIGURES.pdiA!.scanLabel).toMatch(/69-FM-197.*1969/);
    expect(FIGURES.fig3a!.scanLabel).toMatch(/TN D-6853.*1972/);
  });
});
