import type { Mat3 } from '../math/mat';
import { add, scale, sub, type Vec3 } from '../math/vec';
import { box, frustum, frustumBetween, prism, strut, transformPart, type ConvexPart, type Part, type WirePart } from './solids';

export interface VehicleModel {
  name: string;
  /** Solids and wires in the vehicle's body axes, metres. */
  parts: Part[];
  /** What is published (and where) versus estimated. */
  sources: string[];
}

const IN = 0.0254, FT = 0.3048;

/** Dimensions given in the Apollo 11 Press Kit (NASA Release 69-83K, July 1969), part 1 p. 102 and part 2 p. 3. */
export const LM_PRESS_KIT_M = {
  height: 22 * FT + 11 * IN,
  gearSpan: 31 * FT,
  ascentHeight: 12 * FT + 4 * IN,
  descentHeight: 10 * FT + 7 * IN,
  stageDiameter: 14 * FT + 1 * IN,
  cabinDiameter: 92 * IN,
  cabinDepth: 42 * IN,
  hatch: 32 * IN,
  footpadDiameter: 37 * IN,
  sBandDish: 26 * IN,
} as const;

/** Apollo 11 Press Kit part 2 p. 13 (S-IVB, instrument unit) and part 1 p. 94 (spacecraft-LM adapter). */
export const SIVB_PRESS_KIT_M = {
  length: 58 * FT + 4 * IN,
  diameter: 21 * FT + 8 * IN,
  iuHeight: 3 * FT,
  slaLength: 28 * FT,
  slaBaseDiameter: 260 * IN,
  slaTopDiameter: 154 * IN,
} as const;

/** Local +z → body +x (frustum/prism helpers build along z). */
const Z_TO_X: Mat3 = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];
const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const alongX = (p: ConvexPart, at: Vec3 = [0, 0, 0]) => transformPart(p, Z_TO_X, at);
const tag = <P extends Part>(group: string, parts: P[]): P[] => parts.map((p) => ({ ...p, group }));
const wire = (name: string, segments: [Vec3, Vec3][]): WirePart => ({ kind: 'wire', name, segments });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t));

/**
 * The Apollo LM (landing gear deployed) in LM body axes: +X up the thrust axis, +Z forward through the hatch,
 * +Y to the crew's right; origin on the thrust axis in the plane of the footpad soles.
 */
