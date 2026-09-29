import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, buildScene, FIG_3B_SPEC, FIG_3C_SIGN_CORRECTED_SPEC, FIG_3C_SPEC, resolveCatalog,
  type Agc37File, type BscFile, type RtccFile, type ViewSpec,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import scan3b from '../../../data/derived/fig3b-points.json';
import scan3c from '../../../data/derived/fig3c-points.json';

// Thresholds fixed before digitizing (roadmap spec, item 1).
const RMS_MAX_DEG = 1.0;
const WORST_MAX_DEG = 2.0;

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

type ScanPoints = { points: Array<{ id: string; actually?: string; xDeg: number; yDeg: number }> };

function residuals(spec: ViewSpec, scan: ScanPoints, measureExtentDeg = 60) {
  // Geometry is measured without the ±50° display clip: the 1969 plotter drew glyphs whose centers lie up to
  // ~1° beyond the frame (3b's Navi), so a body the model puts at 51.5° is a geometry question, not a clip one.
  const dl = buildScene({ ...spec, extentDeg: measureExtentDeg }, { stars });
  const rows = scan.points.map((p) => {
    // A glyph whose published label is wrong is matched to the body it actually is (see its `note`).
    const b = dl.placed.find((q) => q.label === (p.actually ?? p.id));
    if (!b) throw new Error(`${p.id} is labeled on the 1972 figure but not placed by the recreation`);
    return { id: p.id, dist: Math.hypot(b.x - p.xDeg, b.y - p.yDeg), dx: b.x - p.xDeg, dy: b.y - p.yDeg };
  });
  return { rows, rms: Math.sqrt(rows.reduce((s, r) => s + r.dist ** 2, 0) / rows.length), worst: Math.max(...rows.map((r) => r.dist)) };
}

describe.each([
  ['3b (125:00:00, I = 17.86° as printed)', FIG_3B_SPEC, scan3b, 8],
  ['3c (125:15:00, I = −89.10°: printed sign corrected — a hypothesis check, inferred from this figure)', FIG_3C_SIGN_CORRECTED_SPEC, scan3c, 10],
] as const)('golden: TN D-6853 Figure %s — zero-parameter prediction', (_name, spec, scan, count) => {
  const r = residuals(spec, scan);
  it('places every labeled body', () => expect(r.rows).toHaveLength(count));
  it(`matches the 1972 scan (RMS ≤ ${RMS_MAX_DEG}°, max ≤ ${WORST_MAX_DEG}°)`, () => {
    console.table(r.rows.map((x) => ({ id: x.id, dx: +x.dx.toFixed(2), dy: +x.dy.toFixed(2), dist: +x.dist.toFixed(2) })));
    console.log(`RMS ${r.rms.toFixed(3)}°, max ${r.worst.toFixed(3)}°`);
    expect(r.rms).toBeLessThanOrEqual(RMS_MAX_DEG);
    expect(r.worst).toBeLessThanOrEqual(WORST_MAX_DEG);
  });
});

describe('finding: Fig 3c as printed (I = +89.10°) does not reproduce its own figure', () => {
  it('misses by more than 30° RMS, while the sign-corrected angle passes (see the ledger, item 1.3)', () => {
    const printed = residuals(FIG_3C_SPEC, scan3c as ScanPoints, 180);
    console.log(`as printed: RMS ${printed.rms.toFixed(1)}°`);
    expect(printed.rms).toBeGreaterThan(30);
  });
});
