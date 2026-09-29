import { describe, expect, it } from 'vitest';
import { angleBetween, bodyAngularRadiusDeg, bodyVectorJ2000Au, toDeg, type Vec3 } from '../src/index';

const UTC = new Date('1969-07-21T18:12:00Z');
const HORIZONS: Record<'venus' | 'saturn' | 'earth', Vec3> = {
  venus: [2.294332371183719e-1, 8.827887108280559e-1, 3.382552768284664e-1],
  saturn: [7.319349368960145, 5.512238946720605, 1.957172503593507],
  earth: [2.414323712589589e-3, 7.668968790654035e-4, 4.472040422950781e-4],
};

describe('ephemeris (astronomy-engine vs JPL Horizons)', () => {
  for (const body of ['venus', 'saturn', 'earth'] as const) {
    it(`${body} direction from the Moon agrees within 0.01°`, () => {
      expect(toDeg(angleBetween(bodyVectorJ2000Au(body, 'moon', UTC), HORIZONS[body]))).toBeLessThan(0.01);
    });
  }
  it('Earth seen from the Moon is ~0.95° in radius', () => {
    expect(bodyAngularRadiusDeg('earth', 'moon', UTC)).toBeCloseTo(0.95, 1);
  });
  it('an observer cannot look at itself', () => {
    expect(() => bodyAngularRadiusDeg('moon', 'moon', UTC)).toThrow(/cannot view itself/);
  });
});
