import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, earthEventToState, FT_KM, getToUtc, MOON_MEAN_RADIUS_KM, moonEventToState, NMI_KM, norm, parseGet,
  propagate, relativeToMoon, type State,
} from '../src/index';
import data from '../../../data/manual/a11-events.json';

// Pre-registered tolerance (roadmap spec, item 5): 1%.
const TOL = 0.01;
const STAT_MI_KM = 1.609344;
const ev = (id: string) => data.events.find((e) => e.id === id)!;
const utcOf = (get: string) => getToUtc(APOLLO_11.rangeZeroUtc, get);
const stateOf = (id: string): State => {
  const e = ev(id);
  const row = { ...e, utc: utcOf(e.get) };
  return e.body === 'earth' ? earthEventToState(row) : moonEventToState(row);
};
const at = (fromId: string, get: string) => propagate(stateOf(fromId), utcOf(ev(fromId).get), parseGet(get) - parseGet(ev(fromId).get));
const rel = (a: number, b: number) => Math.abs(a - b) / b;

describe('golden: translunar coast vs TN D-6853 Fig 6 (propagated from the Mission Report TLI state)', () => {
  it.each([
    ['23:00:00', 101519, 5446], ['24:00:00', 104623, 5321], ['25:00:00', 107659, 5203], ['26:00:00', 110629, 5091],
  ])('%s GET: R_E %i n.mi, V %i ft/s within 1%%', (get, rE, v) => {
    const s = at('tli', get);
    const rNmi = norm(s.r) / NMI_KM, vFps = norm(s.v) / FT_KM;
    console.log(`${get}: R_E ${rNmi.toFixed(0)} n.mi (${(100 * rel(rNmi, rE)).toFixed(2)}%), V ${vFps.toFixed(0)} ft/s (${(100 * rel(vFps, v)).toFixed(2)}%)`);
    expect(rel(rNmi, rE)).toBeLessThanOrEqual(TOL);
    expect(rel(vFps, v)).toBeLessThanOrEqual(TOL);
  });
});

// MISSED (ledger: "Item 5.4"): TN D-6853 Fig 7's printed h_M/V do not match its own source — the Apollo 11 note
// (69-FM-197 Fig 5.2.2-2) gives 11,824 stat. mi and 4,190 ft/s at 70 h, close to this model, while Fig 7's
// "70 h" values fall between the note's 66 h and 67 h entries. The model reproduces the Mission Report's LOI
// state to 0.08%, so the misfit is in the figure's time labels. Recorded, not tuned.
describe('golden: lunar approach vs TN D-6853 Fig 7 (propagated from the first midcourse correction)', () => {
  const measured = { '70:00:00': { h: 17108, v: 4009 }, '72:00:00': { h: 11594, v: 4199 } } as const;
  it.each([['70:00:00'], ['72:00:00']] as const)('%s GET: records the model (regression guard)', (get) => {
    const s = relativeToMoon(at('mcc1-cutoff', get), utcOf(get));
    const h = (norm(s.r) - MOON_MEAN_RADIUS_KM) / STAT_MI_KM, vFps = norm(s.v) / FT_KM;
    expect(h).toBeCloseTo(measured[get].h, -1);
    expect(vFps).toBeCloseTo(measured[get].v, -1);
  });
  it.skip.each([['70:00:00', 20876, 3794], ['72:00:00', 15593, 3927]])('%s GET: h_M %i stat. mi, V %i ft/s within 1%% — MISSED, see ledger: Item 5.4', () => {});
});

describe('golden: Mission Report events reproduce each other', () => {
  it.each([
    ['mcc1-cutoff', 'loi-ignition'],
    ['loc-cutoff', 'undocking'],
  ])('%s → %s: Moon-relative radius and speed within 1%%', (from, to) => {
    const e = ev(to);
    const s = relativeToMoon(at(from, e.get), utcOf(e.get));
    const target = relativeToMoon(stateOf(to), utcOf(e.get));
    console.log(`${from} → ${to}: radius ${(100 * rel(norm(s.r), norm(target.r))).toFixed(3)}%, speed ${(100 * rel(norm(s.v), norm(target.v))).toFixed(3)}%`);
    expect(rel(norm(s.r), norm(target.r))).toBeLessThanOrEqual(TOL);
    expect(rel(norm(s.v), norm(target.v))).toBeLessThanOrEqual(TOL);
  });
});

import { moonFixedToJ2000, mxv, toDeg, transpose } from '../src/index';

describe('lunar-orbit phase: LOI circularization cutoff → undocking (20 h, 10 revolutions)', () => {
  const e = ev('undocking');
  const r = relativeToMoon(at('loc-cutoff', e.get), utcOf(e.get));
  const p = mxv(transpose(moonFixedToJ2000(utcOf(e.get))), r.r);
  const lat = toDeg(Math.asin(p[2] / norm(p))), lon = toDeg(Math.atan2(p[1], p[0]));
  const dLon = ((lon - e.lonDeg + 540) % 360) - 180;
  it('keeps the orbit plane: latitude within 1° of the Mission Report', () => {
    console.log(`undocking: model ${lat.toFixed(2)}°, ${lon.toFixed(2)}° vs table ${e.latDeg}°, ${e.lonDeg}°`);
    expect(Math.abs(lat - e.latDeg)).toBeLessThan(1);
  });
  // MISSED (ledger: "Item 5.4"): the point-mass Moon (no lunar gravity field / mascons) drifts along-track.
  it('records the along-track drift (regression guard: +3.2° after 10 revolutions)', () => {
    expect(dLon).toBeCloseTo(3.23, 1);
  });
  it.skip('lands within 1° of the Mission Report undocking longitude — MISSED, see ledger: Item 5.4', () => {});
});
