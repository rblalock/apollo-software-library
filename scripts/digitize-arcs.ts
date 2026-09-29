/**
 * Trace printed curves (the Earth's horizon, the terminator) on a figure scan, without reference to any model.
 * Each arc in data/manual/figures/<id>.json `arcs` is followed column by column from a seed point: in each column
 * the dark run nearest the curve's extrapolated position (within `maxJumpPx`) is taken; runs much thicker than the
 * line (another stroke crossing it) are skipped, and the trace ends after `maxGap` columns without a run.
 * Writes data/derived/<id>-arcs.json.
 */
import { readFileSync } from 'node:fs';
import { findFrame, pxToDeg } from './lib/digitize';
import { loadFigureConfigs } from './lib/figures';
import { readGray } from './lib/png';
import { today, writeJson } from './lib/provenance';

interface ArcSpec {
  /** One seed, or several for a curve broken by other drawing (each is traced both ways; duplicate columns merge). */
  seed: [number, number] | [number, number][];
  xRange: [number, number];
  yRange: [number, number];
  maxJumpPx?: number;
  maxGap?: number;
  edge?: 'centre' | 'bottom';
  /** Among runs within the jump limit take the nearest (default) or the lowest (a double line's outer edge). */
  prefer?: 'nearest' | 'lowest';
}

const sources = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')) as Array<{ file: string; url: string; retrieved: string; sha256: string }>;
const DARK = 128;

for (const cfg of loadFigureConfigs(process.argv.slice(2))) {
  const arcs = (cfg as unknown as { arcs?: Record<string, ArcSpec> }).arcs;
  if (!arcs) continue;
  const img = readGray(`data/derived/scans/${cfg.scan}`);
  const frame = findFrame(img);
  const e = cfg.extentDeg;
  const col = (xDeg: number) => frame.leftX + ((xDeg + e) / (2 * e)) * (frame.rightX - frame.leftX);
  const row = (yDeg: number) => frame.topY + ((e - yDeg) / (2 * e)) * (frame.bottomY - frame.topY);
  const dark = (x: number, y: number) => img.data[y * img.width + x]! < DARK;
  const out: Record<string, { px: [number, number]; xDeg: number; yDeg: number }[]> = {};

  for (const [name, a] of Object.entries(arcs)) {
    const y0 = Math.round(row(a.yRange[1])), y1 = Math.round(row(a.yRange[0]));
    const runsAt = (x: number) => {
      const runs: { top: number; bottom: number }[] = [];
      for (let y = y0; y <= y1; y++) if (dark(x, y) && (y === y0 || !dark(x, y - 1))) { let b = y; while (b < y1 && dark(x, b + 1)) b++; runs.push({ top: y, bottom: b }); }
      return runs;
    };
    const jump = a.maxJumpPx ?? 4, maxGap = a.maxGap ?? 6;
    const seeds = (Array.isArray(a.seed[0]) ? a.seed : [a.seed]) as [number, number][];
    const byCol = new Map<number, number>();
    const thick: number[] = [];
    for (const seed of seeds) {
      const seedX = Math.round(col(seed[0])), seedY = row(seed[1]);
      for (const dir of [-1, 1]) {
        let prev = seedY, slope = 0, gap = 0;
        for (let x = seedX + (dir > 0 ? 1 : 0); x >= Math.ceil(col(a.xRange[0])) && x <= Math.floor(col(a.xRange[1])); x += dir) {
          const guess = prev + slope;
          const near = runsAt(x).map((r) => ({ r, c: a.edge === 'bottom' ? r.bottom : (r.top + r.bottom) / 2 })).filter(({ c }) => Math.abs(c - guess) <= jump);
          const pick = a.prefer === 'lowest' ? near.sort((p, q) => q.c - p.c)[0] : near.sort((p, q) => Math.abs(p.c - guess) - Math.abs(q.c - guess))[0];
          if (!pick) { if (++gap > maxGap) break; prev = guess; continue; }
          gap = 0;
          const w = pick.r.bottom - pick.r.top + 1;
          const typical = thick.length ? [...thick].sort((p, q) => p - q)[Math.floor(thick.length / 2)]! : w;
          // Another stroke merges here: coast through on the extrapolated curve, neither following nor recording it.
          if (w > 2 * typical + 1) { prev = guess; continue; }
          slope = 0.8 * slope + 0.2 * (pick.c - prev);
          prev = pick.c;
          thick.push(w);
          if (!byCol.has(x)) byCol.set(x, +pick.c.toFixed(2));
        }
      }
    }
    const pts = [...byCol].map(([x, y]) => ({ px: [x, y] as [number, number] }));
    out[name] = pts.sort((p, q) => p.px[0] - q.px[0]).map((p) => ({ px: p.px, ...pxToDeg(frame, p.px[0], p.px[1], e) }));
    console.log(`${cfg.id} ${name}: ${out[name]!.length} points, x ${out[name]![0]?.xDeg.toFixed(1)}…${out[name]!.at(-1)?.xDeg.toFixed(1)}°`);
  }

  const src = sources.find((s) => s.file === cfg.source.file)!;
  writeJson(`data/derived/${cfg.id}-arcs.json`, {
    provenance: {
      sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
      method: 'Curves traced column by column from a hand-placed seed (data/manual/figures), following the nearest dark run within a jump limit; through runs thicker than twice the line (crossing strokes) the trace coasts on its extrapolation without recording. Frame from its border lines.',
      script: 'scripts/digitize-arcs.ts',
      generated: today(),
    },
    frame,
    extentDeg: e,
    arcs: out,
  });
}
