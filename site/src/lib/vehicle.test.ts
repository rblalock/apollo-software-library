import { describe, expect, it } from 'vitest';
import { cross, dot, norm, sub, unit } from '@asl/view-engine';
import { orbitCamera, VEHICLES } from './vehicle';

describe('orbitCamera', () => {
  const base = { distance: 20, target: [3, 0, 0] as const, extentDeg: 14 };
  it('puts azimuth 0 in front (+Z) and azimuth 90 on the right (+Y), level with the target', () => {
    const front = orbitCamera({ ...base, azDeg: 0, elDeg: 0 }), right = orbitCamera({ ...base, azDeg: 90, elDeg: 0 });
    expect(front.eye[2]).toBeCloseTo(20, 9);
    expect(right.eye[1]).toBeCloseTo(20, 9);
    expect(front.eye[0]).toBeCloseTo(3, 9);
  });
  it('keeps the up vector usable looking straight down', () => {
    const c = orbitCamera({ ...base, azDeg: 30, elDeg: 90 });
    expect(norm(cross(unit(sub(c.target, c.eye)), c.up))).toBeGreaterThan(0.5);
  });
  it('stays at the requested distance', () => {
    const c = orbitCamera({ ...base, azDeg: 123, elDeg: -40 });
    expect(norm(sub(c.eye, c.target))).toBeCloseTo(20, 9);
    expect(Math.abs(dot(unit(sub(c.target, c.eye)), [1, 0, 0]))).toBeCloseTo(Math.sin((40 * Math.PI) / 180), 9);
  });
});

describe('vehicle list', () => {
  it('offers the full LM, the ascent stage alone and the S-IVB', () => {
    expect(Object.keys(VEHICLES)).toEqual(['lm', 'lmAscent', 'sivb']);
    expect(VEHICLES.lmAscent.parts.every((p) => p.group === 'ascent')).toBe(true);
  });
});
