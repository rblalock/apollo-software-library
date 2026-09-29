import { describe, expect, it } from 'vitest';
import { GLOBES, globeDisplay } from './globes';

describe('globe panels', () => {
  it('lists Figs 6a–d and 7a–b', () => {
    expect(Object.keys(GLOBES)).toEqual(['fig6a', 'fig6b', 'fig6c', 'fig6d', 'fig7a', 'fig7b']);
  });
  it('draws a panel with a frame, the limb and coastlines, and model header values', () => {
    const d = globeDisplay(GLOBES.fig6a!)!;
    expect(d.dl.primitives.filter((p) => p.kind === 'polyline').length).toBeGreaterThan(50);
    const header = d.dl.primitives.flatMap((p) => (p.kind === 'text' ? [p.text] : [])).join(' | ');
    expect(header).toMatch(/R_E = 101 5\d\d n\. mi\./);
    expect(header).toMatch(/Field of view = 4°/);
  });
  it('recomputes the spacecraft at the GET the reader enters, and refuses times outside the mission', () => {
    const a = globeDisplay(GLOBES.fig6a!)!, b = globeDisplay(GLOBES.fig6a!, '23:30:00')!;
    expect(b.dl.utc.getTime() - a.dl.utc.getTime()).toBe(30 * 60 * 1000);
    expect(globeDisplay(GLOBES.fig6a!, '0:01:00')).toBeNull();
  });
});
