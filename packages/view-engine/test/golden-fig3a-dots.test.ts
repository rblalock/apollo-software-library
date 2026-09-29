import { describe, expect, it } from 'vitest';
import { APOLLO_11, buildScene, FIG_3A_SPEC, resolveCatalog, type Agc37File, type BscFile, type RtccFile } from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import scan from '../../../data/derived/fig3a-points.json';

const TOL_DEG = 1.0;

/**
 * Recreated stars whose scan dot is present but not separable as a round blob, each confirmed by eye on a
 * 3× crop of the scan (the model position sits on the dot in every case).
 */
const EXCLUSIONS: Record<string, string> = {
  'rtcc-49': "Orion's belt: three touching dots merge into one blob",
  'rtcc-50': "Orion's belt: three touching dots merge into one blob",
  'rtcc-66': 'dot touches the SCT circle',
  'rtcc-89': 'double-struck (elongated) dot',
  'rtcc-90': "dot touches the '-40' reticle label",
  'rtcc-92': 'dot touches the SCT circle',
  'rtcc-93': 'double-struck (elongated) dot',
};

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
const dl = buildScene(FIG_3A_SPEC, { stars });
const nearest = (x: number, y: number, pts: ReadonlyArray<{ x: number; y: number }>) =>
  Math.min(...pts.map((p) => Math.hypot(p.x - x, p.y - y)));
const dots = scan.dots.map((d) => ({ x: d.xDeg, y: d.yDeg }));

describe('golden: Fig 3a unlabeled stars vs the plotter dots on the 1972 scan', () => {
  const unlabeled = dl.placed.filter((b) => b.kind === 'star');

  it('every recreated unlabeled star has a scan dot within 1°, apart from the confirmed exclusions', () => {
    const unmatched = unlabeled.filter((s) => nearest(s.x, s.y, dots) > TOL_DEG).map((s) => s.id).sort();
    expect(unmatched).toEqual(Object.keys(EXCLUSIONS).sort());
    expect(unlabeled.length - unmatched.length).toBeGreaterThanOrEqual(20);
  });

  it('every round dot on the scan has a recreated star within 1°', () => {
    const everything = dl.placed.map((b) => ({ x: b.x, y: b.y }));
    const worst = Math.max(...dots.map((d) => nearest(d.x, d.y, everything)));
    console.log(`${dots.length} scan dots; worst dot→star ${worst.toFixed(2)}°`);
    expect(dots.length).toBeGreaterThanOrEqual(20);
    expect(worst).toBeLessThanOrEqual(TOL_DEG);
  });
});
