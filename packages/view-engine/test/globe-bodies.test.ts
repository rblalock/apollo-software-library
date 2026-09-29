import { describe, expect, it } from 'vitest';
import {
  angleBetween, APOLLO_11, bodyGlobeScene, createMissionEphemeris, cross, dot, getToUtc, globeProject, moonState, norm, parseGet,
  scale, sub, toDeg, unit, type EventTable,
} from '../src/index';
import events from '../../../data/manual/a11-events.json';

const eph = createMissionEphemeris(events as EventTable, APOLLO_11.rangeZeroUtc);
const at = (get: string) => ({ utc: getToUtc(APOLLO_11.rangeZeroUtc, get), csm: eph.state('csm', parseGet(get))! });

describe('bodyGlobeScene', () => {
  it('looks at the Earth’s centre with the spacecraft’s velocity projected to plot +y', () => {
    const { utc, csm } = at('23:00:00');
    const s = bodyGlobeScene('earth', utc, csm, 2);
    expect(toDeg(angleBetween(s.axes.ez, scale(csm.r, -1)))).toBeCloseTo(0, 9);
    const vPerp = sub(csm.v, scale(s.axes.ez, dot(csm.v, s.axes.ez)));
    expect(toDeg(angleBetween(s.axes.ey, vPerp))).toBeCloseTo(0, 9);
    expect(norm(s.sunDir)).toBeCloseTo(1, 12);
  });
  it('centres a Moon view on the Moon', () => {
    const { utc, csm } = at('70:00:00');
    const s = bodyGlobeScene('moon', utc, csm, 3);
    expect(toDeg(angleBetween(s.axes.ez, sub(moonState(utc).r, csm.r)))).toBeCloseTo(0, 9);
    expect(s.radiusKm).toBeCloseTo(1737.4, 6);
  });
});

describe('globeProject', () => {
  it('projects the sub-observer point to the disc centre and hides the far side', () => {
    const { utc, csm } = at('23:00:00');
    const s = bodyGlobeScene('earth', utc, csm, 2);
    // Body-fixed direction of the observer = the sub-spacecraft point.
    const o = unit(csm.r), fixed = [0, 1, 2].map((i) => dot([s.bodyFixedToInertial[0]![i]!, s.bodyFixedToInertial[1]![i]!, s.bodyFixedToInertial[2]![i]!], o));
    const lat = toDeg(Math.asin(fixed[2]!)), lon = toDeg(Math.atan2(fixed[1]!, fixed[0]!));
    const p = globeProject({ ...s, flattening: 0 }, lat, lon)!;
    expect(Math.hypot(p.x, p.y)).toBeLessThan(1e-9);
    expect(globeProject(s, -lat, lon + 180)).toBeNull();
    expect(norm(cross(o, o))).toBe(0);
  });
});
