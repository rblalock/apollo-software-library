import { describe, expect, it } from 'vitest';
import {
  lmModel, LM_PRESS_KIT_M, sivbModel, SIVB_PRESS_KIT_M, validateConvex, visibleSegments, type ConvexPart, type VehicleModel,
} from '../src/index';

// Pre-registered: every dimension the 1969 Apollo 11 Press Kit gives is matched within 1%.
const TOL = 0.01;
const solids = (m: VehicleModel, pred: (p: ConvexPart) => boolean = () => true) =>
  m.parts.filter((p): p is ConvexPart => p.kind === 'solid' && pred(p));
const verts = (ps: ConvexPart[]) => ps.flatMap((p) => p.vertices);
const span = (ps: ConvexPart[], axis: 0 | 1 | 2) => {
  const xs = verts(ps).map((v) => v[axis]);
  return Math.max(...xs) - Math.min(...xs);
};
const radial = (ps: ConvexPart[]) => Math.max(...verts(ps).map((v) => Math.hypot(v[1], v[2])));
const rel = (a: number, b: number) => Math.abs(a - b) / b;

describe('LM model (Apollo 11 Press Kit, pp. 102–103)', () => {
  const lm = lmModel();
  const ascent = solids(lm, (p) => p.group === 'ascent'), descent = solids(lm, (p) => p.group === 'descent');

  it('every solid is closed, convex and outward-facing', () => {
    for (const p of solids(lm)) expect(validateConvex(p), p.name).toEqual([]);
  });
  it('stands 22 ft 11 in high', () => expect(rel(span(solids(lm), 0), LM_PRESS_KIT_M.height)).toBeLessThanOrEqual(TOL));
  it('is 31 ft wide diagonally across the landing gear', () => {
    const pads = solids(lm, (p) => p.name.startsWith('footpad'));
    expect(rel(span(pads, 2), LM_PRESS_KIT_M.gearSpan)).toBeLessThanOrEqual(TOL);
    expect(rel(span(pads, 1), LM_PRESS_KIT_M.gearSpan)).toBeLessThanOrEqual(TOL);
  });
  it('has a 12 ft 4 in ascent stage and a 10 ft 7 in descent stage', () => {
    expect(rel(span(ascent, 0), LM_PRESS_KIT_M.ascentHeight)).toBeLessThanOrEqual(TOL);
    expect(rel(span(descent, 0), LM_PRESS_KIT_M.descentHeight)).toBeLessThanOrEqual(TOL);
  });
  it('has 14 ft 1 in stage diameters (ascent across the RCS quads, descent across the stage structure)', () => {
    expect(rel(2 * radial(ascent), LM_PRESS_KIT_M.stageDiameter)).toBeLessThanOrEqual(TOL);
    expect(rel(2 * radial(solids(lm, (p) => p.name === 'descent-structure')), LM_PRESS_KIT_M.stageDiameter)).toBeLessThanOrEqual(TOL);
  });
  it('has a 92 in × 42 in crew compartment and 37 in footpads', () => {
    const cabin = solids(lm, (p) => p.name === 'crew-compartment');
    expect(span(cabin, 2)).toBeCloseTo(LM_PRESS_KIT_M.cabinDepth, 9);
    expect(rel(span(cabin, 1), LM_PRESS_KIT_M.cabinDiameter)).toBeLessThanOrEqual(TOL);
    expect(rel(span(solids(lm, (p) => p.name === 'footpad-aft'), 2), LM_PRESS_KIT_M.footpadDiameter)).toBeLessThanOrEqual(TOL);
  });
  it('puts the forward hatch, ladder and the one probe-less pad on +Z', () => {
    const wires = lm.parts.filter((p) => p.kind === 'wire');
    expect(wires.filter((p) => p.name.startsWith('probe')).map((p) => p.name).sort()).toEqual(['probe-aft', 'probe-left', 'probe-right']);
    const hatch = wires.find((p) => p.name === 'hatch')!;
    expect(hatch.kind === 'wire' && hatch.segments.every(([a, b]) => a[2] > 1 && b[2] > 1)).toBe(true);
  });
  it('removes hidden lines for the whole vehicle quickly', () => {
    const t0 = performance.now();
    const vis = visibleSegments(lm.parts, [12, 9, 15]);
    expect(performance.now() - t0).toBeLessThan(500);
    expect(vis.length).toBeGreaterThan(100);
  });
});

describe('S-IVB model (Apollo 11 Press Kit, part 2 p. 13; part 1 p. 94)', () => {
  const s = sivbModel();
  it('every solid is closed, convex and outward-facing', () => {
    for (const p of solids(s)) expect(validateConvex(p), p.name).toEqual([]);
  });
  it('is 58 ft 4 in long and 21 ft 8 in in diameter, with a 3 ft instrument unit', () => {
    const tank = solids(s, (p) => p.name === 'sivb');
    expect(rel(span(tank, 0), SIVB_PRESS_KIT_M.length)).toBeLessThanOrEqual(TOL);
    expect(rel(2 * radial(tank), SIVB_PRESS_KIT_M.diameter)).toBeLessThanOrEqual(TOL);
    expect(rel(span(solids(s, (p) => p.name === 'instrument-unit'), 0), SIVB_PRESS_KIT_M.iuHeight)).toBeLessThanOrEqual(TOL);
  });
  it('tapers the fixed SLA ring along the 28 ft, 260 in → 154 in adapter cone and leaves it open', () => {
    const ring = solids(s, (p) => p.name.startsWith('sla-ring'));
    expect(ring.length).toBeGreaterThan(8); // a shell of panels, so the LM inside stays visible from above
    const xs = verts(ring).map((v) => v[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const rAt = (x: number) => Math.max(...verts(ring).filter((v) => Math.abs(v[0] - x) < 1e-9).map((v) => Math.hypot(v[1], v[2])));
    const slope = (SIVB_PRESS_KIT_M.slaBaseDiameter - SIVB_PRESS_KIT_M.slaTopDiameter) / 2 / SIVB_PRESS_KIT_M.slaLength;
    expect(rel(rAt(x0), SIVB_PRESS_KIT_M.slaBaseDiameter / 2)).toBeLessThanOrEqual(TOL);
    expect(rel(rAt(x0) - rAt(x1), slope * (x1 - x0))).toBeLessThanOrEqual(TOL);
  });
});
