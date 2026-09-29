import { describe, expect, it } from 'vitest';
import { printerPlot, type DisplayList } from '../src/index';

const dl: DisplayList = {
  extentDeg: 10,
  utc: new Date('1969-07-20T16:12:00Z'),
  primitives: [
    { kind: 'polyline', points: [[-10, -10], [10, -10], [10, 10], [-10, 10]], closed: true },
    { kind: 'dot', x: 0, y: 0 },
    { kind: 'navMark', x: 5, y: 5 },
    { kind: 'text', x: 5.5, y: 5, text: 'Vega', anchor: 'start', sizeDeg: 1, boxed: false, layer: 'machine' },
    { kind: 'polyline', points: [[-8, -8], [-2, -2]], closed: false },
  ],
  placed: [{ id: 'nav-1', label: 'Vega', kind: 'navStar', x: 5, y: 5, direction: [0, 0, 1] }],
  notes: [],
};
const opts = { plotColumns: 41, title: 'Test plot', get: '102:36:00' };
const out = printerPlot(dl, opts);
const lines = out.split('\n');
const plotRows = lines.filter((l) => /^ {0,6}[-+ 0-9.]*[I+]/.test(l));

describe('printerPlot (line-printer rendering)', () => {
  it('fits a 132-column printer and uses only upper-case FIELDATA-style characters', () => {
    for (const l of lines) {
      expect(l.length).toBeLessThanOrEqual(132);
      expect(l).toMatch(/^[A-Z0-9 .,*+\-=()/:'I]*$/);
    }
  });
  it('is deterministic', () => expect(printerPlot(dl, opts)).toBe(out));
  it('draws the frame, the dot at the centre and the star with its name', () => {
    const top = lines.findIndex((l) => l.includes('+---')), bottom = lines.findIndex((l, i) => i > top && l.includes('+---'));
    const rows = lines.slice(top, bottom + 1);
    const left = rows[0]!.indexOf('+'), right = rows[0]!.lastIndexOf('+');
    expect(right - left).toBe(40);
    const mid = rows[Math.round((rows.length - 1) / 2)]!;
    expect(mid[left + 20]).toBe('.');
    const starRow = rows.find((r) => r.includes('VEGA'))!;
    expect(starRow[left + 30]).toBe('*');
    expect(starRow.indexOf('VEGA')).toBeGreaterThan(left + 30);
    expect(plotRows.length).toBeGreaterThan(0);
  });
  it('rasterizes lines with dots between their ends', () => {
    const top = lines.findIndex((l) => l.includes('+---'));
    const rows = lines.slice(top);
    const left = rows[0]!.indexOf('+');
    const n = rows.findIndex((r, i) => i > 0 && r.includes('+---'));
    // (−5, −5) lies on the line: column 10 of 40 across, row at 3/4 of the way down.
    const r = Math.round(n * 0.75), c = left + 10;
    expect([rows[r]![c], rows[r - 1]![c], rows[r + 1]![c]]).toContain('.');
  });
  it('lists the placed bodies numerically below the plot', () => {
    expect(out).toMatch(/VEGA +5\.00 +5\.00/);
    expect(out).toContain('GET 102:36:00');
  });
});

describe('printerPlot of TN D-6853 Fig 3a (regression snapshot)', async () => {
  const { APOLLO_11, buildScene, FIG_3A_SPEC, resolveCatalog } = await import('../src/index');
  const bsc = (await import('../../../data/derived/bsc45.json')).default;
  const agc = (await import('../../../data/derived/agc37.json')).default;
  const rtcc = (await import('../../../data/derived/rtcc1970.json')).default;
  const stars = resolveCatalog(rtcc as never, bsc as never, agc as never, APOLLO_11.referenceEpochJd);
  it('matches the stored 132-column rendering', async () => {
    await expect(printerPlot(buildScene(FIG_3A_SPEC, { stars }), { title: 'Scanning telescope, rev 30', get: FIG_3A_SPEC.get }))
      .toMatchFileSnapshot('./__snapshots__/fig3a-printer.txt');
  });
});
