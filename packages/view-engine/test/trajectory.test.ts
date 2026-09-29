import { describe, expect, it } from 'vitest';
import {
  earthEventToState, gmstRad, MU_EARTH_KM3S2, norm, propagate, stateToEarthEvent, toDeg, type EarthEvent, type State,
} from '../src/index';

describe('Greenwich mean sidereal time (IAU 1982)', () => {
  it('is 280.46061837° at J2000.0 (2000-01-01 12:00 UT1)', () => {
    expect(toDeg(gmstRad(new Date('2000-01-01T12:00:00Z')))).toBeCloseTo(280.46061837, 6);
  });
});

describe('Mission Report event rows ↔ inertial state', () => {
  it('round-trips latitude, longitude, altitude, speed, flight-path angle and heading', () => {
    const e: EarthEvent = { utc: new Date('1969-07-16T16:22:13.2Z'), latDeg: 9.98, lonDeg: -164.84, altNmi: 180.6, speedFps: 35546, fpaDeg: 7.37, headingDeg: 60.07 };
    const back = stateToEarthEvent(earthEventToState(e), e.utc);
    expect(back.latDeg).toBeCloseTo(e.latDeg, 6);
    expect(back.lonDeg).toBeCloseTo(e.lonDeg, 6);
    expect(back.altNmi).toBeCloseTo(e.altNmi, 3);
    expect(back.speedFps).toBeCloseTo(e.speedFps, 3);
    expect(back.fpaDeg).toBeCloseTo(e.fpaDeg, 6);
    expect(back.headingDeg).toBeCloseTo(e.headingDeg, 6);
  });
});

describe('propagate (Dormand–Prince 5(4), Cowell)', () => {
  it('returns a circular two-body orbit to its start after one period and conserves energy', () => {
    const r0 = 7000, v0 = Math.sqrt(MU_EARTH_KM3S2 / r0), period = 2 * Math.PI * Math.sqrt(r0 ** 3 / MU_EARTH_KM3S2);
    const s0: State = { r: [r0, 0, 0], v: [0, v0, 0] };
    const s1 = propagate(s0, new Date('1969-07-16T13:32:00Z'), period, { bodies: 'twoBody' });
    expect(norm([s1.r[0] - r0, s1.r[1], s1.r[2]])).toBeLessThan(0.001); // < 1 m
    const energy = (s: State) => norm(s.v) ** 2 / 2 - MU_EARTH_KM3S2 / norm(s.r);
    expect(Math.abs(energy(s1) - energy(s0))).toBeLessThan(1e-9);
  });
});
