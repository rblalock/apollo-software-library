import type { Mat3 } from '../math/mat';
import { besselianEpochToJd } from '../time/time';
import type { ViewSpec } from '../scene/types';

export const APOLLO_11 = {
  /** Range zero (T−0): 1969-07-16 13:32:00 UTC. */
  rangeZeroUtc: '1969-07-16T13:32:00Z',
  /** Basic reference frame: mean equator/equinox of B1970.0 (catalog epoch test, Task 3). */
  referenceEpochJd: besselianEpochToJd(1970),
  refsmmat: {
    /** 69-FM-197 Table II(e), PDF p. 38. Rows are the stable-member X, Y, Z axes in the reference frame. */
    lunarLiftoff: [
      [0.63482512, 0.71274759, 0.29830852],
      [0.00595964, -0.39058739, 0.92054658],
      [0.77263288, -0.58260827, -0.2522024],
    ] as Mat3,
  },
} as const;

/** TN D-6853 Figure 3a = 69-FM-197 Figure 9.3-8(a): SCT view, rev 30, 124:40:00 GET. */
export const FIG_3A_SPEC: ViewSpec = {
  rangeZeroUtc: APOLLO_11.rangeZeroUtc,
  get: '124:40:00',
  observer: 'moon',
  referenceEpochJd: APOLLO_11.referenceEpochJd,
  refsmmat: APOLLO_11.refsmmat.lunarLiftoff,
  gimbals: { inner: 49.1, middle: 0, outer: 0 },
  instrument: { kind: 'sct', shaftDeg: 0, trunnionDeg: 0 },
  extentDeg: 50,
  bodies: ['earth', 'sun', 'venus', 'mars', 'jupiter', 'saturn'],
  headerLeft: ['Lunar lift-off REFSMMAT'],
};

/** TN D-6853 Figure 3b = 69-FM-197 Figure 9.3-8(b): SCT view, rev 30, 125:00:00 GET. */
export const FIG_3B_SPEC: ViewSpec = { ...FIG_3A_SPEC, get: '125:00:00', gimbals: { inner: 17.86, middle: 0, outer: 0 } };

/** TN D-6853 Figure 3c = 69-FM-197 Figure 9.3-8(c): SCT view, rev 30, 125:15:00 GET. */
export const FIG_3C_SPEC: ViewSpec = { ...FIG_3A_SPEC, get: '125:15:00', gimbals: { inner: 89.1, middle: 0, outer: 0 } };

/**
 * Fig 3c with the inner gimbal's sign corrected (−89.10°). Both 69-FM-197 and TN D-6853 print I = +89.10°,
 * but a free fit of the figure's own stars implies I = −88.5°, M ≈ O ≈ 0 under the same REFSMMAT (3a and 3b's
 * printed angles are confirmed to 0.3° by the same fit). Not independent evidence: inferred from this figure.
 */
export const FIG_3C_SIGN_CORRECTED_SPEC: ViewSpec = { ...FIG_3C_SPEC, gimbals: { inner: -89.1, middle: 0, outer: 0 } };
