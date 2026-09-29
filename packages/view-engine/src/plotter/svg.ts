import type { DisplayList, Primitive } from '../scene/types';

export interface Underlay {
  href: string;
  widthPx: number;
  heightPx: number;
  /** Pixel positions of the scan's ±extent frame lines. */
  frame: { leftX: number; rightX: number; topY: number; bottomY: number };
  opacity: number;
  invert: boolean;
}

export interface PlotOptions {
  /** Recorder raster: 1024 (SC-4020 class) or 4096 (SC-4060 class). */
  grid?: 1024 | 4096;
  style?: 'microfilm' | 'print';
  labels?: boolean;
  underlay?: Underlay;
  showPrimitives?: boolean;
  title?: string;
}

const PALETTE = {
  microfilm: { bg: '#050505', ink: '#f1f0ea', accent: '#ff6a3d' },
  print: { bg: '#ffffff', ink: '#141414', accent: '#d9480f' },
} as const;

/** Plot degrees → recorder raster coordinates (integer, y down), as the CRT recorder addressed them. */
export function toGrid(x: number, y: number, extentDeg: number, grid: number): [number, number] {
  const s = (grid - 1) / (2 * extentDeg);
  return [Math.round((x + extentDeg) * s), Math.round((extentDeg - y) * s)];
}

const esc = (t: string): string =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderSvg(dl: DisplayList, opts: PlotOptions = {}): string {
  const grid = opts.grid ?? 1024;
  const c = PALETTE[opts.style ?? 'microfilm'];
  const labels = opts.labels ?? true;
  const e = dl.extentDeg;
  const s = (grid - 1) / (2 * e);
  const m = Math.round(grid * 0.16);
  const sw = (grid / 512).toFixed(2);
  const g = (x: number, y: number) => toGrid(x, y, e, grid);
  const parts: string[] = [`<rect x="${-m}" y="${-m}" width="${grid + 2 * m}" height="${grid + 2 * m}" fill="${c.bg}"/>`];

  if (opts.underlay) {
    const u = opts.underlay;
    const sx = (grid - 1) / (u.frame.rightX - u.frame.leftX);
    const sy = (grid - 1) / (u.frame.bottomY - u.frame.topY);
    parts.push(
      `<image href="${esc(u.href)}" x="${(-u.frame.leftX * sx).toFixed(2)}" y="${(-u.frame.topY * sy).toFixed(2)}" ` +
      `width="${(u.widthPx * sx).toFixed(2)}" height="${(u.heightPx * sy).toFixed(2)}" preserveAspectRatio="none" ` +
      `opacity="${u.opacity}"${u.invert ? ' style="filter:invert(1)"' : ''}/>`,
    );
  }

  const draw = (p: Primitive): string | null => {
    switch (p.kind) {
      case 'dot': {
        const [x, y] = g(p.x, p.y);
        return `<circle cx="${x}" cy="${y}" r="${(grid / 400).toFixed(2)}" fill="${c.ink}"/>`;
      }
      case 'navMark': {
        const [x, y] = g(p.x, p.y);
        const a = Math.round(grid / 110), d = Math.round(a * 0.7);
        return `<path d="M${x - a} ${y}H${x + a}M${x} ${y - a}V${y + a}M${x - d} ${y - d}L${x + d} ${y + d}M${x - d} ${y + d}L${x + d} ${y - d}" stroke="${c.ink}" stroke-width="${sw}"/>`;
      }
      case 'disc': {
        const [x, y] = g(p.x, p.y);
        const r = Math.max(2, Math.round(p.r * s));
        return p.filled
          ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.ink}"/>`
          : `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c.ink}" stroke-width="${sw}"/>`;
      }
      case 'polyline': {
        const pts = p.points.map(([px, py]) => g(px, py).join(',')).join(' ');
        const accent = p.tone === 'accent';
        return `<${p.closed ? 'polygon' : 'polyline'} points="${pts}" fill="none" stroke="${accent ? c.accent : c.ink}" stroke-width="${accent ? (grid / 300).toFixed(2) : sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
      case 'text': {
        if (p.layer === 'annotation' && !labels) return null;
        const [x, y] = g(p.x, p.y);
        const size = Math.max(6, Math.round(p.sizeDeg * s));
        const rot = p.rotate ? ` transform="rotate(${-p.rotate} ${x} ${y})"` : '';
        const t = `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${p.anchor}" dominant-baseline="middle" fill="${c.ink}"${rot}>${esc(p.text)}</text>`;
        if (!p.boxed) return t;
        const w = Math.round(size * 0.62 * p.text.length + size * 0.5);
        const x0 = p.anchor === 'start' ? x - size * 0.25 : p.anchor === 'end' ? x - w + size * 0.25 : x - w / 2;
        return `<rect x="${x0.toFixed(1)}" y="${(y - size * 0.7).toFixed(1)}" width="${w}" height="${(size * 1.4).toFixed(1)}" fill="none" stroke="${c.ink}" stroke-width="${sw}"/>${t}`;
      }
    }
  };

  if (opts.showPrimitives ?? true) for (const p of dl.primitives) { const el = draw(p); if (el) parts.push(el); }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${grid + 2 * m} ${grid + 2 * m}" role="img" aria-label="${esc(opts.title ?? 'View program plot')}" font-family="ui-monospace, 'DejaVu Sans Mono', monospace">${parts.join('')}</svg>`;
}