export function lmModel(): VehicleModel {
  const K = LM_PRESS_KIT_M;
  const HD = K.descentHeight, R = K.stageDiameter / 2;
  const deckBottom = HD - 1.65; // descent structure depth: estimated
  const flat = R * Math.cos(Math.PI / 8), halfFlat = R * Math.sin(Math.PI / 8);

  const descent: Part[] = [
    alongX(prism('descent-structure', 8, R, deckBottom, HD, Math.PI / 8)),
    frustumBetween('descent-engine-skirt', [deckBottom, 0, 0], [0.95, 0, 0], 0.55, 0.76, 16),
    box('porch', [HD - 0.08, -0.45, flat], [HD - 0.02, 0.45, flat + 0.6]),
  ];
  const padR = K.footpadDiameter / 2, padCenter = K.gearSpan / 2 - padR, padTop = 0.25;
  const legs: { name: string; u: Vec3; t: Vec3 }[] = [
    { name: 'forward', u: [0, 0, 1], t: [0, 1, 0] },
    { name: 'aft', u: [0, 0, -1], t: [0, 1, 0] },
    { name: 'right', u: [0, 1, 0], t: [0, 0, 1] },
    { name: 'left', u: [0, -1, 0], t: [0, 0, 1] },
  ];
  for (const { name, u, t } of legs) {
    const pad: Vec3 = scale(u, padCenter), top = add(pad, [padTop, 0, 0]);
    const knee = add([HD - 0.25, 0, 0], scale(u, flat));
    descent.push(alongX(prism(`footpad-${name}`, 12, padR, 0, padTop), pad));
    descent.push(strut(`primary-strut-${name}`, top, knee, 0.085, 8));
    const mid = lerp(top, knee, 0.3);
    for (const s of [-1, 1]) {
      const corner = add(add([deckBottom, 0, 0], scale(u, flat)), scale(t, s * halfFlat));
      descent.push(strut(`secondary-strut-${name}-${s > 0 ? 'a' : 'b'}`, corner, mid, 0.05));
    }
    if (name !== 'forward') descent.push(wire(`probe-${name}`, [[pad, add(pad, [-1.73, 0, 0])]]));
    else {
      const rail = (s: number) => [0.2, 0.95].map((f) => add(add(lerp(top, knee, f), scale(t, s * 0.22)), scale(u, 0.12))) as [Vec3, Vec3];
      const [l, r] = [rail(-1), rail(1)];
      const rungs = Array.from({ length: 9 }, (_, i) => [lerp(l[0], l[1], (i + 0.5) / 9), lerp(r[0], r[1], (i + 0.5) / 9)] as [Vec3, Vec3]);
      descent.push(wire('ladder', [l, r, ...rungs]));
    }
  }

  const cabinX = 4.45, cabinZ0 = 0.2, cabinZ1 = cabinZ0 + K.cabinDepth, top = HD + K.ascentHeight;
  const ascent: Part[] = [
    box('midsection', [HD, -1.1, -0.85], [5.85, 1.1, cabinZ0]),
    transformPart(prism('crew-compartment', 16, K.cabinDiameter / 2, cabinZ0, cabinZ1), IDENTITY, [cabinX, 0, 0]),
    box('aft-equipment-bay', [3.95, -1.0, -1.75], [5.35, 1.0, -0.85]),
    alongX(prism('docking-tunnel', 16, 0.45, 5.85, top), [0, 0, -0.3]),
    box('rendezvous-radar-mount', [5.55, -0.12, 0.6], [5.95, 0.12, 0.85]),
    frustumBetween('rendezvous-radar-dish', [6.1, 0, 0.85], [6.1, 0, 1.05], 0.05, 0.3),
    strut('s-band-boom', [5.6, 1.05, -0.5], [6.0, 1.45, -0.5], 0.04),
    frustumBetween('s-band-dish', [6.0, 1.45, -0.5], [6.18, 1.45, -0.5], 0.05, K.sBandDish / 2),
    wire('hatch', [
      [[3.47, -K.hatch / 2, cabinZ1], [3.47, K.hatch / 2, cabinZ1]], [[3.47, K.hatch / 2, cabinZ1], [3.47 + K.hatch, K.hatch / 2, cabinZ1]],
      [[3.47 + K.hatch, K.hatch / 2, cabinZ1], [3.47 + K.hatch, -K.hatch / 2, cabinZ1]], [[3.47 + K.hatch, -K.hatch / 2, cabinZ1], [3.47, -K.hatch / 2, cabinZ1]],
    ]),
    ...[-1, 1].map((s) => wire(`window-${s < 0 ? 'left' : 'right'}`, [
      [[4.7, s * 0.95, cabinZ1], [4.7, s * 0.2, cabinZ1]], [[4.7, s * 0.2, cabinZ1], [5.3, s * 0.2, cabinZ1]], [[5.3, s * 0.2, cabinZ1], [4.7, s * 0.95, cabinZ1]],
    ])),
    ...[-1, 1].map((s) => wire(`vhf-antenna-${s < 0 ? 'left' : 'right'}`, [[[5.35, s * 0.6, -1.6], [6.3, s * 0.9, -2.0]]])),
  ];
  // RCS quads on the four diagonals; each fires up, down, fore/aft and sideways.
  const q = 1.29, h = 0.13, qx = 5.05, len = 0.22;
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const n = `rcs-${sz > 0 ? 'fwd' : 'aft'}-${sy > 0 ? 'right' : 'left'}`, c: Vec3 = [qx, sy * q, sz * q];
    ascent.push(
      box(n, [qx - 0.2, c[1] - h, c[2] - h], [qx + 0.2, c[1] + h, c[2] + h]),
      strut(`${n}-boom`, [qx, sy * 1.0, sz * 0.5], c, 0.05),
      frustumBetween(`${n}-up`, [qx + 0.2, c[1], c[2]], [qx + 0.2 + len, c[1], c[2]], 0.035, 0.09),
      frustumBetween(`${n}-down`, [qx - 0.2, c[1], c[2]], [qx - 0.2 - len, c[1], c[2]], 0.035, 0.09),
      frustumBetween(`${n}-side`, [qx, c[1] + sy * h, c[2]], [qx, c[1] + sy * (h + len), c[2]], 0.035, 0.09),
      frustumBetween(`${n}-axial`, [qx, c[1], c[2] + sz * h], [qx, c[1], c[2] + sz * (h + len)], 0.035, 0.09),
    );
  }

  return {
    name: 'Lunar module (landing gear deployed)',
    parts: [...tag('descent', descent), ...tag('ascent', ascent)],
    sources: [
      'Published (Apollo 11 Press Kit, 1969): overall height 22 ft 11 in; 31 ft across the landing gear; ascent stage 12 ft 4 in × 14 ft 1 in; descent stage 10 ft 7 in × 14 ft 1 in; crew compartment 92 in × 42 in; 32 in square hatch; 37 in footpads; 26 in S-band dish; probes on every pad but the forward one.',
      'Estimated from photographs and drawings (shape only, not dimensioned in the press kit): descent-structure depth, engine skirt, strut attachment points, midsection and aft-bay boxes, tunnel diameter, RCS quad and antenna placement, window outlines, probe length.',
    ],
  };
}

