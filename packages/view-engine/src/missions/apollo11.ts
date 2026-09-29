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
