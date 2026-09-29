import { describe, expect, it } from 'vitest';
import { renderSvg, toGrid, type DisplayList } from '../src/index';

const dl: DisplayList = {
  extentDeg: 50,
  utc: new Date('1969-07-21T18:12:00Z'),
  placed: [],
  notes: [],
  primitives: [
    { kind: 'polyline', points: [[-50, -50], [50, -50], [50, 50], [-50, 50]], closed: true },
    { kind: 'dot', x: 10, y: 10 },
    { kind: 'navMark', x: -20, y: 5 },
    { kind: 'disc', x: 0, y: -23, r: 0.95, filled: true },
    { kind: 'text', x: 0, y: -53, text: '0', anchor: 'middle', sizeDeg: 2.4, boxed: false, layer: 'machine' },
    { kind: 'text', x: -18, y: 3, text: 'Sirius & <Co>', anchor: 'start', sizeDeg: 2.4, boxed: true, layer: 'annotation' },
    { kind: 'polyline', points: [[0, 0], [5, 5]], closed: false, tone: 'accent' },
  ],
};

describe('toGrid', () => {
  it('maps the ±50° frame onto 0..grid−1 with y down', () => {
    expect(toGrid(-50, 50, 50, 1024)).toEqual([0, 0]);
    expect(toGrid(50, -50, 50, 1024)).toEqual([1023, 1023]);
    expect(toGrid(0, 0, 50, 4096)).toEqual([2048, 2048]);
  });
});

describe('renderSvg', () => {
  it('draws microfilm (white on black) and print (black on white)', () => {
    expect(renderSvg(dl, { style: 'microfilm' })).toContain('fill="#050505"');
    expect(renderSvg(dl, { style: 'print' })).toContain('fill="#ffffff"');
  });
  it('shows annotation text only when labels are on, and always shows machine text', () => {
    expect(renderSvg(dl, { labels: false })).not.toContain('Sirius');
    const on = renderSvg(dl, { labels: true });
    expect(on).toContain('Sirius &amp; &lt;Co&gt;');
    expect(renderSvg(dl, { labels: false })).toContain('>0</text>');
  });
  it('places an underlay so the scan frame lands on the plot frame', () => {
    const svg = renderSvg(dl, {
      underlay: { href: '/scans/x.png', widthPx: 1200, heightPx: 1100, frame: { leftX: 100, rightX: 1123, topY: 50, bottomY: 1073 }, opacity: 0.5, invert: true },
    });
    expect(svg).toContain('<image href="/scans/x.png" x="-100.00" y="-50.00" width="1200.00" height="1100.00"');
    expect(svg).toContain('filter:invert(1)');
  });
  it('can hide the recreation (original-only mode) and never emits NaN', () => {
    expect(renderSvg(dl, { showPrimitives: false })).not.toContain('<circle');
    expect(renderSvg(dl)).not.toContain('NaN');
  });
});
