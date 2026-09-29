import type { DisplayList } from '../scene/types';

export interface PrinterOptions {
  /** Character columns across the plot, frame included (odd, so a column falls on x = 0). */
  plotColumns?: number;
  /** Printed row height over column width: 6 lines and 10 characters to the inch. */
  aspect?: number;
  title?: string;
  get?: string;
}

const LINE_WIDTH = 132, MARGIN = 7;
/** Characters a 1960s line printer could print (FIELDATA-style: upper case, digits, a few symbols). */
const safe = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 .,*+\-=()/:']/g, ' ');
const fixed = (v: number, w: number, d: number) => v.toFixed(d).padStart(w);

/**
 * The "crude printer-plot images" TN D-6853 says the program could print for a quick look before the microfilm
 * came back: the display list on a 132-column line printer. Lines and curves become dots, stars asterisks, discs
 * O's, names are printed beside their bodies, and the placed bodies are listed numerically underneath.
 */
export function printerPlot(dl: DisplayList, opts: PrinterOptions = {}): string {
  const W = opts.plotColumns ?? 101, aspect = opts.aspect ?? 10 / 6, e = dl.extentDeg;
  const H = Math.round((W - 1) / aspect) + 1;
  const grid = Array.from({ length: H }, () => Array<string>(W).fill(' '));
  const col = (x: number) => Math.round(((x + e) / (2 * e)) * (W - 1));
  const row = (y: number) => Math.round(((e - y) / (2 * e)) * (H - 1));
  const interior = (c: number, r: number) => c > 0 && c < W - 1 && r > 0 && r < H - 1;
  const put = (c: number, r: number, ch: string) => { if (interior(c, r)) grid[r]![c] = ch; };

  // Lines and curves first (lowest priority), stepped a quarter-cell at a time.
  for (const p of dl.primitives) {
    if (p.kind !== 'polyline') continue;
    const pts = p.closed ? [...p.points, p.points[0]!] : p.points;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]!, [x1, y1] = pts[i]!;
      const n = Math.max(1, Math.ceil(4 * Math.max(Math.abs(col(x1) - col(x0)), Math.abs(row(y1) - row(y0)))));
      for (let k = 0; k <= n; k++) put(col(x0 + ((x1 - x0) * k) / n), row(y0 + ((y1 - y0) * k) / n), '.');
    }
  }
  for (const p of dl.primitives) if (p.kind === 'disc') put(col(p.x), row(p.y), 'O');
  for (const p of dl.primitives) if (p.kind === 'dot') put(col(p.x), row(p.y), '.');
  for (const p of dl.primitives) if (p.kind === 'navMark') put(col(p.x), row(p.y), '*');
  for (const p of dl.primitives) {
    if (p.kind !== 'text' || Math.abs(p.x) > e || Math.abs(p.y) > e) continue;
    const t = safe(p.text), c0 = col(p.x) - (p.anchor === 'middle' ? Math.floor(t.length / 2) : p.anchor === 'end' ? t.length : 0);
    [...t].forEach((ch, i) => { if (ch !== ' ') put(c0 + i, row(p.y), ch); });
  }
  // The frame.
  for (let c = 0; c < W; c++) { grid[0]![c] = grid[H - 1]![c] = c === 0 || c === W - 1 ? '+' : '-'; }
  for (let r = 1; r < H - 1; r++) { grid[r]![0] = grid[r]![W - 1] = 'I'; }

  const out: string[] = [];
  out.push(safe(`VIEW PROGRAM PRINTER PLOT   ${opts.title ?? ''}`).trimEnd().padEnd(LINE_WIDTH - 16).slice(0, LINE_WIDTH - 16) + (opts.get ? `GET ${opts.get}`.padStart(16) : ''));
  out.push('');
  const labelEvery = Math.max(1, Math.round((H - 1) / 10));
  grid.forEach((cells, r) => {
    const y = e - (2 * e * r) / (H - 1);
    const label = r % labelEvery === 0 || r === H - 1 ? fixed(y, MARGIN - 1, 1) + ' ' : ' '.repeat(MARGIN);
    out.push((label + cells.join('')).trimEnd());
  });
  const axis = Array<string>(W + MARGIN + 6).fill(' ');
  const step = Math.max(1, Math.round((W - 1) / 10));
  for (let c = 0; c < W; c += step) {
    const s = fixed(-e + (2 * e * c) / (W - 1), 0, 1);
    [...s].forEach((ch, i) => { axis[MARGIN + c - Math.floor(s.length / 2) + i] = ch; });
  }
  out.push(axis.join('').trimEnd(), '');
  out.push(`${'BODY'.padEnd(16)}${'X, DEG'.padStart(10)}${'Y, DEG'.padStart(10)}`);
  for (const b of dl.placed) {
    if (Math.abs(b.x) > e || Math.abs(b.y) > e || (!b.label && b.kind === 'star')) continue;
    out.push(`${safe(b.label ?? b.id).padEnd(16)}${fixed(b.x, 10, 2)}${fixed(b.y, 10, 2)}`);
  }
  return out.map((l) => l.slice(0, LINE_WIDTH)).join('\n');
}