/** One flat panel of a conical shell between azimuths a0 and a1 (convex; keeps the shell open). */
function shellPanel(name: string, x0: number, x1: number, r0: number, r1: number, a0: number, a1: number, t: number): ConvexPart {
  const p = (x: number, r: number, a: number): Vec3 => [x, r * Math.cos(a), r * Math.sin(a)];
  return {
    kind: 'solid', name,
    vertices: [p(x0, r0, a0), p(x0, r0, a1), p(x1, r1, a1), p(x1, r1, a0), p(x0, r0 - t, a0), p(x0, r0 - t, a1), p(x1, r1 - t, a1), p(x1, r1 - t, a0)],
    faces: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]],
  };
}

/**
 * The S-IVB after spacecraft separation: stage, instrument unit and the fixed lower ring of the spacecraft-LM
 * adapter (its four upper panels jettisoned). Stage axes: +X forward along the stage axis; origin at the aft end.
 */
export function sivbModel(): VehicleModel {
  const K = SIVB_PRESS_KIT_M, R = K.diameter / 2, ringH = 7 * FT;
  const x1 = K.length, x2 = x1 + K.iuHeight;
  const slope = (K.slaBaseDiameter - K.slaTopDiameter) / 2 / K.slaLength, r0 = K.slaBaseDiameter / 2;
  const parts: Part[] = [
    alongX(prism('sivb', 16, R, 0, x1)),
    alongX(prism('instrument-unit', 16, R, x1, x2)),
    alongX(frustum('j2-nozzle', 16, 0.98, 0.5, -3.38, 0)),
    ...Array.from({ length: 16 }, (_, i) => shellPanel(`sla-ring-${i}`, x2, x2 + ringH, r0, r0 - slope * ringH, (2 * Math.PI * i) / 16, (2 * Math.PI * (i + 1)) / 16, 0.05)),
  ];
  return {
    name: 'S-IVB with instrument unit and fixed SLA ring',
    parts,
    sources: [
      'Published (Apollo 11 Press Kit, 1969): S-IVB 58 ft 4 in × 21 ft 8 in; instrument unit 3 ft × 21 ft 8 in; spacecraft-LM adapter a 28 ft truncated cone from 260 in to 154 in.',
      'Estimated: the fixed SLA ring height (7 ft) and the J-2 nozzle (3.38 m long, 1.96 m exit). The LM inside the adapter (gear stowed) is not modelled.',
    ],
  };
}
