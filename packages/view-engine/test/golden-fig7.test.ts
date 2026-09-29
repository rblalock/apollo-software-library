import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, bodyGlobeScene, createMissionEphemeris, dot, getToUtc, globeGeometry, parseGet, toDeg, type EventTable,
} from '../src/index';
import events from '../../../data/manual/a11-events.json';
import g7a from '../../../data/derived/fig7a-globe.json';
import g7b from '../../../data/derived/fig7b-globe.json';

// Pre-registered (ledger "Item 2"): disc and terminator within 2% of the diameter, features within 3%, observer at
// the printed GET. MISSED (ledger "Item 2.5"): at the printed GETs the Moon is 20% (7a) and 73% (7b) larger than
// drawn, and almost fully dark (phase 175–176°) where the plots show a lit crescent (~120–130°). 7a's disc matches
// the model at 68:39 (h_M 20 696 stat. mi, printed 20 876); 7b is drawn at 7a's distance. Terminator and feature
// comparisons are not meaningful at these misfits and are not run. Recorded, not tuned.
const eph = createMissionEphemeris(events as EventTable, APOLLO_11.rangeZeroUtc);
const model = (get: string) => {
  const t = parseGet(get), s = bodyGlobeScene('moon', getToUtc(APOLLO_11.rangeZeroUtc, t), eph.state('csm', t)!, 3);
  return { r: globeGeometry(s).radiusDeg, phase: toDeg(Math.acos(-dot(s.sunDir, s.axes.ez))) };
};

describe('golden: TN D-6853 Fig 7 (Moon, translunar coast)', () => {
  it.each([['fig7a', g7a, 20.1, 175.0], ['fig7b', g7b, 72.5, 176.4]] as const)('%s: records the model at the printed GET (regression guard)', (id, g, pct, phase) => {
    const m = model(g.get);
    const dD = (m.r - g.limb.rDeg) / g.limb.rDeg;
    console.log(`${id} @ ${g.get}: model disc ${(2 * m.r).toFixed(3)}° vs scan ${(2 * g.limb.rDeg).toFixed(3)}° (${(100 * dD).toFixed(1)}%), phase ${m.phase.toFixed(1)}°`);
    expect(100 * dD).toBeCloseTo(pct, 0);
    expect(m.phase).toBeCloseTo(phase, 0);
  });
  it('7a’s disc matches the model near 68:39 GET (analysis, not a fit of the golden)', () => {
    expect(Math.abs(model('68:39:00').r - g7a.limb.rDeg) / g7a.limb.rDeg).toBeLessThan(0.005);
  });
  it.skip.each(['fig7a', 'fig7b'])('%s: disc, terminator and features within 2%/2%/3% — MISSED, see ledger: Item 2.5', () => {});
});
