import type { Mat3 } from '../math/mat';
import { besselianEpochToJd } from '../time/time';
import type { ViewSpec } from '../scene/types';
import { AOT_DETENTS, type AotDetent } from '../frames/aot';

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
    /** 69-FM-197 Table II(c), PDF p. 38 (read from the page image). */
    landingSite: [
      [0.7800517, 0.5765539, 0.24311512],
      [0.00374215, -0.39283134, 0.91960294],
      [0.62570309, -0.71642806, -0.3085863],
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

/**
 * TN D-6853 Fig 4 = 69-FM-197 Fig 10.0-2: AOT views "2 hours after lunar landing". Planned touchdown =
 * PDI 102:35:40 + 692 s burn (69-FM-197 Table I) = 102:47:12, so 104:47:12 GET.
 */
export const FIG_4_GET = '104:47:12';

/**
 * LM surface attitude (reference → LM body), fitted on TN D-6853 Fig 4(a) only (test/fig4-attitude.test.ts):
 * fit RMS 0.34°, +X 1.4° from the site vertical, +Z heading 269.3°. Panels (b)–(f) are predicted from it.
 */
export const FIG_4_LM_BODY_FROM_REF: Mat3 = [
  [0.78584447, 0.56898518, 0.24228976],
  [-0.00125511, -0.39031751, 0.92067946],
  [0.6184229, -0.72381497, -0.30601472],
];

/** TN D-6853 Fig 4 panel for an AOT detent: the LM on the surface, 2 h after landing, attitude frozen from panel (a). */
export function fig4Spec(detent: AotDetent): ViewSpec {
  return {
    ...FIG_3A_SPEC,
    get: FIG_4_GET,
    instrument: { kind: 'aot', detentDeg: AOT_DETENTS[detent], lmBodyFromRef: FIG_4_LM_BODY_FROM_REF },
    headerLeft: [],
  };
}
