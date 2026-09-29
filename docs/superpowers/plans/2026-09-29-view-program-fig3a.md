# View Program Fig 3a POC: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Apollo Software Library shell (Astro) and its first exhibit. The exhibit recomputes NASA TN D-6853 Figure 3a (Apollo 11 scanning-telescope view, 124:40:00 GET) from 1969 inputs and real star data, and shows the result against the 1972 scan with measured residuals.

**Architecture:** `packages/view-engine` is a framework-free TypeScript pipeline: `ViewSpec → scene (DisplayList) → SVG plotter`, plus a `fit` module for validation. Bun scripts turn primary sources (NASA PDFs, the Yale Bright Star Catalog, the Comanche055 AGC source) into `data/derived/*.json`, each file with a provenance block. An Astro site with React islands presents the library entry, the document pages and the Fig 3a exhibit.

**Tech Stack:** Bun 1.3 workspaces, TypeScript 5.9, Vitest 5, astronomy-engine 2.1, pngjs 7, Astro 7 with @astrojs/react 7, React 19, Tailwind 4 (`@tailwindcss/vite`). The system tools `pdftoppm` (poppler) and `tesseract` 5 are used by data scripts only.

**Spec:** `docs/superpowers/specs/2026-09-29-view-program-fig3a-design.md`

## Global Constraints

- The engine (`packages/view-engine/src`) imports no DOM, React, Astro, `fs` or JSON. Callers pass data in.
- Every file in `data/derived/*.json` carries `provenance: { sources: [{url, retrieved, sha256}], method, script, generated }`.
- Golden acceptance for Fig 3a: **RMS ≤ 1.0°, max ≤ 2.0°** over the labeled bodies.
- **Stop rule:** if the golden test misses its thresholds, stop and report the misfit with an analysis. Never tune inputs to force a pass.
- The view program's provenance badge is **tier 3, "Rebuilt from documents and output"**.
- The "View from a Spacecraft" film is linked (https://www.youtube.com/watch?v=O8Hv4R_kHn4), never re-hosted.
- Node ≥ 22.12 (Astro 7). The repo uses Bun as its package manager and script runner, and Vitest for tests.
- Angles in public APIs and data are in **degrees**; the internal math uses radians. Matrices are row-major `Mat3` (AGC and note convention).

## Facts established during planning (verified in scratch, 2026-09-29)

These refine the spec's "known unknowns" and are baked into the tasks:

1. **AGC star epoch.** Comanche055 `STAR_TABLES.agc` vectors match BSC5 positions *with proper motion* at the mean equator and equinox of **B1970.0**, with RMS 2.6″ and max 3.6″. The next-best epoch, B1969.75, is 10″ RMS. This matches the Apollo 11 note's "RTCC star catalogue for Besselian year 1970".
2. **AGC star order.** Stars 34–37 are **Peacock, Deneb, Enif, Fomalhaut** (HR 7790, 7924, 8308, 8728).
3. **Fig 3a's catalog is the note's own 148-star RTCC catalogue** (69-FM-197 PDF pp. 309–313). It replaces the spec's "BSC ≤ 4.5 stand-in" for Apollo 11 exhibits; BSC is still the position source. OCR works on those pages in their original orientation.
4. **SCT plot convention.** A zero-parameter chain reproduces Fig 3a when:
   - the boresight is the optics line of sight at **trunnion 0** (the shaft axis);
   - plot **+y is the direction of increasing trunnion**;
   - plot **+x = boresight × up**, which is the as-seen view.

   An SVD fit of hand-read positions recovered trunnion 1.1°, shaft 0.7° and RMS 2.56° (hand-reading error) without being told any of this.
5. **Gimbal order** (`CALCGA`): SM→NB = `rotX(outer)·rotZ(middle)·rotY(inner)`, with passive rotations. **Optics:** `NB1NB2` is a 32.523° rotation about Y, `v_NB = NB1NB2 · v_optics`.
6. **Ephemeris.** astronomy-engine agrees with JPL Horizons, Moon-centered at 1969-07-21T18:12Z, to about 4″ for Venus and Saturn and about 14″ for Earth.
7. **Precession.** IAU 1976 reproduces Meeus Example 21.b (θ Per → 2028 Nov 13.19) exactly: RA 2h46m11.331s, Dec +49°20′54.54″.
8. The Lunar lift-off REFSMMAT is orthonormal to 3.3e-8, which confirms the transcription.

## Review Focus

Inputs and failure modes the spec implies but no feature test would naturally hit. Each has a pinned test in the task named at the end of the line.

1. A malformed GET typed into "try it" (`abc`, `124:61:00`, empty) must raise a typed `InvalidGetError`, which the UI shows as a message, not a crash. *Task 2 test and Task 15 UI.*
2. Gimbal angles at or near gimbal lock (middle = ±90°) or extreme values must still render finite geometry with no `NaN` in the SVG. *Task 8 test.*
3. A direction at or near the antipode of the boresight (θ ≈ 180°) must project to finite coordinates and be clipped, not render garbage. *Task 5 test.*
4. A very large GET (`9999:00:00`) must still produce a render: the ephemeris and proper motion degrade gracefully. *Task 2 and Task 8 tests.*
5. OCR rows with garbled digits or signs must either match a BSC star within 0.05° or fail the build loudly, naming the row. They must never be silently accepted. *Task 4 test.*

## File Map

```
package.json, tsconfig.base.json, vitest.config.ts, .gitignore, README.md
packages/view-engine/
  package.json, tsconfig.json
  src/index.ts                     barrel
  src/math/vec.ts, src/math/mat.ts vectors, row-major matrices, passive rotations
  src/time/time.ts                 GET↔UTC, JD, Besselian epochs, InvalidGetError
  src/catalog/precession.ts        IAU 1976 precession matrix
  src/catalog/stars.ts             CatalogStar, radec↔vec, starDirection (PM + precession)
  src/catalog/resolve.ts           data-file types + resolveCatalog (RTCC + BSC + AGC → ResolvedStar[])
  src/frames/frames.ts             gimbals, CALCGA inverse, NB1NB2, optics LOS, SCT plot axes
  src/ephemeris/ephemeris.ts       body directions via astronomy-engine, precessed to epoch
  src/projection/projection.ts     azimuthal equidistant with explicit plot axes
  src/scene/types.ts, scene.ts     ViewSpec, Primitive, DisplayList, buildScene
  src/plotter/svg.ts               recorder-grid SVG renderer (microfilm / print), underlay
  src/fit/eigen.ts, fit/fit.ts     Jacobi eigen, q-method plot-axes fit, implied SCT angles
  src/missions/apollo11.ts         range zero, epoch, REFSMMAT, Fig 3a ViewSpec
  test/*.test.ts
scripts/
  lib/provenance.ts, lib/bsc.ts, lib/agc.ts, lib/rtcc.ts, lib/png.ts, lib/digitize.ts
  fetch-sources.ts, build-bsc.ts, build-agc-stars.ts, ocr-rtcc.ts, build-rtcc-catalog.ts,
  extract-figures.ts, digitize-fig3a.ts, sync-public.ts
  test/*.test.ts
data/
  sources/*.pdf + SOURCES.md
  manual/rtcc-overrides.json, manual/fig3a-names.json
  derived/bsc45.json, agc37.json, rtcc1970-ocr.txt, rtcc1970.json, fig3a-points.json, scans/tnd6853-fig3a.png
site/
  package.json, astro.config.mjs, tsconfig.json
  src/styles/global.css, src/layouts/Base.astro, src/content.config.ts
  src/content/entries/view-program.md, src/content/exhibits/fig-3a.md, src/content/documents.json
  src/components/ProvenanceBadge.astro
  src/components/fig3a/{Fig3aExhibit,InputsPanel,ResidualsTable}.tsx
  src/lib/fig3a.ts
  src/pages/index.astro, src/pages/[entry]/index.astro, src/pages/view-program/fig-3a.astro, src/pages/documents/[id].astro
```

---

### Task 1: Workspace scaffold and math module

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`
- Modify: `.gitignore`
- Create: `packages/view-engine/package.json`, `packages/view-engine/tsconfig.json`, `packages/view-engine/src/index.ts`
- Create: `packages/view-engine/src/math/vec.ts`, `packages/view-engine/src/math/mat.ts`
- Test: `packages/view-engine/test/math.test.ts`

**Interfaces:**
- Produces: `Vec3`, `Mat3`, `DEG`, `toRad`, `toDeg`, `dot`, `cross`, `add`, `sub`, `scale`, `norm`, `unit`, `angleBetween`, `toVec3`; `IDENTITY`, `mxv`, `mxm`, `transpose`, `det`, `orthonormalityError`, `rotX`, `rotY`, `rotZ` (passive).

- [ ] **Step 1: Write the workspace files**

`package.json`:
```json
{
  "name": "apollo-software-library",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*", "site"],
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p packages/view-engine --noEmit"
  },
  "devDependencies": {
    "@types/bun": "^1.4.2",
    "typescript": "^5.9.3",
    "vitest": "^5.0.2"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["bun"]
  }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'scripts/test/**/*.test.ts'],
  },
});
```

Append to `.gitignore`:
```
tmp/
site/public/docs/
site/public/scans/
```

`packages/view-engine/package.json`:
```json
{
  "name": "@asl/view-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "astronomy-engine": "^2.1.19" }
}
```

`packages/view-engine/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "include": ["src", "test"] }
```

- [ ] **Step 2: Install**

Run: `bun install`
Expected: installs vitest, typescript, @types/bun and astronomy-engine; creates `bun.lock`.

- [ ] **Step 3: Write the failing test** `packages/view-engine/test/math.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  angleBetween, cross, det, dot, mxm, mxv, orthonormalityError, rotX, rotY, rotZ, unit,
} from '../src/index';

describe('vectors', () => {
  it('dot and cross follow the right-hand rule', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });
  it('angleBetween is accurate for tiny and near-180° angles', () => {
    expect(angleBetween([1, 0, 0], [0, 1, 0])).toBeCloseTo(Math.PI / 2, 15);
    expect(angleBetween([1, 0, 0], [1, 1e-9, 0])).toBeCloseTo(1e-9, 18);
    expect(angleBetween([1, 0, 0], [-1, 1e-9, 0])).toBeCloseTo(Math.PI - 1e-9, 12);
  });
  it('unit rejects the zero vector', () => {
    expect(() => unit([0, 0, 0])).toThrow(/zero vector/);
  });
});

describe('matrices', () => {
  it('rotations are passive (coordinate-frame) rotations', () => {
    const v = mxv(rotZ(Math.PI / 2), [1, 0, 0]);
    expect(v[0]).toBeCloseTo(0, 15);
    expect(v[1]).toBeCloseTo(-1, 15);
    expect(v[2]).toBeCloseTo(0, 15);
  });
  it('composite rotations stay orthonormal with determinant +1', () => {
    const m = mxm(rotX(0.3), mxm(rotY(-1.1), rotZ(2)));
    expect(orthonormalityError(m)).toBeLessThan(1e-12);
    expect(det(m)).toBeCloseTo(1, 12);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `bun run test packages/view-engine/test/math.test.ts`
Expected: FAIL (cannot resolve `../src/index`).

- [ ] **Step 5: Implement**

`packages/view-engine/src/math/vec.ts`:
```ts
export type Vec3 = readonly [number, number, number];

export const DEG = Math.PI / 180;
export const toRad = (deg: number): number => deg * DEG;
export const toDeg = (rad: number): number => rad / DEG;

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const norm = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export function unit(a: Vec3): Vec3 {
  const n = norm(a);
  if (n === 0) throw new Error('unit(): zero vector');
  return scale(a, 1 / n);
}

/** Angle between two vectors in radians; accurate near 0 and near π. */
export const angleBetween = (a: Vec3, b: Vec3): number => Math.atan2(norm(cross(a, b)), dot(a, b));

/** Narrow a JSON number[] to a Vec3. */
export function toVec3(a: readonly number[]): Vec3 {
  if (a.length !== 3 || a.some((x) => !Number.isFinite(x))) throw new Error(`toVec3(): bad vector ${JSON.stringify(a)}`);
  return [a[0]!, a[1]!, a[2]!];
}
```

`packages/view-engine/src/math/mat.ts`:
```ts
import { cross, dot, type Vec3 } from './vec';

/** Row-major 3×3 matrix, as the AGC and the MSC notes print them. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

export const mxv = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];

export const transpose = (m: Mat3): Mat3 => [
  [m[0][0], m[1][0], m[2][0]],
  [m[0][1], m[1][1], m[2][1]],
  [m[0][2], m[1][2], m[2][2]],
];

export function mxm(a: Mat3, b: Mat3): Mat3 {
  const bt = transpose(b);
  const row = (r: Vec3): Vec3 => [dot(r, bt[0]), dot(r, bt[1]), dot(r, bt[2])];
  return [row(a[0]), row(a[1]), row(a[2])];
}

export const det = (m: Mat3): number => dot(m[0], cross(m[1], m[2]));

/** Largest deviation of m·mᵀ from the identity. */
export function orthonormalityError(m: Mat3): number {
  const p = mxm(m, transpose(m));
  let e = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) e = Math.max(e, Math.abs(p[i]![j]! - (i === j ? 1 : 0)));
  return e;
}

// Passive (coordinate-frame) rotations: v' = R·v expresses v in a frame rotated by +a.
// These are the rotations the AGC's CALCGA/SMNB routines compose.
export function rotX(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [[1, 0, 0], [0, c, s], [0, -s, c]];
}
export function rotY(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
}
export function rotZ(a: number): Mat3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
}
```

`packages/view-engine/src/index.ts`:
```ts
export * from './math/vec';
export * from './math/mat';
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `bun run test packages/view-engine/test/math.test.ts && bun run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock tsconfig.base.json vitest.config.ts .gitignore packages/view-engine
git commit -m "feat(engine): scaffold workspace and math module"
```

---

### Task 2: Time module

**Files:**
- Create: `packages/view-engine/src/time/time.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/time.test.ts`

**Interfaces:**
- Produces: `InvalidGetError`, `parseGet(get: string): number` (seconds), `formatGet(seconds: number): string`, `getToUtc(rangeZeroUtc: string, get: string | number): Date`, `julianDate(d: Date): number`, `besselianEpochToJd(b: number): number`, `jdToBesselianEpoch(jd: number): number`, `J2000_JD`.

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/time.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  besselianEpochToJd, formatGet, getToUtc, InvalidGetError, jdToBesselianEpoch, julianDate, parseGet,
} from '../src/index';

describe('GET', () => {
  it('parses and formats hhh:mm:ss', () => {
    expect(parseGet('124:40:00')).toBe(448800);
    expect(parseGet(' 02:44:18.5 ')).toBe(9858.5);
    expect(formatGet(448800)).toBe('124:40:00');
    expect(formatGet(9858)).toBe('02:44:18');
  });
  it('rejects malformed GETs with a typed error', () => {
    for (const bad of ['abc', '124:61:00', '', '124:40', '-1:00:00']) {
      expect(() => parseGet(bad)).toThrow(InvalidGetError);
    }
  });
  it('converts Apollo 11 GET to UTC', () => {
    expect(getToUtc('1969-07-16T13:32:00Z', '124:40:00').toISOString()).toBe('1969-07-21T18:12:00.000Z');
  });
  it('handles very large GETs', () => {
    expect(getToUtc('1969-07-16T13:32:00Z', '9999:00:00').getUTCFullYear()).toBe(1970);
  });
});

describe('epochs', () => {
  it('computes Julian dates', () => {
    expect(julianDate(new Date('2000-01-01T12:00:00Z'))).toBe(2451545);
  });
  it('converts Besselian epochs (B1950.0 = JD 2433282.4235)', () => {
    expect(besselianEpochToJd(1950)).toBeCloseTo(2433282.4235, 4);
    expect(jdToBesselianEpoch(besselianEpochToJd(1970))).toBeCloseTo(1970, 12);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test packages/view-engine/test/time.test.ts`
Expected: FAIL (the exports do not exist).

- [ ] **Step 3: Implement** `packages/view-engine/src/time/time.ts`

```ts
export class InvalidGetError extends Error {
  constructor(get: string) {
    super(`Invalid GET "${get}" (expected hhh:mm:ss)`);
    this.name = 'InvalidGetError';
  }
}

const GET_RE = /^(\d{1,4}):([0-5]\d):([0-5]\d(?:\.\d+)?)$/;

/** Ground elapsed time "hhh:mm:ss[.s]" → seconds after range zero. */
export function parseGet(get: string): number {
  const m = GET_RE.exec(get.trim());
  if (!m) throw new InvalidGetError(get);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function formatGet(seconds: number): string {
  const s = Math.floor(seconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function getToUtc(rangeZeroUtc: string, get: string | number): Date {
  const seconds = typeof get === 'number' ? get : parseGet(get);
  return new Date(Date.parse(rangeZeroUtc) + seconds * 1000);
}

export const J2000_JD = 2451545.0;

/** Julian date on the UTC time scale (the TT−UTC difference is irrelevant at this precision). */
export const julianDate = (d: Date): number => d.getTime() / 86400000 + 2440587.5;

export const besselianEpochToJd = (b: number): number => 2415020.31352 + (b - 1900) * 365.242198781;
export const jdToBesselianEpoch = (jd: number): number => 1900 + (jd - 2415020.31352) / 365.242198781;
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './time/time';
```

- [ ] **Step 4: Run the tests**

Run: `bun run test packages/view-engine/test/time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): add GET/UTC and epoch conversions"
```

---

### Task 3: Catalog core, BSC subset and AGC nav stars (with the epoch test)

**Files:**
- Create: `packages/view-engine/src/catalog/precession.ts`, `packages/view-engine/src/catalog/stars.ts`
- Modify: `packages/view-engine/src/index.ts`
- Create: `scripts/lib/provenance.ts`, `scripts/lib/bsc.ts`, `scripts/lib/agc.ts`, `scripts/build-bsc.ts`, `scripts/build-agc-stars.ts`
- Create (generated): `data/derived/bsc45.json`, `data/derived/agc37.json`
- Test: `packages/view-engine/test/catalog.test.ts`, `scripts/test/bsc.test.ts`, `scripts/test/agc.test.ts`

**Interfaces:**
- Consumes: Task 1 math, Task 2 `J2000_JD`, `besselianEpochToJd`.
- Produces: `precessionMatrix(epochJd): Mat3` (J2000 → mean equator/equinox of the epoch); `CatalogStar { hr, name, raDeg, decDeg, pmRaArcsecPerYr, pmDecArcsecPerYr, vmag }` (J2000 positions; `pmRa` is μα·cosδ); `radecToVec`, `vecToRadec`, `starDirection(star, epochJd, P?)`; `parseBscCatalog(text): CatalogStar[]`; `APOLLO_NAV_STARS`; `parseAgcStarTable(text): Map<number, Vec3>`; `writeJson`, `sha256`, `Provenance`.
- JSON shapes: `bsc45.json = { provenance, stars: CatalogStar[] }`; `agc37.json = { provenance, epoch: "B1970.0", epochJd, stars: [{ navStar, name, hr, vector: [x,y,z] }] }`.

- [ ] **Step 1: Write the failing engine test** `packages/view-engine/test/catalog.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  angleBetween, besselianEpochToJd, IDENTITY, J2000_JD, orthonormalityError, precessionMatrix,
  radecToVec, starDirection, toDeg, toVec3, vecToRadec, type CatalogStar,
} from '../src/index';

describe('precession (IAU 1976)', () => {
  it('is the identity at J2000 and orthonormal elsewhere', () => {
    const p = precessionMatrix(J2000_JD);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(p[i]![j]).toBeCloseTo(IDENTITY[i]![j]!, 15);
    expect(orthonormalityError(precessionMatrix(besselianEpochToJd(1970)))).toBeLessThan(1e-14);
  });
  it('reproduces Meeus Example 21.b (θ Persei to 2028 Nov 13.19 TD)', () => {
    const thetaPer: CatalogStar = {
      hr: 0, name: 'the Per',
      raDeg: (2 + 44 / 60 + 11.986 / 3600) * 15, decDeg: 49 + 13 / 60 + 42.48 / 3600,
      pmRaArcsecPerYr: 0.03425 * 15 * Math.cos((49.2285 * Math.PI) / 180), pmDecArcsecPerYr: -0.0895, vmag: 4.1,
    };
    const got = starDirection(thetaPer, 2462088.69);
    const expected = radecToVec((2 + 46 / 60 + 11.331 / 3600) * 15, 49 + 20 / 60 + 54.54 / 3600);
    expect(toDeg(angleBetween(got, expected)) * 3600).toBeLessThan(0.5);
  });
  it('round-trips RA/Dec', () => {
    const { raDeg, decDeg } = vecToRadec(radecToVec(301.25, -12.5));
    expect(raDeg).toBeCloseTo(301.25, 12);
    expect(decDeg).toBeCloseTo(-12.5, 12);
  });
});

import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';

describe('AGC nav-star epoch', () => {
  const byHr = new Map((bsc.stars as CatalogStar[]).map((s) => [s.hr, s]));
  const maxSepArcsec = (epochJd: number) => Math.max(...agc.stars.map((s) =>
    toDeg(angleBetween(toVec3(s.vector), starDirection(byHr.get(s.hr)!, epochJd))) * 3600));

  it('AGC vectors are mean equator/equinox of B1970.0 with proper motion (≤ 0.01°)', () => {
    expect(agc.stars).toHaveLength(37);
    expect(maxSepArcsec(besselianEpochToJd(1970))).toBeLessThan(36);
  });
  it('B1970.0 fits better than neighboring epochs', () => {
    const at1970 = maxSepArcsec(besselianEpochToJd(1970));
    for (const b of [1969.0, 1969.5, 1970.5]) expect(at1970).toBeLessThan(maxSepArcsec(besselianEpochToJd(b)));
  });
});
```

- [ ] **Step 2: Write the failing script tests**

`scripts/test/bsc.test.ts` (the fixture is the verbatim BSC5 line for HR 2491, Sirius):
```ts
import { describe, expect, it } from 'vitest';
import { parseBscCatalog } from '../lib/bsc';

const SIRIUS = '2491  9Alp CMaBD-16 1591  48915151881 257I   5423           064044.6-163444064508.9-164258227.22-08.88-1.46   0.00 -0.05 -0.03   A1Vm               -0.553-1.205 +.375-008SBO    13 10.3  11.2AB   ';

describe('parseBscCatalog', () => {
  it('parses J2000 position, magnitude and proper motion', () => {
    const [s] = parseBscCatalog(SIRIUS);
    expect(s!.hr).toBe(2491);
    expect(s!.name).toBe('9Alp CMa');
    expect(s!.raDeg).toBeCloseTo((6 + 45 / 60 + 8.9 / 3600) * 15, 9);
    expect(s!.decDeg).toBeCloseTo(-(16 + 42 / 60 + 58 / 3600), 9);
    expect(s!.vmag).toBe(-1.46);
    expect(s!.pmRaArcsecPerYr).toBe(-0.553);
    expect(s!.pmDecArcsecPerYr).toBe(-1.205);
  });
  it('skips entries without a J2000 position', () => {
    // HR 182 is the M 31 supernova placeholder in BSC5: it has no position fields.
    expect(parseBscCatalog(' 182 M 31  And                                     S And')).toHaveLength(0);
  });
});
```

`scripts/test/agc.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { APOLLO_NAV_STARS, parseAgcStarTable } from '../lib/agc';

const SNIPPET = `
\t\t2DEC\t+.8342971408 B-1\t# STAR 37\tX
\t\t2DEC\t-.2392481515 B-1\t# STAR 37\tY
\t\t2DEC\t-.4966976975 B-1\t# STAR 37\tZ
`;

describe('parseAgcStarTable', () => {
  it('reads unit vectors keyed by star number', () => {
    const t = parseAgcStarTable(SNIPPET);
    expect(t.get(37)).toEqual([0.8342971408, -0.2392481515, -0.4966976975]);
  });
});

describe('APOLLO_NAV_STARS', () => {
  it('lists 37 stars in AGC order, including the Apollo 1 names', () => {
    expect(APOLLO_NAV_STARS).toHaveLength(37);
    expect(APOLLO_NAV_STARS.find((s) => s.navStar === 3)!.name).toBe('Navi');
    expect(APOLLO_NAV_STARS.find((s) => s.navStar === 15)!.name).toBe('Regor');
    expect(APOLLO_NAV_STARS.find((s) => s.navStar === 16)!.name).toBe('Dnoces');
    expect(APOLLO_NAV_STARS.slice(33).map((s) => s.name)).toEqual(['Peacock', 'Deneb', 'Enif', 'Fomalhaut']);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun run test scripts/test packages/view-engine/test/catalog.test.ts`
Expected: FAIL (the modules and the data files do not exist).

- [ ] **Step 4: Implement the engine catalog**

`packages/view-engine/src/catalog/precession.ts`:
```ts
import type { Mat3 } from '../math/mat';
import { J2000_JD } from '../time/time';

const ARCSEC = Math.PI / (180 * 3600);

/** IAU 1976 (Lieske) precession: J2000 mean equator/equinox → mean equator/equinox of `epochJd`. */
export function precessionMatrix(epochJd: number): Mat3 {
  const t = (epochJd - J2000_JD) / 36525;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * ARCSEC;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * ARCSEC;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * ARCSEC;
  const cz = Math.cos(zeta), sz = Math.sin(zeta);
  const cZ = Math.cos(z), sZ = Math.sin(z);
  const ct = Math.cos(theta), st = Math.sin(theta);
  return [
    [cz * ct * cZ - sz * sZ, -sz * ct * cZ - cz * sZ, -st * cZ],
    [cz * ct * sZ + sz * cZ, -sz * ct * sZ + cz * cZ, -st * sZ],
    [cz * st, -sz * st, ct],
  ];
}
```

`packages/view-engine/src/catalog/stars.ts`:
```ts
import { mxv, type Mat3 } from '../math/mat';
import { toDeg, toRad, type Vec3 } from '../math/vec';
import { J2000_JD } from '../time/time';
import { precessionMatrix } from './precession';

/** A star with a J2000 position (BSC5/FK5). `pmRa` is μα·cosδ, in arcsec per year. */
export interface CatalogStar {
  hr: number;
  name: string;
  raDeg: number;
  decDeg: number;
  pmRaArcsecPerYr: number;
  pmDecArcsecPerYr: number;
  vmag: number;
}

export function radecToVec(raDeg: number, decDeg: number): Vec3 {
  const a = toRad(raDeg), d = toRad(decDeg);
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

export function vecToRadec(v: Vec3): { raDeg: number; decDeg: number } {
  const raDeg = (toDeg(Math.atan2(v[1], v[0])) + 360) % 360;
  return { raDeg, decDeg: toDeg(Math.asin(Math.max(-1, Math.min(1, v[2])))) };
}

/** Unit vector at the mean equator/equinox of `epochJd`, with proper motion applied from J2000. */
export function starDirection(star: CatalogStar, epochJd: number, p: Mat3 = precessionMatrix(epochJd)): Vec3 {
  const years = (epochJd - J2000_JD) / 365.25;
  const dec = star.decDeg + (star.pmDecArcsecPerYr * years) / 3600;
  const ra = star.raDeg + (star.pmRaArcsecPerYr * years) / 3600 / Math.cos(toRad(star.decDeg));
  return mxv(p, radecToVec(ra, dec));
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './catalog/precession';
export * from './catalog/stars';
```

- [ ] **Step 5: Implement the script libraries**

`scripts/lib/provenance.ts`:
```ts
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface ProvenanceSource { url: string; retrieved: string; sha256: string }
export interface Provenance { sources: ProvenanceSource[]; method: string; script: string; generated: string }

export const sha256 = (buf: Uint8Array): string => createHash('sha256').update(buf).digest('hex');
export const today = (): string => new Date().toISOString().slice(0, 10);

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

export async function download(url: string): Promise<{ bytes: Uint8Array; source: ProvenanceSource }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, source: { url, retrieved: today(), sha256: sha256(bytes) } };
}
```

`scripts/lib/bsc.ts`:
```ts
import type { CatalogStar } from '../../packages/view-engine/src/index';

// Byte ranges per the VizieR V/50 ReadMe (1-based inclusive → 0-based slices).
const f = (line: string, from: number, to: number) => line.slice(from - 1, to).trim();

export function parseBscCatalog(text: string): CatalogStar[] {
  const out: CatalogStar[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.padEnd(200);
    if (!f(line, 76, 77)) continue; // no J2000 position (removed entries)
    const ra = (Number(f(line, 76, 77)) + Number(f(line, 78, 79)) / 60 + Number(f(line, 80, 83)) / 3600) * 15;
    const decAbs = Number(f(line, 85, 86)) + Number(f(line, 87, 88)) / 60 + Number(f(line, 89, 90)) / 3600;
    const vmag = f(line, 103, 107);
    out.push({
      hr: Number(f(line, 1, 4)),
      name: f(line, 5, 14),
      raDeg: ra,
      decDeg: line[83] === '-' ? -decAbs : decAbs,
      pmRaArcsecPerYr: Number(f(line, 149, 154) || 0),
      pmDecArcsecPerYr: Number(f(line, 155, 160) || 0),
      vmag: vmag ? Number(vmag) : 99,
    });
  }
  return out;
}
```

`scripts/lib/agc.ts`:
```ts
import type { Vec3 } from '../../packages/view-engine/src/index';

/** Apollo navigation stars in AGC order, with Yale BSC HR numbers (verified against STAR_TABLES.agc). */
export const APOLLO_NAV_STARS: ReadonlyArray<{ navStar: number; name: string; hr: number }> = [
  { navStar: 1, name: 'Alpheratz', hr: 15 }, { navStar: 2, name: 'Diphda', hr: 188 },
  { navStar: 3, name: 'Navi', hr: 264 }, { navStar: 4, name: 'Achernar', hr: 472 },
  { navStar: 5, name: 'Polaris', hr: 424 }, { navStar: 6, name: 'Acamar', hr: 897 },
  { navStar: 7, name: 'Menkar', hr: 911 }, { navStar: 8, name: 'Mirfak', hr: 1017 },
  { navStar: 9, name: 'Aldebaran', hr: 1457 }, { navStar: 10, name: 'Rigel', hr: 1713 },
  { navStar: 11, name: 'Capella', hr: 1708 }, { navStar: 12, name: 'Canopus', hr: 2326 },
  { navStar: 13, name: 'Sirius', hr: 2491 }, { navStar: 14, name: 'Procyon', hr: 2943 },
  { navStar: 15, name: 'Regor', hr: 3207 }, { navStar: 16, name: 'Dnoces', hr: 3569 },
  { navStar: 17, name: 'Alphard', hr: 3748 }, { navStar: 18, name: 'Regulus', hr: 3982 },
  { navStar: 19, name: 'Denebola', hr: 4534 }, { navStar: 20, name: 'Gienah', hr: 4662 },
  { navStar: 21, name: 'Acrux', hr: 4730 }, { navStar: 22, name: 'Spica', hr: 5056 },
  { navStar: 23, name: 'Alkaid', hr: 5191 }, { navStar: 24, name: 'Menkent', hr: 5288 },
  { navStar: 25, name: 'Arcturus', hr: 5340 }, { navStar: 26, name: 'Alphecca', hr: 5793 },
  { navStar: 27, name: 'Antares', hr: 6134 }, { navStar: 28, name: 'Atria', hr: 6217 },
  { navStar: 29, name: 'Rasalhague', hr: 6556 }, { navStar: 30, name: 'Vega', hr: 7001 },
  { navStar: 31, name: 'Nunki', hr: 7121 }, { navStar: 32, name: 'Altair', hr: 7557 },
  { navStar: 33, name: 'Dabih', hr: 7776 }, { navStar: 34, name: 'Peacock', hr: 7790 },
  { navStar: 35, name: 'Deneb', hr: 7924 }, { navStar: 36, name: 'Enif', hr: 8308 },
  { navStar: 37, name: 'Fomalhaut', hr: 8728 },
];

const LINE = /2DEC\s+([+-]?\.\d+)\s+B-1\s+#\s+STAR\s+(\d+)\s+([XYZ])/;

/** Parse Comanche055 STAR_TABLES.agc: `2DEC ±.nnnn B-1 # STAR n X|Y|Z` (values are unit-vector components). */
export function parseAgcStarTable(text: string): Map<number, Vec3> {
  const parts = new Map<number, Partial<Record<'X' | 'Y' | 'Z', number>>>();
  for (const line of text.split('\n')) {
    const m = LINE.exec(line);
    if (!m) continue;
    const star = Number(m[2]);
    parts.set(star, { ...parts.get(star), [m[3] as 'X' | 'Y' | 'Z']: Number(m[1]) });
  }
  const out = new Map<number, Vec3>();
  for (const [star, p] of parts) {
    if (p.X === undefined || p.Y === undefined || p.Z === undefined) throw new Error(`STAR ${star}: incomplete vector`);
    out.set(star, [p.X, p.Y, p.Z]);
  }
  return out;
}
```

- [ ] **Step 6: Implement the build scripts**

`scripts/build-bsc.ts`:
```ts
import { gunzipSync } from 'node:zlib';
import { download, today, writeJson } from './lib/provenance';
import { parseBscCatalog } from './lib/bsc';

const URL_ = 'https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz';
const { bytes, source } = await download(URL_);
const stars = parseBscCatalog(gunzipSync(bytes).toString('latin1')).filter((s) => s.vmag <= 4.5);
writeJson('data/derived/bsc45.json', {
  provenance: {
    sources: [source],
    method: 'Yale Bright Star Catalog 5th ed. (VizieR V/50), stars with V ≤ 4.5; J2000 positions and FK5 proper motions as published.',
    script: 'scripts/build-bsc.ts',
    generated: today(),
  },
  stars,
});
console.log(`bsc45.json: ${stars.length} stars`);
```

`scripts/build-agc-stars.ts`:
```ts
import { besselianEpochToJd } from '../packages/view-engine/src/index';
import { APOLLO_NAV_STARS, parseAgcStarTable } from './lib/agc';
import { download, today, writeJson } from './lib/provenance';

const COMMIT = 'c63dd9b528de0afd498b445dc81a6eef6419d5bf'; // last change to STAR_TABLES.agc
const URL_ = `https://raw.githubusercontent.com/virtualagc/virtualagc/${COMMIT}/Comanche055/STAR_TABLES.agc`;
const { bytes, source } = await download(URL_);
const table = parseAgcStarTable(new TextDecoder().decode(bytes));
if (table.size !== 37) throw new Error(`expected 37 stars, got ${table.size}`);
writeJson('data/derived/agc37.json', {
  provenance: {
    sources: [source],
    method: 'Unit vectors from Comanche055 (Colossus 2A, Apollo 11 CM) STAR_TABLES.agc. Names and HR numbers from the Apollo nav-star list (ALSJ); epoch established by the catalog epoch test.',
    script: 'scripts/build-agc-stars.ts',
    generated: today(),
  },
  epoch: 'B1970.0',
  epochJd: besselianEpochToJd(1970),
  stars: APOLLO_NAV_STARS.map((s) => ({ ...s, vector: table.get(s.navStar)! })),
});
console.log('agc37.json: 37 stars');
```

- [ ] **Step 7: Generate the data and run the tests**

Run: `bun scripts/build-bsc.ts && bun scripts/build-agc-stars.ts && bun run test`
Expected: `bsc45.json: 904 stars`, `agc37.json: 37 stars`; all tests PASS, including the epoch tests (max separation ≈ 3.6″ at B1970.0).

- [ ] **Step 8: Commit**

```bash
git add packages/view-engine scripts data/derived/bsc45.json data/derived/agc37.json
git commit -m "feat(catalog): precession, BSC subset, AGC nav stars; pin epoch B1970.0"
```

---
### Task 4: Primary sources, the RTCC star catalogue, and catalog resolution

**Files:**
- Create: `scripts/fetch-sources.ts` (writes `data/sources/*.pdf`, `data/sources/sources.json`, `data/sources/SOURCES.md`)
- Create: `scripts/ocr-rtcc.ts` (writes `data/derived/rtcc1970-ocr.txt`)
- Create: `scripts/lib/rtcc.ts`, `scripts/build-rtcc-catalog.ts` (writes `data/derived/rtcc1970.json`)
- Create: `data/manual/rtcc-overrides.json`
- Create: `packages/view-engine/src/catalog/resolve.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `scripts/test/rtcc.test.ts`, `packages/view-engine/test/data.test.ts`

**Interfaces:**
- Consumes: Task 3 `parseBscCatalog` output (`bsc45.json`), `APOLLO_NAV_STARS`, `starDirection`, `radecToVec`, `besselianEpochToJd`.
- Produces:
  - `parseRtccOcr(text): RtccOcrRow[]`, where `RtccOcrRow = { seq, line, raDeg: number | null, decAbsDeg: number | null, decSign: 1 | -1 | null, mag: number | null }`.
  - `matchRow(row, candidates, tolDeg): { hr, sepDeg } | null`.
  - `rtcc1970.json = { provenance, epoch: "B1970.0", stars: [{ seq, hr, bscName, mag, printedRaDeg, printedDecDeg, separationDeg, via: "ocr" | "override" }] }`.
  - Engine: `BscFile`, `Agc37File`, `RtccFile`, `NavStarRecord`, `RtccRecord`, `ResolvedStar { seq, hr, navStar: number | null, name: string | null, mag: number | null, direction: Vec3 }`, `resolveCatalog(rtcc, bsc, agc, epochJd): ResolvedStar[]`.

- [ ] **Step 1: Fetch the primary sources**

`scripts/fetch-sources.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { download, writeJson } from './lib/provenance';

const SOURCES = [
  {
    file: 'tn-d-6853.pdf',
    title: 'NASA TN D-6853, Apollo Experience Report – The Application of a Computerized Visualization Capability to Lunar Missions (Hyle & Lunde, June 1972)',
    url: 'https://ntrs.nasa.gov/api/citations/19720017950/downloads/19720017950.pdf',
  },
  {
    file: '69-fm-197.pdf',
    title: 'MSC IN 69-FM-197 Rev 1, Views from the CM and LM During the Flight of Apollo 11 (Mission G) (A. N. Lunde, 3 July 1969)',
    url: 'https://www.ibiblio.org/apollo/Documents/19740073250.pdf',
  },
  {
    file: '69-fm-107.pdf',
    title: 'MSC IN 69-FM-107, Views from the Spacecraft During Apollo 10 (Mission F) (22 April 1969)',
    url: 'https://web.archive.org/web/20250615183849id_/https://www.nasa.gov/wp-content/uploads/static/history/afj/ap10fj/pdf/a10-views-from-sc-1969-05-18-launch-19690422.pdf',
  },
];

mkdirSync('data/sources', { recursive: true });
const records = [];
for (const s of SOURCES) {
  const { bytes, source } = await download(s.url);
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error(`${s.url} is not a PDF`);
  writeFileSync(`data/sources/${s.file}`, bytes);
  records.push({ ...s, ...source, bytes: bytes.length });
  console.log(`${s.file}: ${bytes.length} bytes`);
}
writeJson('data/sources/sources.json', records);
writeFileSync('data/sources/SOURCES.md', [
  '# Primary sources',
  '',
  'All documents are U.S. Government works (NASA), in the public domain. Regenerate with `bun scripts/fetch-sources.ts`.',
  '',
  '| File | Document | URL | Retrieved | SHA-256 |',
  '|---|---|---|---|---|',
  ...records.map((r) => `| \`${r.file}\` | ${r.title} | ${r.url} | ${r.retrieved} | \`${r.sha256}\` |`),
  '',
].join('\n'));
```

Run: `bun scripts/fetch-sources.ts`
Expected: three PDFs are written, of about 0.95 MB, 7.9 MB and 4.3 MB.

- [ ] **Step 2: OCR the RTCC catalogue pages**

`scripts/ocr-rtcc.ts`:
```ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const PDF = 'data/sources/69-fm-197.pdf';
const PAGES = [309, 310, 311, 312, 313]; // printed pp. 291–295: "RTCC star catalogue for Besselian year 1970"
const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-197.pdf');
mkdirSync('tmp/rtcc', { recursive: true });

const chunks: string[] = [
  `# OCR of ${PDF} (sha256 ${src.sha256}), PDF pages ${PAGES.join(', ')}`,
  `# pdftoppm -r 300 -gray; tesseract --psm 6 (original page orientation). Generated ${new Date().toISOString().slice(0, 10)} by scripts/ocr-rtcc.ts`,
];
for (const p of PAGES) {
  execFileSync('pdftoppm', ['-r', '300', '-gray', '-png', '-f', String(p), '-l', String(p), PDF, `tmp/rtcc/p${p}`]);
  const png = readdirSync('tmp/rtcc').find((f) => f.startsWith(`p${p}-`))!;
  const text = execFileSync('tesseract', [`tmp/rtcc/${png}`, '-', '--psm', '6'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  chunks.push(`=== page ${p} ===`, text);
}
writeFileSync('data/derived/rtcc1970-ocr.txt', chunks.join('\n'));
console.log('rtcc1970-ocr.txt written');
```

Run: `bun scripts/ocr-rtcc.ts && grep -c ':' data/derived/rtcc1970-ocr.txt`
Expected: the file is written, and its lines include the rows from `1 ... Alpheratz 0:06:49.9` through `148 ... Markab 23:03:15.8`.

- [ ] **Step 3: Write the failing parser test** `scripts/test/rtcc.test.ts`

These fixture lines are verbatim OCR output:
```ts
import { describe, expect, it } from 'vitest';
import { matchRow, parseRtccOcr } from '../lib/rtcc';
import { radecToVec } from '../../packages/view-engine/src/index';

const OCR = [
  'no. designaticn and constellation@ Common name hr:min:sec deg:min:sec Magnitude',
  '1 ¢ And o  Andromedae Alpheratz 0:06:49.9 | +28:55:29 2.1',
  '2 B Cet 8 Ceti ‘| Diphda 0:42:05.0 | -18:09:0k 2.2',
  'N a Eri o Eridani | " ‘Acnernar 1:36:35.9 | ~57:23:20 , 0.6',
  "' - 104 ! k, Velorum e o L], 920100 | -5b:52:56 2.6",
  '< 1 Venus 4:52:16.98 20:01:45.2 w',
].join('\n');

describe('parseRtccOcr', () => {
  const rows = parseRtccOcr(OCR);
  it('numbers table rows in order and skips headers and planet rows', () => {
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4]);
  });
  it('parses RA, Dec and magnitude, fixing OCR digit confusions', () => {
    expect(rows[0]!.raDeg).toBeCloseTo((0 + 6 / 60 + 49.9 / 3600) * 15, 9);
    expect(rows[0]!.decAbsDeg).toBeCloseTo(28 + 55 / 60 + 29 / 3600, 9);
    expect(rows[0]!.decSign).toBe(1);
    expect(rows[0]!.mag).toBe(2.1);
    expect(rows[1]!.decAbsDeg).toBeCloseTo(18 + 9 / 60 + 4 / 3600, 9);
    expect(rows[1]!.decSign).toBe(-1);
    expect(rows[2]!.decSign).toBe(-1); // "~" is an OCR'd minus sign
  });
  it('leaves unparseable fields null instead of guessing', () => {
    expect(rows[3]!.raDeg).toBeNull();
    expect(rows[3]!.decAbsDeg).toBeCloseTo(54 + 52 / 60 + 56 / 3600, 9);
  });
});

describe('matchRow', () => {
  const candidates = [
    { hr: 15, direction: radecToVec((0 + 6 / 60 + 49.9 / 3600) * 15, 28 + 55 / 60 + 29 / 3600) },
    { hr: 999, direction: radecToVec(10, -28.9) },
  ];
  it('matches within tolerance, trying both signs when the sign is unknown', () => {
    const row = { seq: 1, line: '', raDeg: (0 + 6 / 60 + 49.9 / 3600) * 15, decAbsDeg: 28 + 55 / 60 + 29 / 3600, decSign: null, mag: null } as const;
    expect(matchRow(row, candidates, 0.05)!.hr).toBe(15);
  });
  it('returns null when nothing is within tolerance', () => {
    const row = { seq: 1, line: '', raDeg: 200, decAbsDeg: 10, decSign: 1, mag: null } as const;
    expect(matchRow(row, candidates, 0.05)).toBeNull();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `bun run test scripts/test/rtcc.test.ts`
Expected: FAIL (`../lib/rtcc` does not exist).

- [ ] **Step 5: Implement** `scripts/lib/rtcc.ts`

```ts
import { angleBetween, radecToVec, toDeg, type Vec3 } from '../../packages/view-engine/src/index';

export interface RtccOcrRow {
  seq: number;
  line: string;
  raDeg: number | null;
  decAbsDeg: number | null;
  decSign: 1 | -1 | null;
  mag: number | null;
}

// Characters tesseract substitutes for digits in this typewritten table.
const FIX: Record<string, string> = { k: '4', h: '4', L: '4', U: '4', b: '4', T: '7', O: '0', o: '0', l: '1', I: '1', S: '5', ',': '.' };
const D = '[0-9khLUbTOolIS]';
const RA_RE = new RegExp(`(?<![0-9:])(${D}{1,2}):(${D}{2}):(${D}{2})[.,](${D})(?![0-9])`);
const DEC_RE = new RegExp(`([+\\-~=]{0,2})\\s*(${D}{1,2}):(${D}{2}):(${D}{2})(?![0-9.,])`);
const MAG_RE = /(^|\s)(-?\d\.\d)(?=\s|$)/;
const ROW_HINT = /[0-9A-Za-z]{1,3}:[0-9A-Za-z]{2,3}:[0-9A-Za-z]{2,4}/;
const PLANET = /\b(Venus|Mars|Jupiter|Saturn)\b/;

const fix = (s: string): number => Number(s.replace(/[khLUbTOolIS,]/g, (c) => FIX[c]!));

export function parseRtccOcr(text: string): RtccOcrRow[] {
  const rows: RtccOcrRow[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.startsWith('===')) continue;
    if (/hr:min|deg:min/.test(line) || PLANET.test(line) || !ROW_HINT.test(line)) continue;
    const ra = RA_RE.exec(line);
    const afterRa = ra ? line.slice(ra.index + ra[0].length) : line;
    const dec = DEC_RE.exec(afterRa);
    const raDeg = ra ? (fix(ra[1]!) + fix(ra[2]!) / 60 + (fix(ra[3]!) + fix(ra[4]!) / 10) / 3600) * 15 : null;
    const decAbsDeg = dec ? fix(dec[2]!) + fix(dec[3]!) / 60 + fix(dec[4]!) / 3600 : null;
    const sign = dec?.[1] ?? '';
    const decSign: 1 | -1 | null = /[-~]/.test(sign) ? -1 : sign.includes('+') ? 1 : null;
    const afterDec = dec ? afterRa.slice(dec.index + dec[0].length) : '';
    const mag = MAG_RE.exec(afterDec);
    rows.push({
      seq: rows.length + 1,
      line: line.trim(),
      raDeg: raDeg !== null && Number.isFinite(raDeg) && raDeg < 360 ? raDeg : null,
      decAbsDeg: decAbsDeg !== null && Number.isFinite(decAbsDeg) && decAbsDeg <= 90 ? decAbsDeg : null,
      decSign,
      mag: mag ? Number(mag[2]) : null,
    });
  }
  return rows;
}

/** Nearest candidate within `tolDeg` of the row's printed B1970 position. An unknown sign tries both. */
export function matchRow(
  row: RtccOcrRow,
  candidates: ReadonlyArray<{ hr: number; direction: Vec3 }>,
  tolDeg: number,
): { hr: number; sepDeg: number } | null {
  if (row.raDeg === null || row.decAbsDeg === null) return null;
  const signs = row.decSign === null ? [1, -1] : [row.decSign];
  let best: { hr: number; sepDeg: number } | null = null;
  for (const s of signs) {
    const v = radecToVec(row.raDeg, s * row.decAbsDeg);
    for (const c of candidates) {
      const sepDeg = toDeg(angleBetween(v, c.direction));
      if (sepDeg <= tolDeg && (!best || sepDeg < best.sepDeg)) best = { hr: c.hr, sepDeg };
    }
  }
  return best;
}
```

- [ ] **Step 6: Run the parser tests**

Run: `bun run test scripts/test/rtcc.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the catalogue build script and an empty overrides file**

`data/manual/rtcc-overrides.json`:
```json
{
  "_comment": "Rows whose OCR could not be matched automatically. Key = RTCC star number; value = HR number read from the page image (69-FM-197 PDF pp. 309–313) plus a reason."
}
```

`scripts/build-rtcc-catalog.ts`:
```ts
import { readFileSync } from 'node:fs';
import { besselianEpochToJd, precessionMatrix, radecToVec, angleBetween, toDeg, starDirection, type CatalogStar } from '../packages/view-engine/src/index';
import { APOLLO_NAV_STARS } from './lib/agc';
import { matchRow, parseRtccOcr } from './lib/rtcc';
import { today, writeJson } from './lib/provenance';

const TOL_DEG = 0.05;
const epochJd = besselianEpochToJd(1970);
const P = precessionMatrix(epochJd);
const bsc = JSON.parse(readFileSync('data/derived/bsc45.json', 'utf8')) as { stars: CatalogStar[] };
const byHr = new Map(bsc.stars.map((s) => [s.hr, s]));
const candidates = bsc.stars.map((s) => ({ hr: s.hr, direction: starDirection(s, epochJd, P) }));
const overrides = JSON.parse(readFileSync('data/manual/rtcc-overrides.json', 'utf8')) as Record<string, { hr: number; reason: string } | string>;
const rows = parseRtccOcr(readFileSync('data/derived/rtcc1970-ocr.txt', 'utf8'));
if (rows.length !== 148) throw new Error(`expected 148 catalogue rows, parsed ${rows.length}:\n${rows.map((r) => `${r.seq}: ${r.line}`).join('\n')}`);

const failures: string[] = [];
const stars = rows.map((row) => {
  const override = overrides[String(row.seq)];
  const nav = row.seq <= 37 ? APOLLO_NAV_STARS[row.seq - 1]! : null;
  let hr: number | null = null, via: 'ocr' | 'override' = 'ocr', sepDeg: number | null = null;
  if (override && typeof override !== 'string') { hr = override.hr; via = 'override'; }
  else if (nav) { hr = nav.hr; }
  else { const m = matchRow(row, candidates, TOL_DEG); if (m) { hr = m.hr; sepDeg = m.sepDeg; } }
  if (hr === null || !byHr.has(hr)) { failures.push(`row ${row.seq}: no BSC match within ${TOL_DEG}° — "${row.line}"`); return null; }
  if (row.raDeg !== null && row.decAbsDeg !== null && sepDeg === null) {
    const dir = starDirection(byHr.get(hr)!, epochJd, P);
    const signs = row.decSign === null ? [1, -1] : [row.decSign];
    sepDeg = Math.min(...signs.map((s) => toDeg(angleBetween(radecToVec(row.raDeg!, s * row.decAbsDeg!), dir))));
    if (via === 'ocr' && sepDeg > TOL_DEG) failures.push(`row ${row.seq}: HR ${hr} is ${sepDeg.toFixed(3)}° from the printed position — "${row.line}"`);
  }
  return { seq: row.seq, hr, bscName: byHr.get(hr)!.name, mag: row.mag, printedRaDeg: row.raDeg, printedDecDeg: row.decAbsDeg === null || row.decSign === null ? null : row.decSign * row.decAbsDeg, separationDeg: sepDeg, via };
});
const hrs = stars.filter(Boolean).map((s) => s!.hr);
const dupes = hrs.filter((h, i) => hrs.indexOf(h) !== i);
if (dupes.length) failures.push(`duplicate HR numbers: ${[...new Set(dupes)].join(', ')}`);
if (failures.length) throw new Error(`RTCC catalogue build failed:\n${failures.join('\n')}`);

const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === '69-fm-197.pdf');
writeJson('data/derived/rtcc1970.json', {
  provenance: {
    sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
    method: 'OCR (tesseract) of the "RTCC star catalogue for Besselian year 1970", 69-FM-197 PDF pp. 309–313. Each row is matched by its printed B1970 position to a BSC5 star (V ≤ 4.5) within 0.05°; rows 1–37 are pinned to the Apollo nav-star HR numbers; unreadable rows are resolved in data/manual/rtcc-overrides.json.',
    script: 'scripts/build-rtcc-catalog.ts',
    generated: today(),
  },
  epoch: 'B1970.0',
  stars,
});
console.log(`rtcc1970.json: ${stars.length} stars (${stars.filter((s) => s!.via === 'override').length} via overrides)`);
```

- [ ] **Step 8: Build the catalogue and resolve any failures**

Run: `bun scripts/build-rtcc-catalog.ts`
Expected: either `rtcc1970.json: 148 stars`, or a failure list naming rows.

For each failing row:
1. Open the page image (`tmp/rtcc/p<page>-<page>.png`) and read the row by eye.
2. Find its HR number with `grep` in `data/derived/bsc45.json` by designation or position.
3. Add `"<seq>": { "hr": <HR>, "reason": "OCR garbled RA/Dec; read from page image" }` to `data/manual/rtcc-overrides.json`.
4. Rerun until the build passes.

If the row count is not 148, the OCR skipped or split a row. Fix it by editing the committed `data/derived/rtcc1970-ocr.txt`, adding a `# manual fix:` comment line above the edit, and rerun.

- [ ] **Step 9: Write the failing engine data test** `packages/view-engine/test/data.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { APOLLO_11, norm, resolveCatalog, type Agc37File, type BscFile, type RtccFile } from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';

describe('rtcc1970.json', () => {
  it('has 148 stars numbered 1..148 with unique HR numbers', () => {
    expect(rtcc.stars.map((s) => s.seq)).toEqual(Array.from({ length: 148 }, (_, i) => i + 1));
    expect(new Set(rtcc.stars.map((s) => s.hr)).size).toBe(148);
  });
  it('matches every printed position to its BSC star within 0.05°', () => {
    for (const s of rtcc.stars) if (s.separationDeg !== null) expect(s.separationDeg).toBeLessThanOrEqual(0.05);
  });
  it('rows 1–37 are the Apollo nav stars', () => {
    for (const n of agc.stars) expect(rtcc.stars[n.navStar - 1]!.hr).toBe(n.hr);
  });
});

describe('resolveCatalog', () => {
  const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
  it('resolves every RTCC star to a unit vector, naming the nav stars', () => {
    expect(stars).toHaveLength(148);
    for (const s of stars) expect(norm(s.direction)).toBeCloseTo(1, 12);
    expect(stars[2]!.name).toBe('Navi');
    expect(stars[40]!.name).toBeNull();
  });
});
```

This test imports `APOLLO_11`, which Task 6 creates. Until then, add a minimal version now; Task 6 extends the same file.

`packages/view-engine/src/missions/apollo11.ts`:
```ts
import type { Mat3 } from '../math/mat';
import { besselianEpochToJd } from '../time/time';

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
```

- [ ] **Step 10: Implement** `packages/view-engine/src/catalog/resolve.ts`

```ts
import { toVec3, unit, type Vec3 } from '../math/vec';
import { precessionMatrix } from './precession';
import { starDirection, type CatalogStar } from './stars';

export interface BscFile { stars: CatalogStar[] }
export interface NavStarRecord { navStar: number; name: string; hr: number; vector: number[] }
export interface Agc37File { epoch: string; epochJd: number; stars: NavStarRecord[] }
export interface RtccRecord { seq: number; hr: number; mag: number | null }
export interface RtccFile { stars: RtccRecord[] }

export interface ResolvedStar {
  seq: number;
  hr: number;
  navStar: number | null;
  name: string | null;
  mag: number | null;
  /** Unit vector in the reference frame (mean equator/equinox of the requested epoch). */
  direction: Vec3;
}

/**
 * RTCC catalogue rows → directions. Nav stars (rows 1–37) use the AGC's own vectors
 * when the requested epoch is the AGC epoch; every other star is precessed from BSC.
 */
export function resolveCatalog(rtcc: RtccFile, bsc: BscFile, agc: Agc37File, epochJd: number): ResolvedStar[] {
  const byHr = new Map(bsc.stars.map((s) => [s.hr, s]));
  const navBySeq = new Map(agc.stars.map((s) => [s.navStar, s]));
  const useAgcVectors = Math.abs(epochJd - agc.epochJd) < 1;
  const p = precessionMatrix(epochJd);
  return rtcc.stars.map((row) => {
    const nav = row.seq <= 37 ? navBySeq.get(row.seq) : undefined;
    const star = byHr.get(row.hr);
    if (!star) throw new Error(`RTCC star ${row.seq}: HR ${row.hr} is not in the BSC subset`);
    const direction = nav && useAgcVectors ? unit(toVec3(nav.vector)) : starDirection(star, epochJd, p);
    return { seq: row.seq, hr: row.hr, navStar: nav?.navStar ?? null, name: nav?.name ?? null, mag: row.mag, direction };
  });
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './catalog/resolve';
export * from './missions/apollo11';
```

- [ ] **Step 11: Run all tests**

Run: `bun run test && bun run typecheck`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add scripts data/sources data/manual data/derived/rtcc1970-ocr.txt data/derived/rtcc1970.json packages/view-engine
git commit -m "feat(catalog): primary sources, RTCC B1970 star catalogue via OCR + BSC match"
```

---

### Task 5: Projection

**Files:**
- Create: `packages/view-engine/src/projection/projection.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/projection.test.ts`

**Interfaces:**
- Produces: `PlotAxes { ex, ey, ez }` (plot +x, plot +y and boresight, as unit vectors in the frame of the vectors being projected); `PlotPoint { x, y }` (degrees); `projectAzimuthalEquidistant(v, axes)`; `unprojectAzimuthalEquidistant(p, axes)`; `axesFromBoresight(boresight, upHint, mirror = false)`, where the non-mirrored plot is the as-seen view with `ex = ez × ey`.

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/projection.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  angleBetween, axesFromBoresight, cross, dot, projectAzimuthalEquidistant, toDeg, toRad, unit,
  unprojectAzimuthalEquidistant, type Vec3,
} from '../src/index';

const axes = axesFromBoresight([0, 0, 1], [0, 1, 0]);
const s10 = Math.sin(toRad(10)), c10 = Math.cos(toRad(10));

describe('axesFromBoresight', () => {
  it('builds the as-seen (non-mirrored) basis: ex = ez × ey', () => {
    expect(dot(cross(axes.ez, axes.ey), axes.ex)).toBeCloseTo(1, 15);
    const m = axesFromBoresight([0, 0, 1], [0, 1, 0], true);
    expect(dot(cross(m.ez, m.ey), m.ex)).toBeCloseTo(-1, 15);
  });
});

describe('azimuthal equidistant', () => {
  it('maps the boresight to the origin and offsets to degrees along each axis', () => {
    const o = projectAzimuthalEquidistant([0, 0, 1], axes);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(0, 12);
    const up = projectAzimuthalEquidistant([0, s10, c10], axes);
    expect(up.x).toBeCloseTo(0, 12);
    expect(up.y).toBeCloseTo(10, 12);
    const right = projectAzimuthalEquidistant([-s10, 0, c10], axes); // here ex = ez × ey = (−1, 0, 0)
    expect(right.x).toBeCloseTo(10, 12);
    expect(right.y).toBeCloseTo(0, 12);
  });
  it('radius equals the angle from the boresight, and unproject inverts project', () => {
    for (const v of [[0.3, -0.2, 0.9], [-0.7, 0.1, 0.2], [0.1, 0.9, -0.4]] as Vec3[]) {
      const p = projectAzimuthalEquidistant(v, axes);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(toDeg(angleBetween(v, axes.ez)), 10);
      expect(toDeg(angleBetween(unprojectAzimuthalEquidistant(p, axes), unit(v)))).toBeLessThan(1e-9);
    }
  });
  it('stays finite at and near the antipode of the boresight', () => {
    for (const v of [[0, 0, -1], [1e-12, 0, -1]] as Vec3[]) {
      const p = projectAzimuthalEquidistant(v, axes);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(180, 6);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test packages/view-engine/test/projection.test.ts`
Expected: FAIL (the exports do not exist).

- [ ] **Step 3: Implement** `packages/view-engine/src/projection/projection.ts`

```ts
import { add, angleBetween, cross, dot, scale, sub, toDeg, toRad, unit, type Vec3 } from '../math/vec';

/** Plot +x, plot +y and boresight directions, in the same frame as the vectors being projected. */
export interface PlotAxes { ex: Vec3; ey: Vec3; ez: Vec3 }
/** Plot coordinates in degrees. */
export interface PlotPoint { x: number; y: number }

/** Azimuthal equidistant: the radius equals the angle from the boresight (the view program's "fisheye"). */
export function projectAzimuthalEquidistant(v: Vec3, axes: PlotAxes): PlotPoint {
  const u = unit(v);
  const r = toDeg(angleBetween(u, axes.ez));
  const az = Math.atan2(dot(u, axes.ey), dot(u, axes.ex));
  return { x: r * Math.cos(az), y: r * Math.sin(az) };
}

export function unprojectAzimuthalEquidistant(p: PlotPoint, axes: PlotAxes): Vec3 {
  const r = toRad(Math.hypot(p.x, p.y));
  const az = Math.atan2(p.y, p.x);
  const s = Math.sin(r);
  return unit(add(add(scale(axes.ex, s * Math.cos(az)), scale(axes.ey, s * Math.sin(az))), scale(axes.ez, Math.cos(r))));
}

/**
 * Plot axes looking along `boresight`, with `upHint` projected to plot +y.
 * The non-mirrored plot is the as-seen view: +x = boresight × up.
 */
export function axesFromBoresight(boresight: Vec3, upHint: Vec3, mirror = false): PlotAxes {
  const ez = unit(boresight);
  const ey = unit(sub(upHint, scale(ez, dot(upHint, ez))));
  const ex = cross(ez, ey);
  return { ex: mirror ? scale(ex, -1) : ex, ey, ez };
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './projection/projection';
```

- [ ] **Step 4: Run the tests**

Run: `bun run test packages/view-engine/test/projection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): azimuthal-equidistant projection with explicit plot axes"
```

---

### Task 6: Frames (REFSMMAT, gimbals, optics) and the SCT plot convention

**Files:**
- Create: `packages/view-engine/src/frames/frames.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/frames.test.ts`

**Interfaces:**
- Consumes: Task 1 math; Task 5 `PlotAxes`; `APOLLO_11` (Task 4).
- Produces: `GimbalAngles { inner, middle, outer }` (degrees; IGA, MGA, OGA); `smToNb(g): Mat3`; `gimbalsFromSmToNb(m): GimbalAngles` (the `CALCGA` construction); `NB1NB2: Mat3` (optics → navigation base); `referenceToNb(refsmmat, g)`; `referenceToOptics(refsmmat, g)`; `opticsLineOfSight(shaftDeg, trunnionDeg): Vec3`; `sctPlotAxes(shaftDeg, trunnionDeg): PlotAxes` (optics frame); `SCT_FIELD_OF_VIEW_DEG = 60`.

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/frames.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, angleBetween, cross, dot, gimbalsFromSmToNb, mxv, NB1NB2, norm, opticsLineOfSight,
  orthonormalityError, rotY, sctPlotAxes, smToNb, toDeg, toRad, type GimbalAngles,
} from '../src/index';

describe('optics mounting (Comanche055 NB1NB2)', () => {
  it('rotates 32.523° about Y and is orthonormal', () => {
    expect(toDeg(Math.atan2(NB1NB2[0][2], NB1NB2[0][0]))).toBeCloseTo(32.523, 3);
    expect(orthonormalityError(NB1NB2)).toBeLessThan(1e-9);
  });
  it('puts the zero-trunnion line of sight 57.477° from +X toward +Z', () => {
    const los = mxv(NB1NB2, opticsLineOfSight(0, 0));
    expect(los[1]).toBeCloseTo(0, 12);
    expect(los[2]).toBeGreaterThan(0);
    expect(toDeg(angleBetween(los, [1, 0, 0]))).toBeCloseTo(57.477, 3);
  });
});

describe('REFSMMAT and gimbals', () => {
  it('the Lunar lift-off REFSMMAT transcription is orthonormal', () => {
    expect(orthonormalityError(APOLLO_11.refsmmat.lunarLiftoff)).toBeLessThan(1e-7);
  });
  it('inner-gimbal-only attitude is a Y rotation', () => {
    const a = smToNb({ inner: 49.1, middle: 0, outer: 0 });
    const b = rotY(toRad(49.1));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(a[i]![j]).toBeCloseTo(b[i]![j]!, 15);
  });
  it('CALCGA inverts smToNb', () => {
    const cases: GimbalAngles[] = [
      { inner: 49.1, middle: 0, outer: 0 }, { inner: 17.86, middle: 0, outer: 0 },
      { inner: -120, middle: 35, outer: 170 }, { inner: 10, middle: -60, outer: -45 },
    ];
    for (const g of cases) {
      const back = gimbalsFromSmToNb(smToNb(g));
      expect(back.inner).toBeCloseTo(g.inner, 9);
      expect(back.middle).toBeCloseTo(g.middle, 9);
      expect(back.outer).toBeCloseTo(g.outer, 9);
    }
  });
});

describe('SCT plot axes', () => {
  it('are orthonormal and as-seen (ex = ez × ey)', () => {
    for (const [sa, ta] of [[0, 0], [20, 15], [-135, 40]] as const) {
      const a = sctPlotAxes(sa, ta);
      for (const v of [a.ex, a.ey, a.ez]) expect(norm(v)).toBeCloseTo(1, 12);
      expect(dot(a.ex, a.ey)).toBeCloseTo(0, 12);
      expect(dot(a.ey, a.ez)).toBeCloseTo(0, 12);
      expect(dot(cross(a.ez, a.ey), a.ex)).toBeCloseTo(1, 12);
    }
  });
  it('at shaft 0, trunnion 0: boresight = optics Z, up = optics X, right = optics Y', () => {
    const a = sctPlotAxes(0, 0);
    expect(a.ez).toEqual([0, 0, 1]);
    expect(a.ey[0]).toBeCloseTo(1, 15);
    expect(a.ex[1]).toBeCloseTo(1, 15);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test packages/view-engine/test/frames.test.ts`
Expected: FAIL (the exports do not exist).

- [ ] **Step 3: Implement** `packages/view-engine/src/frames/frames.ts`

```ts
import { mxm, rotX, rotY, rotZ, transpose, type Mat3 } from '../math/mat';
import { cross, dot, toDeg, toRad, unit, type Vec3 } from '../math/vec';
import type { PlotAxes } from '../projection/projection';

/** IMU gimbal angles in degrees (inner = IGA, middle = MGA, outer = OGA). */
export interface GimbalAngles { inner: number; middle: number; outer: number }

/** Stable member → navigation base: rotY(IGA), then rotZ(MGA), then rotX(OGA) (Comanche055 CALCGA/SMNB). */
export const smToNb = (g: GimbalAngles): Mat3 =>
  mxm(rotX(toRad(g.outer)), mxm(rotZ(toRad(g.middle)), rotY(toRad(g.inner))));

/** CALCGA: gimbal angles from an SM→NB matrix. Throws at gimbal lock (middle = ±90°). */
export function gimbalsFromSmToNb(m: Mat3): GimbalAngles {
  const [xnb, ynb, znb] = m; // NB axes in SM coordinates
  const xsm: Vec3 = [1, 0, 0], ysm: Vec3 = [0, 1, 0], zsm: Vec3 = [0, 0, 1];
  const mga = unit(cross(xnb, ysm)); // MGA = unit(OGA × IGA)
  return {
    inner: toDeg(Math.atan2(dot(xsm, mga), dot(zsm, mga))),
    middle: toDeg(Math.atan2(dot(ysm, xnb), dot(ysm, cross(mga, xnb)))),
    outer: toDeg(Math.atan2(dot(mga, ynb), dot(mga, znb))),
  };
}

/** Optics → navigation base (Comanche055 CSM_GEOMETRY NB1NB2): 32.523° about Y. */
export const NB1NB2: Mat3 = [
  [0.843175692, 0, 0.5376381241],
  [0, 1, 0],
  [-0.5376381241, 0, 0.843175692],
];

export const referenceToNb = (refsmmat: Mat3, g: GimbalAngles): Mat3 => mxm(smToNb(g), refsmmat);
export const referenceToOptics = (refsmmat: Mat3, g: GimbalAngles): Mat3 =>
  mxm(transpose(NB1NB2), referenceToNb(refsmmat, g));

/** Optics-frame line of sight for shaft SA and trunnion TA (Comanche055 SXTNB). */
export function opticsLineOfSight(shaftDeg: number, trunnionDeg: number): Vec3 {
  const sa = toRad(shaftDeg), ta = toRad(trunnionDeg);
  return [Math.cos(sa) * Math.sin(ta), Math.sin(sa) * Math.sin(ta), Math.cos(ta)];
}

export const SCT_FIELD_OF_VIEW_DEG = 60;

/**
 * Plot axes for scanning-telescope views, in the optics frame: boresight = line of sight,
 * +y = direction of increasing trunnion, +x = boresight × up (as seen).
 * Established by fitting TN D-6853 Fig 3a (see the spec amendments).
 */
export function sctPlotAxes(shaftDeg: number, trunnionDeg: number): PlotAxes {
  const sa = toRad(shaftDeg), ta = toRad(trunnionDeg);
  const ez = opticsLineOfSight(shaftDeg, trunnionDeg);
  const ey: Vec3 = [Math.cos(sa) * Math.cos(ta), Math.sin(sa) * Math.cos(ta), -Math.sin(ta)];
  return { ex: cross(ez, ey), ey, ez };
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './frames/frames';
```

- [ ] **Step 4: Run the tests**

Run: `bun run test packages/view-engine/test/frames.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): REFSMMAT/gimbal/optics frames from Comanche055; SCT plot axes"
```

---

### Task 7: Ephemeris

**Files:**
- Create: `packages/view-engine/src/ephemeris/ephemeris.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/ephemeris.test.ts`

**Interfaces:**
- Consumes: `astronomy-engine` (`Body`, `GeoMoon`, `GeoVector`, `MakeTime`); Task 3 `precessionMatrix`.
- Produces: `BodyName = 'sun' | 'moon' | 'earth' | 'venus' | 'mars' | 'jupiter' | 'saturn'`; `Observer = 'earth' | 'moon'`; `BODY_LABEL: Record<BodyName, string>`; `bodyVectorJ2000Au(body, observer, utc): Vec3`; `bodyDirection(body, observer, utc, epochJd): Vec3`; `bodyAngularRadiusDeg(body, observer, utc): number`.

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/ephemeris.test.ts`

The fixtures are JPL Horizons vectors: Moon-centered (500@301), ICRF, light-time corrected, in AU, at 1969-07-21 18:12 UT.
```ts
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
    expect(() => bodyAngularRadiusDeg('moon', 'moon', UTC)).toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test packages/view-engine/test/ephemeris.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `packages/view-engine/src/ephemeris/ephemeris.ts`

```ts
import { Body, GeoMoon, GeoVector, MakeTime } from 'astronomy-engine';
import { mxv } from '../math/mat';
import { norm, sub, toDeg, unit, type Vec3 } from '../math/vec';
import { precessionMatrix } from '../catalog/precession';

export type BodyName = 'sun' | 'moon' | 'earth' | 'venus' | 'mars' | 'jupiter' | 'saturn';
export type Observer = 'earth' | 'moon';

export const BODY_LABEL: Record<BodyName, string> = {
  sun: 'Sun', moon: 'Moon', earth: 'Earth', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};

const AE_BODY = { sun: Body.Sun, venus: Body.Venus, mars: Body.Mars, jupiter: Body.Jupiter, saturn: Body.Saturn } as const;
const RADIUS_KM: Record<BodyName, number> = {
  sun: 695700, moon: 1737.4, earth: 6378.137, venus: 6051.8, mars: 3389.5, jupiter: 69911, saturn: 58232,
};
const AU_KM = 149597870.7;

function geocentric(body: BodyName, utc: Date): Vec3 {
  if (body === 'earth') return [0, 0, 0];
  const t = MakeTime(utc);
  const v = body === 'moon' ? GeoMoon(t) : GeoVector(AE_BODY[body], t, false);
  return [v.x, v.y, v.z];
}

/** Observer → body vector in AU, J2000 mean equator (EQJ). */
export function bodyVectorJ2000Au(body: BodyName, observer: Observer, utc: Date): Vec3 {
  if (body === observer) throw new Error(`observer ${observer} cannot view itself`);
  return sub(geocentric(body, utc), geocentric(observer, utc));
}

/** Unit direction at the mean equator/equinox of `epochJd` (the platform reference frame). */
export function bodyDirection(body: BodyName, observer: Observer, utc: Date, epochJd: number): Vec3 {
  return unit(mxv(precessionMatrix(epochJd), bodyVectorJ2000Au(body, observer, utc)));
}

export function bodyAngularRadiusDeg(body: BodyName, observer: Observer, utc: Date): number {
  return toDeg(Math.asin(RADIUS_KM[body] / (norm(bodyVectorJ2000Au(body, observer, utc)) * AU_KM)));
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './ephemeris/ephemeris';
```

- [ ] **Step 4: Run the tests**

Run: `bun run test packages/view-engine/test/ephemeris.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): body directions via astronomy-engine, precessed to platform epoch"
```

---
### Task 8: Scene (ViewSpec → DisplayList) and the Fig 3a spec

**Files:**
- Create: `packages/view-engine/src/scene/types.ts`, `packages/view-engine/src/scene/scene.ts`
- Modify: `packages/view-engine/src/missions/apollo11.ts` (add `FIG_3A_SPEC`), `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/scene.test.ts`

**Interfaces:**
- Consumes: `resolveCatalog`/`ResolvedStar` (Task 4), `projectAzimuthalEquidistant` (Task 5), `referenceToOptics`, `sctPlotAxes`, `SCT_FIELD_OF_VIEW_DEG`, `GimbalAngles` (Task 6), `bodyDirection`, `bodyAngularRadiusDeg`, `BODY_LABEL`, `BodyName`, `Observer` (Task 7), `getToUtc` (Task 2).
- Produces: `ViewSpec`, `Primitive`, `Layer`, `PlacedBody`, `DisplayList`, `SceneData`, `buildScene(spec, data): DisplayList`, `SCT_SCALE`, `FIG_3A_SPEC`.

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/scene.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, buildScene, FIG_3A_SPEC, resolveCatalog,
  type Agc37File, type BscFile, type DisplayList, type RtccFile,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

function allFinite(dl: DisplayList): boolean {
  return dl.primitives.every((p) => {
    const nums = p.kind === 'polyline' ? p.points.flat()
      : p.kind === 'text' ? [p.x, p.y, p.sizeDeg]
      : p.kind === 'disc' ? [p.x, p.y, p.r]
      : [p.x, p.y];
    return nums.every(Number.isFinite);
  });
}

describe('buildScene: Fig 3a', () => {
  const dl = buildScene(FIG_3A_SPEC, { stars });
  it('places every body the 1972 figure labels', () => {
    const labels = new Set(dl.placed.map((b) => b.label));
    for (const name of ['Sirius', 'Rigel', 'Capella', 'Aldebaran', 'Mirfak', 'Menkar', 'Navi', 'Alpheratz', 'Diphda', 'Earth', 'Venus', 'Saturn']) {
      expect(labels, name).toContain(name);
    }
  });
  it('keeps everything inside the ±50° frame with finite coordinates', () => {
    for (const b of dl.placed) {
      expect(Math.abs(b.x)).toBeLessThanOrEqual(50);
      expect(Math.abs(b.y)).toBeLessThanOrEqual(50);
    }
    expect(allFinite(dl)).toBe(true);
  });
  it('converts 124:40:00 GET to 1969-07-21T18:12Z', () => {
    expect(dl.utc.toISOString()).toBe('1969-07-21T18:12:00.000Z');
  });
});

describe('buildScene: "try it" inputs', () => {
  it('renders finite geometry at and near gimbal lock', () => {
    for (const middle of [90, -90, 89.999]) {
      expect(allFinite(buildScene({ ...FIG_3A_SPEC, gimbals: { inner: 10, middle, outer: -170 } }, { stars }))).toBe(true);
    }
  });
  it('renders for a very large GET', () => {
    expect(allFinite(buildScene({ ...FIG_3A_SPEC, get: '9999:00:00' }, { stars }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test packages/view-engine/test/scene.test.ts`
Expected: FAIL (`buildScene` and `FIG_3A_SPEC` do not exist).

- [ ] **Step 3: Implement the types** `packages/view-engine/src/scene/types.ts`

```ts
import type { Mat3 } from '../math/mat';
import type { Vec3 } from '../math/vec';
import type { GimbalAngles } from '../frames/frames';
import type { BodyName, Observer } from '../ephemeris/ephemeris';

export interface ViewSpec {
  rangeZeroUtc: string;
  /** Ground elapsed time, "hhh:mm:ss". */
  get: string;
  /** 'moon' = the Moon's center (lunar orbit); the spacecraft's offset is not modeled. */
  observer: Observer;
  referenceEpochJd: number;
  refsmmat: Mat3;
  gimbals: GimbalAngles;
  instrument: { kind: 'sct'; shaftDeg: number; trunnionDeg: number };
  /** Half-width of the square plot in degrees (the 1969 figures use ±50°). */
  extentDeg: number;
  bodies: BodyName[];
  /** Annotation lines printed above the frame's left edge (e.g. the REFSMMAT name). */
  headerLeft: string[];
}

/** 'machine' = drawn by the 1969 program; 'annotation' = typed or lettered onto the published figure. */
export type Layer = 'machine' | 'annotation';

export type Primitive =
  | { kind: 'dot'; x: number; y: number }
  | { kind: 'navMark'; x: number; y: number }
  | { kind: 'disc'; x: number; y: number; r: number; filled: boolean }
  | { kind: 'polyline'; points: ReadonlyArray<readonly [number, number]>; closed: boolean; tone?: 'ink' | 'accent' }
  | { kind: 'text'; x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end'; sizeDeg: number; boxed: boolean; layer: Layer; rotate?: number };

export interface PlacedBody {
  id: string;
  label: string | null;
  kind: 'navStar' | 'star' | 'planet' | 'earth' | 'sun' | 'moon';
  x: number;
  y: number;
  /** Direction in the instrument (optics) frame. */
  direction: Vec3;
}

export interface DisplayList {
  extentDeg: number;
  utc: Date;
  primitives: Primitive[];
  placed: PlacedBody[];
  notes: string[];
}
```

- [ ] **Step 4: Implement** `packages/view-engine/src/scene/scene.ts`

```ts
import { mxv } from '../math/mat';
import type { ResolvedStar } from '../catalog/resolve';
import { BODY_LABEL, bodyAngularRadiusDeg, bodyDirection, type BodyName } from '../ephemeris/ephemeris';
import { referenceToOptics, SCT_FIELD_OF_VIEW_DEG, sctPlotAxes } from '../frames/frames';
import { projectAzimuthalEquidistant, type PlotPoint } from '../projection/projection';
import { getToUtc } from '../time/time';
import type { DisplayList, Layer, PlacedBody, Primitive, ViewSpec } from './types';

export interface SceneData { stars: ResolvedStar[] }

/** Frame tick labels printed on the 1969 plots (bottom and left edges). */
const TICK_LABELS = [-50, -40, -20, 0, 20, 40, 50];
const TEXT_DEG = 2.4;

/**
 * The 0–50 scale along the SCT reticle's vertical diameter, as drawn on TN D-6853 Fig 3
 * and 69-FM-197 Fig 9.3-8. Neither document explains it. 0 sits 25° below the center
 * (measured from the scans in Task 11).
 */
export const SCT_SCALE = { zeroAtYDeg: -25, stepDeg: 5, max: 50 } as const;

const text = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end', layer: Layer, opts: { boxed?: boolean; sizeDeg?: number; rotate?: number } = {}): Primitive =>
  ({ kind: 'text', x, y, text: t, anchor, layer, boxed: opts.boxed ?? false, sizeDeg: opts.sizeDeg ?? TEXT_DEG, rotate: opts.rotate });
const line = (x1: number, y1: number, x2: number, y2: number): Primitive =>
  ({ kind: 'polyline', points: [[x1, y1], [x2, y2]], closed: false });

function frame(e: number): Primitive[] {
  const out: Primitive[] = [{ kind: 'polyline', points: [[-e, -e], [e, -e], [e, e], [-e, e]], closed: true }];
  for (let v = -e + 2; v < e; v += 2) {
    const len = v % 10 === 0 ? 1.6 : 0.8;
    out.push(line(v, -e, v, -e + len), line(v, e, v, e - len), line(-e, v, -e + len, v), line(e, v, e - len, v));
  }
  for (const v of TICK_LABELS) {
    out.push(text(v, -e - 3, String(v), 'middle', 'machine'), text(-e - 1.4, v, String(v), 'end', 'machine'));
  }
  out.push(text(0, -e - 7, 'X, deg', 'middle', 'annotation'), text(-e - 9, 0, 'Y, deg', 'middle', 'annotation', { rotate: 90 }));
  return out;
}

function sctReticle(): Primitive[] {
  const r = SCT_FIELD_OF_VIEW_DEG / 2;
  const circle = Array.from({ length: 180 }, (_, i) => {
    const a = (i / 180) * 2 * Math.PI;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  });
  const out: Primitive[] = [{ kind: 'polyline', points: circle, closed: true }, line(0, -r, 0, r), line(-r, 0, r, 0)];
  for (let v = 0; v <= SCT_SCALE.max; v += SCT_SCALE.stepDeg) {
    const y = SCT_SCALE.zeroAtYDeg + v;
    out.push(line(-0.9, y, 0.9, y));
    if (Math.abs(y) > 1) out.push(text(1.6, y, String(v), 'start', 'machine', { sizeDeg: 2 }));
  }
  for (let x = -25; x <= 25; x += 5) if (x !== 0) out.push(line(x, -0.9, x, 0.9));
  return out;
}

function header(spec: ViewSpec): Primitive[] {
  const e = spec.extentDeg, g = spec.gimbals;
  const right = ['Gimbal angles', `I = ${g.inner.toFixed(1)}°`, `M = ${g.middle.toFixed(1)}°`, `O = ${g.outer.toFixed(1)}°`];
  const y = (i: number, n: number) => e + 2.5 + (n - 1 - i) * 3;
  return [
    ...spec.headerLeft.map((t, i) => text(-e, y(i, spec.headerLeft.length), t, 'start', 'annotation')),
    ...right.map((t, i) => text(e, y(i, right.length), t, 'end', 'annotation')),
  ];
}

const kindOf = (b: BodyName): PlacedBody['kind'] => (b === 'earth' || b === 'sun' || b === 'moon' ? b : 'planet');

export function buildScene(spec: ViewSpec, data: SceneData): DisplayList {
  const utc = getToUtc(spec.rangeZeroUtc, spec.get);
  const toOptics = referenceToOptics(spec.refsmmat, spec.gimbals);
  const axes = sctPlotAxes(spec.instrument.shaftDeg, spec.instrument.trunnionDeg);
  const e = spec.extentDeg;
  const inside = (p: PlotPoint) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= e && Math.abs(p.y) <= e;
  const primitives: Primitive[] = [...frame(e), ...sctReticle()];
  const placed: PlacedBody[] = [];

  for (const s of data.stars) {
    const direction = mxv(toOptics, s.direction);
    const p = projectAzimuthalEquidistant(direction, axes);
    if (!inside(p)) continue;
    if (s.navStar !== null) {
      primitives.push({ kind: 'navMark', x: p.x, y: p.y }, text(p.x + 1.2, p.y - 2.2, s.name ?? `Star ${s.navStar}`, 'start', 'annotation'));
      placed.push({ id: `nav-${s.navStar}`, label: s.name, kind: 'navStar', x: p.x, y: p.y, direction });
    } else {
      primitives.push({ kind: 'dot', x: p.x, y: p.y });
      placed.push({ id: `rtcc-${s.seq}`, label: null, kind: 'star', x: p.x, y: p.y, direction });
    }
  }

  for (const body of spec.bodies) {
    if (body === spec.observer) continue;
    const direction = mxv(toOptics, bodyDirection(body, spec.observer, utc, spec.referenceEpochJd));
    const p = projectAzimuthalEquidistant(direction, axes);
    if (!inside(p)) continue;
    const isDisc = body === 'earth' || body === 'sun' || body === 'moon';
    const r = isDisc ? Math.max(bodyAngularRadiusDeg(body, spec.observer, utc), 0.9) : 0.6;
    primitives.push(
      { kind: 'disc', x: p.x, y: p.y, r, filled: body === 'earth' },
      text(p.x + r + 0.8, p.y - r - 1.2, BODY_LABEL[body], 'start', 'annotation', { boxed: !isDisc }),
    );
    placed.push({ id: body, label: BODY_LABEL[body], kind: kindOf(body), x: p.x, y: p.y, direction });
  }

  primitives.push(...header(spec));
  const notes = spec.observer === 'moon'
    ? ['The observer is the Moon’s center: the spacecraft’s orbital offset (< 0.3° for Earth) and lunar occlusion are not modeled.']
    : [];
  return { extentDeg: e, utc, primitives, placed, notes };
}
```

- [ ] **Step 5: Add `FIG_3A_SPEC`**

Append to `packages/view-engine/src/missions/apollo11.ts`:
```ts
import type { ViewSpec } from '../scene/types';

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
```
(Move the new `import type` line to the top of the file, next to the existing imports.)

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './scene/types';
export * from './scene/scene';
```

- [ ] **Step 6: Run the tests**

Run: `bun run test packages/view-engine/test/scene.test.ts && bun run typecheck`
Expected: PASS. If a labeled body is missing from the view, **stop**: the chain disagrees with the 1969 figure. Record which bodies are missing and where they land, then report under the stop rule before continuing.

- [ ] **Step 7: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): buildScene with SCT reticle, frame, stars and bodies; Fig 3a spec"
```

---

### Task 9: SVG plotter

**Files:**
- Create: `packages/view-engine/src/plotter/svg.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/plotter.test.ts`

**Interfaces:**
- Consumes: `DisplayList`, `Primitive` (Task 8).
- Produces:
  - `toGrid(x, y, extentDeg, grid): [number, number]`
  - `Underlay { href, widthPx, heightPx, frame: { leftX, rightX, topY, bottomY }, opacity, invert }`
  - `PlotOptions { grid?: 1024 | 4096; style?: 'microfilm' | 'print'; labels?: boolean; underlay?: Underlay; showPrimitives?: boolean; title?: string }`
  - `renderSvg(dl, opts): string`

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/plotter.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { renderSvg, toGrid, type DisplayList } from '../src/index';

const dl: DisplayList = {
  extentDeg: 50,
  utc: new Date('1969-07-21T18:12:00Z'),
  placed: [],
  notes: [],
  primitives: [
    { kind: 'polyline', points: [[-50, -50], [50, -50], [50, 50], [-50, 50]], closed: true },
    { kind: 'dot', x: 10, y: 10 },
    { kind: 'navMark', x: -20, y: 5 },
    { kind: 'disc', x: 0, y: -23, r: 0.95, filled: true },
    { kind: 'text', x: 0, y: -53, text: '0', anchor: 'middle', sizeDeg: 2.4, boxed: false, layer: 'machine' },
    { kind: 'text', x: -18, y: 3, text: 'Sirius & <Co>', anchor: 'start', sizeDeg: 2.4, boxed: true, layer: 'annotation' },
    { kind: 'polyline', points: [[0, 0], [5, 5]], closed: false, tone: 'accent' },
  ],
};

describe('toGrid', () => {
  it('maps the ±50° frame onto 0..grid−1 with y down', () => {
    expect(toGrid(-50, 50, 50, 1024)).toEqual([0, 0]);
    expect(toGrid(50, -50, 50, 1024)).toEqual([1023, 1023]);
    expect(toGrid(0, 0, 50, 4096)).toEqual([2048, 2048]);
  });
});

describe('renderSvg', () => {
  it('draws microfilm (white on black) and print (black on white)', () => {
    expect(renderSvg(dl, { style: 'microfilm' })).toContain('fill="#050505"');
    expect(renderSvg(dl, { style: 'print' })).toContain('fill="#ffffff"');
  });
  it('shows annotation text only when labels are on, and always shows machine text', () => {
    expect(renderSvg(dl, { labels: false })).not.toContain('Sirius');
    const on = renderSvg(dl, { labels: true });
    expect(on).toContain('Sirius &amp; &lt;Co&gt;');
    expect(renderSvg(dl, { labels: false })).toContain('>0</text>');
  });
  it('places an underlay so the scan frame lands on the plot frame', () => {
    const svg = renderSvg(dl, {
      underlay: { href: '/scans/x.png', widthPx: 1200, heightPx: 1100, frame: { leftX: 100, rightX: 1123, topY: 50, bottomY: 1073 }, opacity: 0.5, invert: true },
    });
    expect(svg).toContain('<image href="/scans/x.png" x="-100.00" y="-50.00" width="1200.00" height="1100.00"');
    expect(svg).toContain('filter:invert(1)');
  });
  it('can hide the recreation (original-only mode) and never emits NaN', () => {
    expect(renderSvg(dl, { showPrimitives: false })).not.toContain('<circle');
    expect(renderSvg(dl)).not.toContain('NaN');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test packages/view-engine/test/plotter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `packages/view-engine/src/plotter/svg.ts`

```ts
import type { DisplayList, Primitive } from '../scene/types';

export interface Underlay {
  href: string;
  widthPx: number;
  heightPx: number;
  /** Pixel positions of the scan's ±extent frame lines. */
  frame: { leftX: number; rightX: number; topY: number; bottomY: number };
  opacity: number;
  invert: boolean;
}

export interface PlotOptions {
  /** Recorder raster: 1024 (SC-4020 class) or 4096 (SC-4060 class). */
  grid?: 1024 | 4096;
  style?: 'microfilm' | 'print';
  labels?: boolean;
  underlay?: Underlay;
  showPrimitives?: boolean;
  title?: string;
}

const PALETTE = {
  microfilm: { bg: '#050505', ink: '#f1f0ea', accent: '#ff6a3d' },
  print: { bg: '#ffffff', ink: '#141414', accent: '#d9480f' },
} as const;

/** Plot degrees → recorder raster coordinates (integer, y down), as the CRT recorder addressed them. */
export function toGrid(x: number, y: number, extentDeg: number, grid: number): [number, number] {
  const s = (grid - 1) / (2 * extentDeg);
  return [Math.round((x + extentDeg) * s), Math.round((extentDeg - y) * s)];
}

const esc = (t: string): string =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderSvg(dl: DisplayList, opts: PlotOptions = {}): string {
  const grid = opts.grid ?? 1024;
  const c = PALETTE[opts.style ?? 'microfilm'];
  const labels = opts.labels ?? true;
  const e = dl.extentDeg;
  const s = (grid - 1) / (2 * e);
  const m = Math.round(grid * 0.16);
  const sw = (grid / 512).toFixed(2);
  const g = (x: number, y: number) => toGrid(x, y, e, grid);
  const parts: string[] = [`<rect x="${-m}" y="${-m}" width="${grid + 2 * m}" height="${grid + 2 * m}" fill="${c.bg}"/>`];

  if (opts.underlay) {
    const u = opts.underlay;
    const sx = (grid - 1) / (u.frame.rightX - u.frame.leftX);
    const sy = (grid - 1) / (u.frame.bottomY - u.frame.topY);
    parts.push(
      `<image href="${esc(u.href)}" x="${(-u.frame.leftX * sx).toFixed(2)}" y="${(-u.frame.topY * sy).toFixed(2)}" ` +
      `width="${(u.widthPx * sx).toFixed(2)}" height="${(u.heightPx * sy).toFixed(2)}" preserveAspectRatio="none" ` +
      `opacity="${u.opacity}"${u.invert ? ' style="filter:invert(1)"' : ''}/>`,
    );
  }

  const draw = (p: Primitive): string | null => {
    switch (p.kind) {
      case 'dot': {
        const [x, y] = g(p.x, p.y);
        return `<circle cx="${x}" cy="${y}" r="${(grid / 400).toFixed(2)}" fill="${c.ink}"/>`;
      }
      case 'navMark': {
        const [x, y] = g(p.x, p.y);
        const a = Math.round(grid / 110), d = Math.round(a * 0.7);
        return `<path d="M${x - a} ${y}H${x + a}M${x} ${y - a}V${y + a}M${x - d} ${y - d}L${x + d} ${y + d}M${x - d} ${y + d}L${x + d} ${y - d}" stroke="${c.ink}" stroke-width="${sw}"/>`;
      }
      case 'disc': {
        const [x, y] = g(p.x, p.y);
        const r = Math.max(2, Math.round(p.r * s));
        return p.filled
          ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.ink}"/>`
          : `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c.ink}" stroke-width="${sw}"/>`;
      }
      case 'polyline': {
        const pts = p.points.map(([px, py]) => g(px, py).join(',')).join(' ');
        const accent = p.tone === 'accent';
        return `<${p.closed ? 'polygon' : 'polyline'} points="${pts}" fill="none" stroke="${accent ? c.accent : c.ink}" stroke-width="${accent ? (grid / 300).toFixed(2) : sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
      case 'text': {
        if (p.layer === 'annotation' && !labels) return null;
        const [x, y] = g(p.x, p.y);
        const size = Math.max(6, Math.round(p.sizeDeg * s));
        const rot = p.rotate ? ` transform="rotate(${-p.rotate} ${x} ${y})"` : '';
        const t = `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${p.anchor}" dominant-baseline="middle" fill="${c.ink}"${rot}>${esc(p.text)}</text>`;
        if (!p.boxed) return t;
        const w = Math.round(size * 0.62 * p.text.length + size * 0.5);
        const x0 = p.anchor === 'start' ? x - size * 0.25 : p.anchor === 'end' ? x - w + size * 0.25 : x - w / 2;
        return `<rect x="${x0.toFixed(1)}" y="${(y - size * 0.7).toFixed(1)}" width="${w}" height="${(size * 1.4).toFixed(1)}" fill="none" stroke="${c.ink}" stroke-width="${sw}"/>${t}`;
      }
    }
  };

  if (opts.showPrimitives ?? true) for (const p of dl.primitives) { const el = draw(p); if (el) parts.push(el); }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m} ${-m} ${grid + 2 * m} ${grid + 2 * m}" role="img" aria-label="${esc(opts.title ?? 'View program plot')}" font-family="ui-monospace, 'DejaVu Sans Mono', monospace">${parts.join('')}</svg>`;
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './plotter/svg';
```

- [ ] **Step 4: Run the tests**

Run: `bun run test packages/view-engine/test/plotter.test.ts && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Look at a real render**

Run:
```bash
mkdir -p tmp && bun -e "import {buildScene,renderSvg,resolveCatalog,FIG_3A_SPEC,APOLLO_11} from './packages/view-engine/src/index'; import bsc from './data/derived/bsc45.json'; import agc from './data/derived/agc37.json'; import rtcc from './data/derived/rtcc1970.json'; const s=resolveCatalog(rtcc as any,bsc as any,agc as any,APOLLO_11.referenceEpochJd); await Bun.write('tmp/fig3a.svg', renderSvg(buildScene(FIG_3A_SPEC,{stars:s}),{style:'print'}));" && magick -density 96 tmp/fig3a.svg tmp/fig3a.png
```
Then view `tmp/fig3a.png` next to the TN D-6853 figure (`pdftoppm -r 100 -f 10 -l 10 data/sources/tn-d-6853.pdf tmp/tn`).
Expected: the same stars in the same places, the Earth disc near (0, −23), and Venus and Saturn near the centerline.

- [ ] **Step 6: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): recorder-grid SVG plotter with microfilm/print styles and scan underlay"
```

---

### Task 10: Fit (validation tool)

**Files:**
- Create: `packages/view-engine/src/fit/eigen.ts`, `packages/view-engine/src/fit/fit.ts`
- Modify: `packages/view-engine/src/index.ts`
- Test: `packages/view-engine/test/fit.test.ts`

**Interfaces:**
- Consumes: `axesFromBoresight`, `projectAzimuthalEquidistant`, `unprojectAzimuthalEquidistant`, `PlotAxes` (Task 5); `transpose`, `mxv` (Task 1).
- Produces:
  - `symmetricEigen(a: number[][]): { values: number[]; vectors: number[][] }`
  - `solveWahba(b: Vec3[], r: Vec3[]): Mat3` (the rotation A minimizing Σ|bᵢ − A rᵢ|²)
  - `FitPoint { id, x, y, direction }`
  - `FitResult { axes, mirror, rmsDeg, maxDeg, residuals: { id, dx, dy, dist }[] }`
  - `fitPlotAxes(points): FitResult`
  - `residualsFor(points, axes)`
  - `impliedSctAngles(axes): { shaftDeg, trunnionDeg }`

- [ ] **Step 1: Write the failing test** `packages/view-engine/test/fit.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  fitPlotAxes, impliedSctAngles, scale, sctPlotAxes, symmetricEigen, unprojectAzimuthalEquidistant,
  type FitPoint, type PlotAxes,
} from '../src/index';

function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

function synthetic(axes: PlotAxes, noiseDeg: number, n = 14): FitPoint[] {
  const rnd = lcg(42);
  return Array.from({ length: n }, (_, i) => {
    const x = (rnd() - 0.5) * 80, y = (rnd() - 0.5) * 80;
    const direction = unprojectAzimuthalEquidistant({ x, y }, axes);
    return { id: `p${i}`, x: x + (rnd() - 0.5) * 2 * noiseDeg, y: y + (rnd() - 0.5) * 2 * noiseDeg, direction };
  });
}

describe('symmetricEigen', () => {
  it('satisfies A·v = λ·v', () => {
    const a = [[4, 1, 0, 2], [1, 3, 1, 0], [0, 1, 2, 1], [2, 0, 1, 5]];
    const { values, vectors } = symmetricEigen(a);
    values.forEach((lambda, k) => {
      const v = vectors[k]!;
      a.forEach((row, i) => expect(row.reduce((s, aij, j) => s + aij * v[j]!, 0)).toBeCloseTo(lambda * v[i]!, 10));
    });
  });
});

describe('fitPlotAxes', () => {
  it('recovers known SCT angles from noisy points', () => {
    const fit = fitPlotAxes(synthetic(sctPlotAxes(20, 15), 0.05));
    expect(fit.mirror).toBe(false);
    expect(fit.rmsDeg).toBeLessThan(0.1);
    const a = impliedSctAngles(fit.axes);
    expect(Math.abs(a.shaftDeg - 20)).toBeLessThan(0.2);
    expect(Math.abs(a.trunnionDeg - 15)).toBeLessThan(0.2);
  });
  it('detects a mirrored plot', () => {
    const t = sctPlotAxes(-40, 30);
    const fit = fitPlotAxes(synthetic({ ...t, ex: scale(t.ex, -1) }, 0.05));
    expect(fit.mirror).toBe(true);
    expect(fit.rmsDeg).toBeLessThan(0.1);
  });
  it('needs at least three points', () => {
    expect(() => fitPlotAxes(synthetic(sctPlotAxes(0, 0), 0, 2))).toThrow(/at least 3/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test packages/view-engine/test/fit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `packages/view-engine/src/fit/eigen.ts`

```ts
/** Eigen-decomposition of a real symmetric matrix (cyclic Jacobi). `vectors[k]` pairs with `values[k]`. */
export function symmetricEigen(input: number[][]): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 64; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p]![q]! ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!, akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p]![k]!, aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!, vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: a.map((row, i) => row[i]!), vectors: Array.from({ length: n }, (_, k) => v.map((row) => row[k]!)) };
}
```

- [ ] **Step 4: Implement** `packages/view-engine/src/fit/fit.ts`

```ts
import { mxv, transpose, type Mat3 } from '../math/mat';
import { toDeg, unit, type Vec3 } from '../math/vec';
import {
  axesFromBoresight, projectAzimuthalEquidistant, unprojectAzimuthalEquidistant, type PlotAxes,
} from '../projection/projection';
import { symmetricEigen } from './eigen';

export interface FitPoint { id: string; x: number; y: number; direction: Vec3 }
export interface FitResidual { id: string; dx: number; dy: number; dist: number }
export interface FitResult { axes: PlotAxes; mirror: boolean; rmsDeg: number; maxDeg: number; residuals: FitResidual[] }

function attitudeFromQuaternion([q1, q2, q3, q4]: number[]): Mat3 {
  const [a, b, c, d] = [q1!, q2!, q3!, q4!];
  const k = d * d - (a * a + b * b + c * c);
  return [
    [k + 2 * a * a, 2 * (a * b + d * c), 2 * (a * c - d * b)],
    [2 * (b * a - d * c), k + 2 * b * b, 2 * (b * c + d * a)],
    [2 * (c * a + d * b), 2 * (c * b - d * a), k + 2 * c * c],
  ];
}

/** Davenport's q-method: the rotation A minimizing Σ|bᵢ − A·rᵢ|². */
export function solveWahba(b: Vec3[], r: Vec3[]): Mat3 {
  // B = Σ bᵢ·rᵢᵀ
  const B: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  b.forEach((bi, i) => {
    const ri = r[i]!;
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) B[j][k] += bi[j] * ri[k];
  });
  const sigma = B[0][0] + B[1][1] + B[2][2];
  const z = [B[1][2] - B[2][1], B[2][0] - B[0][2], B[0][1] - B[1][0]];
  const K = [
    [2 * B[0][0] - sigma, B[0][1] + B[1][0], B[0][2] + B[2][0], z[0]],
    [B[1][0] + B[0][1], 2 * B[1][1] - sigma, B[1][2] + B[2][1], z[1]],
    [B[2][0] + B[0][2], B[2][1] + B[1][2], 2 * B[2][2] - sigma, z[2]],
    [z[0], z[1], z[2], sigma],
  ];
  const { values, vectors } = symmetricEigen(K);
  return attitudeFromQuaternion(vectors[values.indexOf(Math.max(...values))]!);
}

export function residualsFor(points: FitPoint[], axes: PlotAxes): Pick<FitResult, 'rmsDeg' | 'maxDeg' | 'residuals'> {
  const residuals = points.map((p) => {
    const q = projectAzimuthalEquidistant(p.direction, axes);
    const dx = q.x - p.x, dy = q.y - p.y;
    return { id: p.id, dx, dy, dist: Math.hypot(dx, dy) };
  });
  return {
    residuals,
    rmsDeg: Math.sqrt(residuals.reduce((s, r) => s + r.dist ** 2, 0) / residuals.length),
    maxDeg: Math.max(...residuals.map((r) => r.dist)),
  };
}

function fitWithHandedness(points: FitPoint[], mirror: boolean): FitResult {
  const canon = axesFromBoresight([0, 0, 1], [0, 1, 0], mirror);
  const a = solveWahba(points.map((p) => unprojectAzimuthalEquidistant(p, canon)), points.map((p) => unit(p.direction)));
  const at = transpose(a);
  const axes = { ex: mxv(at, canon.ex), ey: mxv(at, canon.ey), ez: mxv(at, canon.ez) };
  return { axes, mirror, ...residualsFor(points, axes) };
}

/** Best plot axes (and handedness) mapping known directions onto measured plot points. */
export function fitPlotAxes(points: FitPoint[]): FitResult {
  if (points.length < 3) throw new Error('fitPlotAxes(): need at least 3 points');
  const plain = fitWithHandedness(points, false), mirrored = fitWithHandedness(points, true);
  return plain.rmsDeg <= mirrored.rmsDeg ? plain : mirrored;
}

/** Shaft and trunnion implied by SCT plot axes given in the optics frame (see sctPlotAxes). */
export function impliedSctAngles(axes: PlotAxes): { shaftDeg: number; trunnionDeg: number } {
  return {
    trunnionDeg: toDeg(Math.acos(Math.max(-1, Math.min(1, axes.ez[2])))),
    shaftDeg: toDeg(Math.atan2(axes.ey[1], axes.ey[0])),
  };
}
```

Append to `packages/view-engine/src/index.ts`:
```ts
export * from './fit/eigen';
export * from './fit/fit';
```

- [ ] **Step 5: Run the tests**

Run: `bun run test packages/view-engine/test/fit.test.ts && bun run typecheck`
Expected: PASS. If the rotation comes out transposed (rms of tens of degrees), the quaternion→matrix convention is inverted. Fix `attitudeFromQuaternion` by transposing its result, and rerun. The known-answer test is the arbiter.

- [ ] **Step 6: Commit**

```bash
git add packages/view-engine
git commit -m "feat(engine): q-method plot-axes fit and implied SCT angles"
```

---

### Task 11: Extract and digitize the Fig 3a scan

**Files:**
- Create: `scripts/lib/png.ts`, `scripts/lib/digitize.ts`, `scripts/extract-figures.ts`, `scripts/digitize-fig3a.ts`
- Create: `data/manual/fig3a-names.json`
- Create (generated): `data/derived/scans/tnd6853-fig3a.png`, `data/derived/fig3a-points.json`
- Modify: `package.json` (add `pngjs`, `@types/pngjs` dev dependencies)
- Test: `scripts/test/digitize.test.ts`

**Interfaces:**
- Produces: `GrayImage { width, height, data: Uint8Array }`, `readGray`, `writeGray`, `crop`; `Frame { leftX, rightX, topY, bottomY }`, `Blob { cx, cy, area, w, h }`, `findFrame(img)`, `findBlobs(img, frame, inset?, maxSizePx?)`, `pxToDeg(frame, px, py, extentDeg?)`, `snapToBlob(blobs, approx, maxDistPx?, minArea?)`.
- `fig3a-points.json = { provenance, image: { path, widthPx, heightPx }, frame, extentDeg: 50, points: [{ id, kind, px: [x, y], xDeg, yDeg, area }] }`

- [ ] **Step 1: Install pngjs**

Run: `bun add -d pngjs@^7.0.0 @types/pngjs@^6.0.5`

- [ ] **Step 2: Write the failing test** `scripts/test/digitize.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { findBlobs, findFrame, pxToDeg, snapToBlob } from '../lib/digitize';
import type { GrayImage } from '../lib/png';

function synthetic(): GrayImage {
  const w = 400, h = 400, data = new Uint8Array(w * h).fill(255);
  const dark = (x: number, y: number) => { data[y * w + x] = 0; };
  for (let y = 40; y <= 340; y++) for (const x of [50, 51, 350, 351]) dark(x, y);
  for (let x = 50; x <= 351; x++) for (const y of [40, 41, 340, 341]) dark(x, y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { dark(200 + dx, 190 + dy); dark(100 + dx, 300 + dy); }
  return { width: w, height: h, data };
}

describe('digitize', () => {
  const img = synthetic();
  const frame = findFrame(img);
  it('finds the frame lines to sub-pixel precision', () => {
    expect(frame.leftX).toBeCloseTo(50.5, 0);
    expect(frame.rightX).toBeCloseTo(350.5, 0);
    expect(frame.topY).toBeCloseTo(40.5, 0);
    expect(frame.bottomY).toBeCloseTo(340.5, 0);
  });
  it('finds dot blobs inside the frame and snaps to them', () => {
    const blobs = findBlobs(img, frame);
    expect(blobs).toHaveLength(2);
    const b = snapToBlob(blobs, [198, 193]);
    expect(b.cx).toBe(200);
    expect(b.cy).toBe(190);
    expect(() => snapToBlob(blobs, [20, 20])).toThrow(/no blob/);
  });
  it('maps pixels to plot degrees (frame center = origin)', () => {
    const p = pxToDeg(frame, (frame.leftX + frame.rightX) / 2, (frame.topY + frame.bottomY) / 2);
    expect(p.xDeg).toBeCloseTo(0, 9);
    expect(p.yDeg).toBeCloseTo(0, 9);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `bun run test scripts/test/digitize.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement** `scripts/lib/png.ts` and `scripts/lib/digitize.ts`

`scripts/lib/png.ts`:
```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export interface GrayImage { width: number; height: number; data: Uint8Array }

export function readGray(path: string): GrayImage {
  const png = PNG.sync.read(readFileSync(path));
  const data = new Uint8Array(png.width * png.height);
  for (let i = 0; i < data.length; i++) data[i] = png.data[i * 4]!;
  return { width: png.width, height: png.height, data };
}

export function writeGray(path: string, img: GrayImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  for (let i = 0; i < img.data.length; i++) {
    png.data[i * 4] = png.data[i * 4 + 1] = png.data[i * 4 + 2] = img.data[i]!;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
}

export function crop(img: GrayImage, x: number, y: number, w: number, h: number): GrayImage {
  const data = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) data.set(img.data.subarray((y + r) * img.width + x, (y + r) * img.width + x + w), r * w);
  return { width: w, height: h, data };
}
```

`scripts/lib/digitize.ts`:
```ts
import type { GrayImage } from './png';

export interface Frame { leftX: number; rightX: number; topY: number; bottomY: number }
export interface Blob { cx: number; cy: number; area: number; w: number; h: number }

const DARK = 128;

/** Weighted center of the strongest line in counts[from, to). */
function peak(counts: number[], from: number, to: number): number {
  let best = from;
  for (let i = from; i < to; i++) if (counts[i]! > counts[best]!) best = i;
  let sum = 0, weight = 0;
  for (let i = Math.max(from, best - 4); i <= Math.min(to - 1, best + 4); i++) {
    if (counts[i]! >= 0.5 * counts[best]!) { sum += i * counts[i]!; weight += counts[i]!; }
  }
  return sum / weight;
}

/** The plot frame: the strongest dark column/row in each outer third of the image. */
export function findFrame(img: GrayImage): Frame {
  const { width: w, height: h, data } = img;
  const cols = new Array<number>(w).fill(0), rows = new Array<number>(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[y * w + x] < DARK) { cols[x]++; rows[y]++; }
  return {
    leftX: peak(cols, 0, Math.floor(w / 3)),
    rightX: peak(cols, Math.ceil((2 * w) / 3), w),
    topY: peak(rows, 0, Math.floor(h / 3)),
    bottomY: peak(rows, Math.ceil((2 * h) / 3), h),
  };
}

/** 8-connected dark components strictly inside the frame, excluding large ones (reticle, text runs). */
export function findBlobs(img: GrayImage, frame: Frame, inset = 12, maxSizePx = 60): Blob[] {
  const { width: w, data } = img;
  const x0 = Math.ceil(frame.leftX + inset), x1 = Math.floor(frame.rightX - inset);
  const y0 = Math.ceil(frame.topY + inset), y1 = Math.floor(frame.bottomY - inset);
  const seen = new Uint8Array(data.length);
  const blobs: Blob[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const start = y * w + x;
      if (seen[start] || data[start]! >= DARK) continue;
      seen[start] = 1;
      const stack = [start];
      let sx = 0, sy = 0, n = 0, minX = x, maxX = x, minY = y, maxY = y;
      while (stack.length) {
        const j = stack.pop()!;
        const jx = j % w, jy = (j - jx) / w;
        sx += jx; sy += jy; n++;
        minX = Math.min(minX, jx); maxX = Math.max(maxX, jx); minY = Math.min(minY, jy); maxY = Math.max(maxY, jy);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = jx + dx, ny = jy + dy;
            if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
            const k = ny * w + nx;
            if (!seen[k] && data[k]! < DARK) { seen[k] = 1; stack.push(k); }
          }
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      if (bw <= maxSizePx && bh <= maxSizePx) blobs.push({ cx: sx / n, cy: sy / n, area: n, w: bw, h: bh });
    }
  }
  return blobs;
}

export function pxToDeg(frame: Frame, px: number, py: number, extentDeg = 50): { xDeg: number; yDeg: number } {
  return {
    xDeg: -extentDeg + (2 * extentDeg * (px - frame.leftX)) / (frame.rightX - frame.leftX),
    yDeg: extentDeg - (2 * extentDeg * (py - frame.topY)) / (frame.bottomY - frame.topY),
  };
}

export function snapToBlob(blobs: Blob[], approx: readonly [number, number], maxDistPx = 20, minArea = 6): Blob {
  let best: Blob | null = null, bestD = Infinity;
  for (const b of blobs) {
    if (b.area < minArea) continue;
    const d = Math.hypot(b.cx - approx[0], b.cy - approx[1]);
    if (d < bestD) { best = b; bestD = d; }
  }
  if (!best || bestD > maxDistPx) throw new Error(`no blob within ${maxDistPx}px of (${approx.join(', ')})`);
  return best;
}
```

- [ ] **Step 5: Run the tests**

Run: `bun run test scripts/test/digitize.test.ts`
Expected: PASS.

- [ ] **Step 6: Extract the figure**

`scripts/extract-figures.ts`:
```ts
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { crop, readGray, writeGray } from './lib/png';

/** Crop boxes are in 300-dpi page pixels; they must include the whole ±50° frame plus its tick labels. */
const FIGURES = [
  { id: 'tnd6853-fig3a', pdf: 'data/sources/tn-d-6853.pdf', page: 10, crop: { x: 150, y: 300, w: 1080, h: 1000 } },
];

mkdirSync('tmp/extract', { recursive: true });
mkdirSync('data/derived/scans', { recursive: true });
for (const f of FIGURES) {
  const prefix = `tmp/extract/${f.id}`;
  execFileSync('pdftoppm', ['-r', '300', '-gray', '-png', '-f', String(f.page), '-l', String(f.page), f.pdf, prefix]);
  const page = readdirSync('tmp/extract').find((n) => n.startsWith(`${f.id}-`))!;
  writeGray(`data/derived/scans/${f.id}.png`, crop(readGray(`tmp/extract/${page}`), f.crop.x, f.crop.y, f.crop.w, f.crop.h));
  console.log(`${f.id}.png written`);
}
```

Run: `bun scripts/extract-figures.ts`, then view `data/derived/scans/tnd6853-fig3a.png`.
Expected: the whole Fig 3a panel, including the frame, tick labels, the "Lunar lift-off REFSMMAT" header and the gimbal-angle block, with a small margin. If any part is clipped, adjust the crop box, rerun, and view again.

- [ ] **Step 7: Write the digitizer**

`scripts/digitize-fig3a.ts`:
```ts
import { mkdirSync, readFileSync } from 'node:fs';
import { findBlobs, findFrame, pxToDeg, snapToBlob } from './lib/digitize';
import { readGray, writeGray } from './lib/png';
import { today, writeJson } from './lib/provenance';

const IMAGE = 'data/derived/scans/tnd6853-fig3a.png';
const img = readGray(IMAGE);
const frame = findFrame(img);
const blobs = findBlobs(img, frame);

// Debug overlay for reading approximate positions: blob boxes drawn in mid-gray.
mkdirSync('tmp', { recursive: true });
const dbg = { ...img, data: img.data.slice() };
for (const b of blobs) {
  const x0 = Math.round(b.cx - b.w / 2 - 3), x1 = Math.round(b.cx + b.w / 2 + 3);
  const y0 = Math.round(b.cy - b.h / 2 - 3), y1 = Math.round(b.cy + b.h / 2 + 3);
  for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) dbg.data[y * img.width + x] = 150;
  for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) dbg.data[y * img.width + x] = 150;
}
writeGray('tmp/fig3a-blobs.png', dbg);

const names = JSON.parse(readFileSync('data/manual/fig3a-names.json', 'utf8')) as Record<string, { kind: string; approxPx: [number, number] } | string>;
const points = Object.entries(names)
  .filter((e): e is [string, { kind: string; approxPx: [number, number] }] => typeof e[1] !== 'string')
  .map(([id, v]) => {
    const b = snapToBlob(blobs, v.approxPx);
    return { id, kind: v.kind, px: [+b.cx.toFixed(2), +b.cy.toFixed(2)], ...pxToDeg(frame, b.cx, b.cy), area: b.area };
  });

const src = JSON.parse(readFileSync('data/sources/sources.json', 'utf8')).find((s: { file: string }) => s.file === 'tn-d-6853.pdf');
writeJson('data/derived/fig3a-points.json', {
  provenance: {
    sources: [{ url: src.url, retrieved: src.retrieved, sha256: src.sha256 }],
    method: 'TN D-6853 PDF p. 10 rendered at 300 dpi (pdftoppm) and cropped (scripts/extract-figures.ts). The frame is registered from its ±50° border lines; each labeled glyph is snapped to the nearest detected dark blob from a hand-read approximate position (data/manual/fig3a-names.json).',
    script: 'scripts/digitize-fig3a.ts',
    generated: today(),
  },
  image: { path: IMAGE, widthPx: img.width, heightPx: img.height },
  frame,
  extentDeg: 50,
  points,
});
console.log(`frame ${JSON.stringify(frame)}; ${blobs.length} blobs; ${points.length} points`);
```

- [ ] **Step 8: Read positions and write the name map**

1. Create `data/manual/fig3a-names.json` with only a comment:
   ```json
   { "_comment": "Approximate pixel positions (in data/derived/scans/tnd6853-fig3a.png) of each labeled body's glyph, read by eye from tmp/fig3a-blobs.png. digitize-fig3a snaps each to the nearest detected blob within 20 px." }
   ```
2. Run `bun scripts/digitize-fig3a.ts`. It writes `tmp/fig3a-blobs.png` with 0 points.
3. Open `tmp/fig3a-blobs.png`. For each body labeled on the 1972 figure, add an entry with the approximate center of its glyph (the asterisk, the Earth dot or the planet mark), not its text label. The bodies are Sirius, Rigel, Capella, Aldebaran, Venus, Mirfak, Menkar, Saturn, Navi, Earth, Alpheratz and Diphda. Example entry: `"Sirius": { "kind": "navStar", "approxPx": [118, 72] }`. Kinds are `navStar`, `planet` and `earth`.
4. Rerun `bun scripts/digitize-fig3a.ts`.
   Expected: `12 points`, and a frame roughly 1000 px wide. Any snapping error names the body; fix its approximate position.
5. While the scan is open, measure the SCT scale. Take the pixel y of the "0" tick and the "50" tick on the reticle's vertical line, and convert them with the reported frame: `yDeg = 50 − 100·(py − topY)/(bottomY − topY)`. If the "0" tick is more than 0.5° from −25°, update `SCT_SCALE.zeroAtYDeg` in `scene.ts` and note the measurement in its comment.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock scripts data/manual/fig3a-names.json data/derived/scans data/derived/fig3a-points.json packages/view-engine
git commit -m "feat(data): extract and digitize TN D-6853 Fig 3a (registered frame + 12 labeled bodies)"
```

---

### Task 12: Golden validation against Fig 3a (the POC's answer)

**Files:**
- Test: `packages/view-engine/test/golden-fig3a.test.ts`

**Interfaces:**
- Consumes: `buildScene`, `FIG_3A_SPEC`, `resolveCatalog`, `fitPlotAxes`, `impliedSctAngles`; `fig3a-points.json` (Task 11).

- [ ] **Step 1: Write the golden test**

```ts
import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, buildScene, FIG_3A_SPEC, fitPlotAxes, impliedSctAngles, resolveCatalog,
  type Agc37File, type BscFile, type RtccFile,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import scan from '../../../data/derived/fig3a-points.json';

const RMS_MAX_DEG = 1.0;
const WORST_MAX_DEG = 2.0;

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);
const dl = buildScene(FIG_3A_SPEC, { stars });
const rows = scan.points.map((p) => {
  const b = dl.placed.find((q) => q.label === p.id);
  if (!b) throw new Error(`${p.id} is labeled on the 1972 figure but not placed by the recreation`);
  return { id: p.id, scanX: p.xDeg, scanY: p.yDeg, modelX: b.x, modelY: b.y, dist: Math.hypot(b.x - p.xDeg, b.y - p.yDeg), direction: b.direction };
});
const rms = Math.sqrt(rows.reduce((s, r) => s + r.dist ** 2, 0) / rows.length);
const worst = Math.max(...rows.map((r) => r.dist));

describe('golden: TN D-6853 Figure 3a from 1969 inputs', () => {
  it('covers every labeled body', () => {
    expect(rows.length).toBe(12);
  });
  it(`matches the 1972 scan (RMS ≤ ${RMS_MAX_DEG}°, max ≤ ${WORST_MAX_DEG}°)`, () => {
    console.table(rows.map(({ direction: _d, ...r }) => ({ ...r, dist: +r.dist.toFixed(2) })));
    console.log(`RMS ${rms.toFixed(3)}°, max ${worst.toFixed(3)}°`);
    expect(rms).toBeLessThanOrEqual(RMS_MAX_DEG);
    expect(worst).toBeLessThanOrEqual(WORST_MAX_DEG);
  });
  it('an unconstrained fit of the scan recovers the SCT at rest (trunnion ≈ 0°, shaft ≈ 0°, as-seen)', () => {
    const fit = fitPlotAxes(rows.map((r) => ({ id: r.id, x: r.scanX, y: r.scanY, direction: r.direction })));
    const a = impliedSctAngles(fit.axes);
    console.log(`fit: mirror=${fit.mirror} shaft=${a.shaftDeg.toFixed(2)}° trunnion=${a.trunnionDeg.toFixed(2)}° rms=${fit.rmsDeg.toFixed(3)}°`);
    expect(fit.mirror).toBe(false);
    expect(a.trunnionDeg).toBeLessThan(3);
    expect(Math.abs(a.shaftDeg)).toBeLessThan(5);
  });
});
```

- [ ] **Step 2: Run it**

Run: `bun run test packages/view-engine/test/golden-fig3a.test.ts`
Expected: PASS, printing the residual table (RMS well under 1°).

**Stop rule:** if either threshold fails, do **not** change inputs, catalogs, conventions or thresholds to make it pass. Stop and report to the user:
- the residual table;
- whether the misfit is systematic (a common offset or rotation, checked via the fit's recovered angles and RMS) or confined to single bodies (a digitization or name error);
- the candidate causes: observer offset, epoch, reticle registration, scan distortion.

- [ ] **Step 3: Commit**

```bash
git add packages/view-engine/test/golden-fig3a.test.ts
git commit -m "test: golden validation of Fig 3a against the 1972 scan"
```

---
### Task 13: Site scaffold, content model and home page

**Files:**
- Create: `site/package.json`, `site/astro.config.mjs`, `site/tsconfig.json`
- Create: `site/src/styles/global.css`, `site/src/layouts/Base.astro`, `site/src/components/ProvenanceBadge.astro`
- Create: `site/src/content.config.ts`, `site/src/content/documents.json`, `site/src/content/entries/view-program.md`, `site/src/content/exhibits/fig-3a.md`
- Create: `site/src/pages/index.astro`
- Create: `scripts/sync-public.ts`
- Modify: `package.json` (add the `dev`, `build` and `check:site` scripts)

**Interfaces:**
- Produces the collections `entries`, `documents` and `exhibits`, using the schemas below. Later pages rely on these fields: `entries.data.{title, era, provenanceTier, summary, people, sources, film, documents, exhibits}`; `documents.data.{title, reportNumber, date, authors, pdf, sourceUrl, pageCount, anchors}`; `exhibits.data.{title, entry, summary, figureRefs[{document, anchor}]}`.

- [ ] **Step 1: Site package and config**

`site/package.json`:
```json
{
  "name": "site",
  "private": true,
  "type": "module",
  "scripts": { "dev": "astro dev", "build": "astro build", "preview": "astro preview", "check": "astro check" },
  "dependencies": {
    "@asl/view-engine": "workspace:*",
    "@astrojs/react": "^7.0.0",
    "@tailwindcss/vite": "^4.3.3",
    "astro": "^7.3.5",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "typescript": "^5.9.3"
  }
}
```

`site/astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  // The exhibit imports data/derived/*.json from the repo root.
  vite: { plugins: [tailwindcss()], server: { fs: { allow: ['..'] } } },
});
```

`site/tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "react", "resolveJsonModule": true }
}
```

Add to the root `package.json` `scripts`:
```json
"dev": "bun scripts/sync-public.ts && cd site && bun run dev",
"build": "bun scripts/sync-public.ts && cd site && bun run build",
"check:site": "cd site && bun run check"
```

`scripts/sync-public.ts`:
```ts
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

// The site serves the primary-source PDFs and figure scans; data/ stays the single source of truth.
for (const [from, to, ext] of [['data/sources', 'site/public/docs', '.pdf'], ['data/derived/scans', 'site/public/scans', '.png']] as const) {
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from).filter((n) => n.endsWith(ext))) copyFileSync(`${from}/${f}`, `${to}/${f}`);
}
console.log('public/docs and public/scans synced');
```

Run: `bun install`
Expected: the Astro, React and Tailwind dependencies install into the workspace.

- [ ] **Step 2: Styles, layout and badge**

`site/src/styles/global.css`:
```css
@import "tailwindcss";

:root { color-scheme: light dark; }

/* Minimal long-form styles for rendered Markdown (no typography plugin). */
.prose-lite h2 { margin-top: 2.5rem; margin-bottom: 0.75rem; font-size: 1.25rem; font-weight: 600; }
.prose-lite p, .prose-lite ul, .prose-lite ol { margin-top: 0.75rem; line-height: 1.65; max-width: 70ch; }
.prose-lite ul { list-style: disc; padding-left: 1.25rem; }
.prose-lite ol { list-style: decimal; padding-left: 1.25rem; }
.prose-lite li + li { margin-top: 0.35rem; }
.prose-lite a { text-decoration: underline; text-underline-offset: 2px; }
.prose-lite code { font-family: ui-monospace, monospace; font-size: 0.9em; }
```

`site/src/layouts/Base.astro`:
```astro
---
import '../styles/global.css';

interface Props { title: string; description?: string }
const { title, description = 'Working recreations of Apollo-era software, each with its history and primary sources.' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title} · Apollo Software Library</title>
  </head>
  <body class="min-h-screen bg-stone-50 text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
    <header class="border-b border-stone-300 dark:border-stone-800">
      <nav class="mx-auto flex max-w-6xl items-baseline justify-between px-4 py-4">
        <a href="/" class="font-mono text-sm uppercase tracking-widest">Apollo Software Library</a>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-10">
      <slot />
    </main>
    <footer class="mx-auto max-w-6xl px-4 py-10 text-sm text-stone-500">
      Primary sources are NASA public-domain documents. Each recreation is labeled by how close it is to the original.
    </footer>
  </body>
</html>
```

`site/src/components/ProvenanceBadge.astro`:
```astro
---
interface Props { tier: 1 | 2 | 3 }
const LABELS = {
  1: 'Emulated from original code',
  2: 'Rebuilt from documented algorithms',
  3: 'Rebuilt from documents and output',
} as const;
const { tier } = Astro.props;
---
<span class="inline-flex items-center gap-2 rounded-full border border-stone-400 px-3 py-1 font-mono text-xs uppercase tracking-wide dark:border-stone-600">
  <span class="text-stone-500">Tier {tier}</span>
  <span>{LABELS[tier]}</span>
</span>
```

- [ ] **Step 3: Content model**

`site/src/content.config.ts`:
```ts
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

const link = z.object({ label: z.string(), url: z.string() });

const documents = defineCollection({
  loader: file('src/content/documents.json'),
  schema: z.object({
    title: z.string(),
    reportNumber: z.string(),
    date: z.string(),
    authors: z.array(z.string()),
    pdf: z.string(),
    sourceUrl: z.string(),
    pageCount: z.number(),
    anchors: z.record(z.string(), z.object({ page: z.number(), label: z.string() })),
  }),
});

const exhibits = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/exhibits' }),
  schema: z.object({
    title: z.string(),
    entry: z.string(),
    summary: z.string(),
    figureRefs: z.array(z.object({ document: reference('documents'), anchor: z.string() })),
  }),
});

const entries = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/entries' }),
  schema: z.object({
    title: z.string(),
    era: z.string(),
    provenanceTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    summary: z.string(),
    people: z.array(z.object({ name: z.string(), role: z.string() })),
    sources: z.array(link),
    film: link.optional(),
    documents: z.array(reference('documents')),
    exhibits: z.array(reference('exhibits')),
  }),
});

export const collections = { documents, exhibits, entries };
```

`site/src/content/documents.json`:
```json
[
  {
    "id": "tn-d-6853",
    "title": "Apollo Experience Report – The Application of a Computerized Visualization Capability to Lunar Missions",
    "reportNumber": "NASA TN D-6853",
    "date": "June 1972",
    "authors": ["Charles T. Hyle", "Alfred N. Lunde"],
    "pdf": "/docs/tn-d-6853.pdf",
    "sourceUrl": "https://ntrs.nasa.gov/citations/19720017950",
    "pageCount": 19,
    "anchors": {
      "cover": { "page": 1, "label": "Cover" },
      "fig3a": { "page": 10, "label": "Figure 3 – Views through the scanning telescope (printed p. 5)" },
      "appendix": { "page": 17, "label": "Appendix – Lunar-mission view-program capabilities (printed p. 12)" }
    }
  },
  {
    "id": "69-fm-197",
    "title": "Revision 1 to Views from the CM and LM During the Flight of Apollo 11 (Mission G)",
    "reportNumber": "MSC Internal Note 69-FM-197",
    "date": "3 July 1969",
    "authors": ["A. N. Lunde"],
    "pdf": "/docs/69-fm-197.pdf",
    "sourceUrl": "https://www.ibiblio.org/apollo/Documents/19740073250.pdf",
    "pageCount": 321,
    "anchors": {
      "refsmmat": { "page": 38, "label": "Table II – Mission REFSMMATs (printed p. 21)" },
      "fig-9-3-8": { "page": 290, "label": "Figure 9.3-8 – Scanning telescope, rev 30 (printed p. 272)" },
      "rtcc-catalogue": { "page": 309, "label": "RTCC star catalogue for Besselian year 1970 (printed p. 291)" }
    }
  },
  {
    "id": "69-fm-107",
    "title": "Views from the Spacecraft During Apollo 10 (Mission F)",
    "reportNumber": "MSC Internal Note 69-FM-107",
    "date": "22 April 1969",
    "authors": ["Mission Planning and Analysis Division, MSC"],
    "pdf": "/docs/69-fm-107.pdf",
    "sourceUrl": "https://web.archive.org/web/20250615183849/https://www.nasa.gov/wp-content/uploads/static/history/afj/ap10fj/pdf/a10-views-from-sc-1969-05-18-launch-19690422.pdf",
    "pageCount": 145,
    "anchors": {
      "star-catalogue": { "page": 14, "label": "Table I – Star identification catalogue (1,078 stars)" }
    }
  }
]
```

`site/src/content/entries/view-program.md`:
```md
---
title: MSC View Program
era: 1965–1972 · Gemini rendezvous studies through Apollo 17
provenanceTier: 3
summary: A FORTRAN V program on a UNIVAC 1108 that drew, onto microfilm, what Apollo crews would see through their windows and optics at any moment of a mission.
people:
  - { name: "Charles T. Hyle", role: "Co-author of TN D-6853 (1972), the Apollo Experience Report on the program" }
  - { name: "Alfred N. Lunde", role: "Co-author of TN D-6853; author of the Apollo 11 views note, 69-FM-197" }
  - { name: "G. B. Roush", role: "Credited in 69-FM-197 with developing its major analytical tool (Computation and Analysis Division)" }
sources:
  - { label: "TN D-6853 on the NASA Technical Reports Server", url: "https://ntrs.nasa.gov/citations/19720017950" }
  - { label: "TN D-6853 on HathiTrust", url: "https://babel.hathitrust.org/cgi/pt?id=uiug.30112106781450&seq=21" }
  - { label: "69-FM-197 (Apollo 11 views) at the Virtual AGC library", url: "https://www.ibiblio.org/apollo/Documents/19740073250.pdf" }
  - { label: "Comanche055, the Apollo 11 command module software (Virtual AGC)", url: "https://github.com/virtualagc/virtualagc/tree/master/Comanche055" }
film: { label: "“View from a Spacecraft”, MSC computer-generated film (16:41)", url: "https://www.youtube.com/watch?v=O8Hv4R_kHn4" }
documents: [tn-d-6853, 69-fm-197, 69-fm-107]
exhibits: [fig-3a]
---

## What it was

Before Apollo 8, analysts at NASA's Manned Spacecraft Center needed to know what the crew would actually *see* at critical moments. Where would the lunar horizon sit in the window at lunar orbit insertion? Which stars would be in the telescope when the platform needed realigning? The geometry of Earth, Moon, Sun and a moving spacecraft was too hard to picture unaided, and the crew simulators could not show everything.

The answer was a "somewhat dormant" program, originally written for early Gemini rendezvous and docking studies, which was revived and extended. It ran in FORTRAN V on a UNIVAC 1108. Its output was microfilm: a camera photographed images built from dots and straight lines on a cathode-ray tube. Those frames were printed on paper for mission documents and crew charts, and some were cut together into a film.

## What it was used for

- **Attitude checks before big burns.** For Apollo 8 it showed that the lunar horizon's position against a mark on the window could support an onboard go/no-go for lunar orbit insertion. Similar views backed up translunar injection, transearth injection and entry.
- **Star charts through the optics.** The Apollo 11 crew asked for views through the command module's scanning telescope and the lunar module's alignment telescope, and used them to choose stars before flight.
- **The lunar descent.** Views through the LM windows, including the landing point designator scale, showed which craters should cross which marks and when. The craters came from models built from photographs of the landing site.
- **Landing-site studies**, such as whether enough landmarks at Rima Prinz would be visible in the final four minutes of a descent.
- **Apollo 13.** Preflight abort views existed because of this program, and during the flight, views of Earth were the *only* attitude reference for a midcourse correction.

## How it worked

The program had two halves. The first integrated trajectories (by Encke's or Cowell's method) for up to four vehicles. The second drew what an observer would see: stars from a 37-, 391- or 1,078-star catalog, continents and craters, the day/night terminator shown with hatching, window outlines taken from engineering drawings at the astronaut's design eye position, and LM and S-IVB models with hidden lines removed. Inputs were the vehicle's position, velocity and attitude and the time, taken from each mission's operational trajectory document.

## What is original here, and what is reconstructed

The program's source code is not known to survive in public. This entry is therefore **rebuilt from documents and output**:

- **Original:** the 1969 inputs (mission times, REFSMMATs, gimbal angles), the RTCC star catalogue the plots were drawn from, and the guidance computer's own star vectors and optics geometry (Comanche055).
- **Reconstructed:** the projection and plot conventions, which were recovered by fitting the published figures, the renderer, and star positions from the Yale Bright Star Catalog matched to the 1969 catalogue.

Each exhibit compares the recreation against a scan of the original and reports the difference in degrees.
```

`site/src/content/exhibits/fig-3a.md`:
```md
---
title: "Figure 3a · Scanning telescope, Apollo 11 lunar orbit rev 30, 124:40:00 GET"
entry: view-program
summary: "The command module scanning telescope's view shortly after the LM lifted off from the Moon, recomputed from the 1969 inputs and compared with the 1972 printed figure."
figureRefs:
  - { document: tn-d-6853, anchor: fig3a }
  - { document: 69-fm-197, anchor: fig-9-3-8 }
  - { document: 69-fm-197, anchor: refsmmat }
  - { document: 69-fm-197, anchor: rtcc-catalogue }
---

## How this was made

1. **Time.** 124:40:00 ground elapsed time after the 13:32:00 UTC range zero on 16 July 1969 is 18:12 UTC on 21 July.
2. **Stars.** The 148 stars of the note's own RTCC catalogue (Besselian 1970) were transcribed by OCR and matched to the Yale Bright Star Catalog within 0.05°. The 37 navigation stars use the unit vectors stored in the Apollo 11 command module computer.
3. **Earth and planets.** Positions for that minute come from `astronomy-engine`, seen from the Moon's center and rotated into the same B1970 frame.
4. **Spacecraft attitude.** The stars are rotated through the Lunar lift-off REFSMMAT, then the gimbal angles I = 49.1°, M = 0°, O = 0°, in the order the guidance computer's `CALCGA` routine uses, and then the 32.5° optics mounting (`NB1NB2`).
5. **Projection.** The telescope looks along its shaft axis (trunnion 0°). The view is plotted as an azimuthal-equidistant ("fisheye") projection ±50° across, with up toward increasing trunnion.
6. **Comparison.** The 1972 figure was scanned at 300 dpi, registered to its ±50° frame, and each labeled body's position was measured.

## Limits

- The observer is the Moon's center, not the command module in its 60-nautical-mile orbit. That moves Earth by under 0.3°. The Moon itself is not drawn, which is harmless here because the telescope is pointed away from it.
- The 0–50 scale along the reticle's vertical line is drawn as it appears on the figures. Neither document explains it.
- Star names, planet boxes and the header text on the 1972 figure were typed on afterwards; the **Labels** switch shows or hides that layer.
```

- [ ] **Step 4: Home page**

`site/src/pages/index.astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import ProvenanceBadge from '../components/ProvenanceBadge.astro';

const entries = await getCollection('entries');
---
<Base title="Home">
  <section class="max-w-3xl">
    <h1 class="text-4xl font-semibold tracking-tight">Apollo Software Library</h1>
    <p class="mt-4 text-lg text-stone-700 dark:text-stone-300">
      Working recreations of the software that planned and flew the Apollo missions, each shown with its history
      and primary sources. Every entry says how close it is to the original: emulated from surviving code, rebuilt
      from documented algorithms, or rebuilt from documents and output.
    </p>
  </section>
  <ul class="mt-12 grid gap-6 md:grid-cols-2">
    {entries.map((entry) => (
      <li class="rounded border border-stone-300 p-6 dark:border-stone-700">
        <p class="font-mono text-xs uppercase tracking-widest text-stone-500">{entry.data.era}</p>
        <h2 class="mt-2 text-2xl font-semibold"><a href={`/${entry.id}/`} class="hover:underline">{entry.data.title}</a></h2>
        <p class="mt-3 text-stone-700 dark:text-stone-300">{entry.data.summary}</p>
        <div class="mt-4"><ProvenanceBadge tier={entry.data.provenanceTier} /></div>
      </li>
    ))}
  </ul>
</Base>
```

- [ ] **Step 5: Verify the build**

Run: `bun run build`
Expected: Astro builds `/` with no errors. Links to the entry do not resolve yet; the entry page comes in Task 14.

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock scripts/sync-public.ts site .gitignore
git commit -m "feat(site): Astro shell, content model, provenance badge, home page"
```

---

### Task 14: Entry page and document pages

**Files:**
- Create: `site/src/pages/[entry]/index.astro`, `site/src/pages/documents/[id].astro`

**Interfaces:**
- Consumes: the collections from Task 13.
- Produces the routes `/view-program/`, `/documents/tn-d-6853/`, `/documents/69-fm-197/` and `/documents/69-fm-107/`. Document pages accept `?page=N` to open the PDF at page N.

- [ ] **Step 1: Check the film attribution before publishing it**

Run: `curl -s -A "Mozilla/5.0" "https://www.youtube.com/watch?v=O8Hv4R_kHn4" | grep -o '"shortDescription":"[^"]*"' | head -c 1500`

- If the description names Barry Rosen as the program's builder or the film's narrator, add `- { name: "Barry Rosen", role: "<what the description says, quoted or closely paraphrased>" }` to `people` in `view-program.md`.
- Otherwise leave him out and note it in the Task 16 report.

- [ ] **Step 2: Entry page** `site/src/pages/[entry]/index.astro`

```astro
---
import { getCollection, getEntry, render, type CollectionEntry } from 'astro:content';
import Base from '../../layouts/Base.astro';
import ProvenanceBadge from '../../components/ProvenanceBadge.astro';

export async function getStaticPaths() {
  const entries = await getCollection('entries');
  return entries.map((entry) => ({ params: { entry: entry.id }, props: { entry } }));
}

interface Props { entry: CollectionEntry<'entries'> }
const { entry } = Astro.props;
const { Content } = await render(entry);
const documents = await Promise.all(entry.data.documents.map((d) => getEntry(d)));
const exhibits = await Promise.all(entry.data.exhibits.map((e) => getEntry(e)));
---
<Base title={entry.data.title} description={entry.data.summary}>
  <p class="font-mono text-xs uppercase tracking-widest text-stone-500">{entry.data.era}</p>
  <h1 class="mt-2 text-4xl font-semibold tracking-tight">{entry.data.title}</h1>
  <p class="mt-4 max-w-3xl text-lg text-stone-700 dark:text-stone-300">{entry.data.summary}</p>
  <div class="mt-4"><ProvenanceBadge tier={entry.data.provenanceTier} /></div>

  <section class="mt-10" aria-labelledby="exhibits">
    <h2 id="exhibits" class="font-mono text-xs uppercase tracking-widest text-stone-500">Exhibits</h2>
    <ul class="mt-3 grid gap-4 md:grid-cols-2">
      {exhibits.map((x) => x && (
        <li class="rounded border border-stone-300 p-5 dark:border-stone-700">
          <a href={`/${entry.id}/${x.id}/`} class="text-lg font-semibold hover:underline">{x.data.title}</a>
          <p class="mt-2 text-sm text-stone-700 dark:text-stone-300">{x.data.summary}</p>
        </li>
      ))}
    </ul>
  </section>

  <div class="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <article class="prose-lite"><Content /></article>
    <aside class="space-y-8 text-sm">
      <section>
        <h2 class="font-mono text-xs uppercase tracking-widest text-stone-500">People</h2>
        <ul class="mt-2 space-y-2">{entry.data.people.map((p) => <li><span class="font-medium">{p.name}</span>: {p.role}</li>)}</ul>
      </section>
      <section>
        <h2 class="font-mono text-xs uppercase tracking-widest text-stone-500">Documents</h2>
        <ul class="mt-2 space-y-2">{documents.map((d) => d && <li><a class="underline" href={`/documents/${d.id}/`}>{d.data.reportNumber}</a>: {d.data.title}</li>)}</ul>
      </section>
      {entry.data.film && (
        <section>
          <h2 class="font-mono text-xs uppercase tracking-widest text-stone-500">Film</h2>
          <p class="mt-2"><a class="underline" href={entry.data.film.url} rel="noopener">{entry.data.film.label}</a></p>
        </section>
      )}
      <section>
        <h2 class="font-mono text-xs uppercase tracking-widest text-stone-500">Sources</h2>
        <ul class="mt-2 space-y-2">{entry.data.sources.map((s) => <li><a class="underline" href={s.url} rel="noopener">{s.label}</a></li>)}</ul>
      </section>
    </aside>
  </div>
</Base>
```

- [ ] **Step 3: Document page** `site/src/pages/documents/[id].astro`

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import Base from '../../layouts/Base.astro';

export async function getStaticPaths() {
  const docs = await getCollection('documents');
  return docs.map((doc) => ({ params: { id: doc.id }, props: { doc } }));
}

interface Props { doc: CollectionEntry<'documents'> }
const { doc } = Astro.props;
const anchors = Object.values(doc.data.anchors);
---
<Base title={doc.data.reportNumber} description={doc.data.title}>
  <p class="font-mono text-xs uppercase tracking-widest text-stone-500">Primary source</p>
  <h1 class="mt-2 max-w-4xl text-3xl font-semibold tracking-tight">{doc.data.title}</h1>
  <dl class="mt-4 grid max-w-3xl grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
    <dt class="text-stone-500">Report</dt><dd>{doc.data.reportNumber}</dd>
    <dt class="text-stone-500">Date</dt><dd>{doc.data.date}</dd>
    <dt class="text-stone-500">Authors</dt><dd>{doc.data.authors.join(', ')}</dd>
    <dt class="text-stone-500">Pages</dt><dd>{doc.data.pageCount}</dd>
    <dt class="text-stone-500">Source</dt><dd><a class="underline" href={doc.data.sourceUrl} rel="noopener">{doc.data.sourceUrl}</a></dd>
  </dl>
  <nav aria-label="Pages cited by the library" class="mt-6">
    <ul class="flex flex-wrap gap-2 text-sm">
      {anchors.map((a) => <li><a class="inline-block rounded border border-stone-400 px-3 py-1 hover:bg-stone-200 dark:border-stone-600 dark:hover:bg-stone-800" href={`?page=${a.page}`}>p. {a.page}: {a.label}</a></li>)}
    </ul>
  </nav>
  <iframe id="pdf" src={`${doc.data.pdf}#page=1`} title={doc.data.title} class="mt-6 h-[80vh] w-full rounded border border-stone-300 dark:border-stone-700"></iframe>
  <p class="mt-3 text-sm"><a class="underline" href={doc.data.pdf} download>Download the PDF</a> (public domain).</p>
  <script is:inline define:vars={{ pdf: doc.data.pdf }}>
    const page = new URLSearchParams(location.search).get('page');
    if (page && /^\d+$/.test(page)) document.getElementById('pdf').src = `${pdf}#page=${page}`;
  </script>
</Base>
```

- [ ] **Step 4: Build and check**

Run: `bun run build && bun run check:site`
Expected: builds `/`, `/view-program/` and three `/documents/*` pages. The `/view-program/fig-3a/` link is still a 404 until Task 15. `astro check` reports 0 errors.

- [ ] **Step 5: Commit**

```bash
git add site
git commit -m "feat(site): view-program entry page and primary-source document pages"
```

---

### Task 15: The Fig 3a exhibit

**Files:**
- Create: `site/src/lib/fig3a.ts`
- Create: `site/src/components/fig3a/Fig3aExhibit.tsx`, `site/src/components/fig3a/InputsPanel.tsx`, `site/src/components/fig3a/ResidualsTable.tsx`
- Create: `site/src/pages/view-program/fig-3a.astro`

**Interfaces:**
- Consumes: the engine (`buildScene`, `renderSvg`, `FIG_3A_SPEC`, `APOLLO_11`, `resolveCatalog`, `fitPlotAxes`, `impliedSctAngles`, `parseGet`, `InvalidGetError`, `Underlay`, `Primitive`, `DisplayList`, `GimbalAngles`) and the data files.
- Produces: `ResidualRow`, `TOLERANCE`, `stars`, `baseline`, `baselineResiduals`, `recovered`, `scanUnderlay(opacity, invert)`, `residuals(dl)`, `residualArrows(rows, factor)`.

- [ ] **Step 1: Exhibit data module** `site/src/lib/fig3a.ts`

```ts
import {
  APOLLO_11, buildScene, FIG_3A_SPEC, fitPlotAxes, impliedSctAngles, resolveCatalog,
  type Agc37File, type BscFile, type DisplayList, type Primitive, type RtccFile, type Underlay,
} from '@asl/view-engine';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import points from '../../../data/derived/fig3a-points.json';

export const TOLERANCE = { rmsDeg: 1.0, maxDeg: 2.0 } as const;

export const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

export const scanUnderlay = (opacity: number, invert: boolean): Underlay => ({
  href: '/scans/tnd6853-fig3a.png',
  widthPx: points.image.widthPx,
  heightPx: points.image.heightPx,
  frame: points.frame,
  opacity,
  invert,
});

export interface ResidualRow {
  id: string;
  kind: string;
  scanX: number;
  scanY: number;
  modelX: number;
  modelY: number;
  dist: number;
  pass: boolean;
}

export function residuals(dl: DisplayList): { rows: ResidualRow[]; rmsDeg: number; maxDeg: number } {
  const rows = points.points.map((p): ResidualRow => {
    const b = dl.placed.find((q) => q.label === p.id);
    const modelX = b?.x ?? Number.NaN, modelY = b?.y ?? Number.NaN;
    const dist = Math.hypot(modelX - p.xDeg, modelY - p.yDeg);
    return { id: p.id, kind: p.kind, scanX: p.xDeg, scanY: p.yDeg, modelX, modelY, dist, pass: dist <= TOLERANCE.maxDeg };
  });
  const found = rows.filter((r) => Number.isFinite(r.dist));
  return {
    rows,
    rmsDeg: Math.sqrt(found.reduce((s, r) => s + r.dist ** 2, 0) / found.length),
    maxDeg: Math.max(...found.map((r) => r.dist)),
  };
}

/** Arrows from each scan position toward the recreated position, magnified by `factor`. */
export function residualArrows(rows: ResidualRow[], factor = 5): Primitive[] {
  return rows.filter((r) => Number.isFinite(r.dist)).map((r): Primitive => ({
    kind: 'polyline',
    closed: false,
    tone: 'accent',
    points: [[r.scanX, r.scanY], [r.scanX + (r.modelX - r.scanX) * factor, r.scanY + (r.modelY - r.scanY) * factor]],
  }));
}

export const baseline = buildScene(FIG_3A_SPEC, { stars });
export const baselineResiduals = residuals(baseline);

/** Instrument angles recovered by fitting the scan freely (validation, not an input). */
export const recovered = (() => {
  const fit = fitPlotAxes(points.points.map((p) => ({
    id: p.id, x: p.xDeg, y: p.yDeg, direction: baseline.placed.find((b) => b.label === p.id)!.direction,
  })));
  return { ...impliedSctAngles(fit.axes), rmsDeg: fit.rmsDeg, mirror: fit.mirror };
})();
```

- [ ] **Step 2: Residuals table** `site/src/components/fig3a/ResidualsTable.tsx`

```tsx
import type { ResidualRow } from '../../lib/fig3a';

interface Props { rows: ResidualRow[]; rmsDeg: number; maxDeg: number; tolerance: { rmsDeg: number; maxDeg: number } }

const f = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : 'n/a');

export function ResidualsTable({ rows, rmsDeg, maxDeg, tolerance }: Props) {
  const met = rmsDeg <= tolerance.rmsDeg && maxDeg <= tolerance.maxDeg;
  return (
    <section aria-labelledby="residuals-heading">
      <h2 id="residuals-heading" className="font-mono text-xs uppercase tracking-widest text-stone-500">
        Residuals: recreation vs. 1972 scan
      </h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-stone-300 text-left dark:border-stone-700">
              <th className="py-1 pr-4 font-medium">Body</th>
              <th className="pr-4 font-medium">Scan x, y (°)</th>
              <th className="pr-4 font-medium">Recreation x, y (°)</th>
              <th className="pr-4 font-medium">Δ (°)</th>
              <th className="font-medium">Within {tolerance.maxDeg}°</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-stone-200 dark:border-stone-800">
                <td className="py-1 pr-4">{r.id}</td>
                <td className="pr-4 font-mono">{f(r.scanX)}, {f(r.scanY)}</td>
                <td className="pr-4 font-mono">{f(r.modelX)}, {f(r.modelY)}</td>
                <td className="pr-4 font-mono">{f(r.dist)}</td>
                <td>{r.pass ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        RMS <span className="font-mono">{rmsDeg.toFixed(2)}°</span>, max <span className="font-mono">{maxDeg.toFixed(2)}°</span>.
        Acceptance is RMS ≤ {tolerance.rmsDeg}° and max ≤ {tolerance.maxDeg}°: <strong>{met ? 'met' : 'not met'}</strong>.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Inputs panel** `site/src/components/fig3a/InputsPanel.tsx`

```tsx
import { APOLLO_11, type GimbalAngles } from '@asl/view-engine';

const docLink = (id: string, page: number) => `/documents/${id}/?page=${page}`;

interface Props {
  getText: string;
  getError: string | null;
  onGetText: (text: string) => void;
  gimbals: GimbalAngles;
  onGimbals: (g: GimbalAngles) => void;
  onReset: () => void;
  utc: Date;
  recovered: { shaftDeg: number; trunnionDeg: number };
  isBaseline: boolean;
}

export function InputsPanel(p: Props) {
  const m = APOLLO_11.refsmmat.lunarLiftoff;
  const gimbalInput = (key: keyof GimbalAngles, label: string) => (
    <label className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <input
        type="number" step={0.1} min={-360} max={360} value={p.gimbals[key]}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(v)) p.onGimbals({ ...p.gimbals, [key]: v });
        }}
        className="w-24 rounded border border-stone-400 bg-transparent px-2 py-1 text-right font-mono dark:border-stone-600"
      />
    </label>
  );
  return (
    <aside className="space-y-6 text-sm">
      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Inputs (1969)</h2>
        <dl className="mt-2 space-y-3">
          <div>
            <dt className="font-medium">Time</dt>
            <dd className="font-mono">{p.utc.toISOString().replace('.000Z', 'Z')}</dd>
            <dd className="text-stone-500">Range zero {APOLLO_11.rangeZeroUtc} (Apollo 11 Mission Report)</dd>
          </div>
          <div>
            <dt className="font-medium">Platform: Lunar lift-off REFSMMAT</dt>
            <dd>
              <table className="mt-1 font-mono text-xs"><tbody>
                {m.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="pr-3 text-right">{v.toFixed(8)}</td>)}</tr>)}
              </tbody></table>
            </dd>
            <dd><a className="underline" href={docLink('69-fm-197', 38)}>69-FM-197, Table II(e)</a></dd>
          </div>
          <div>
            <dt className="font-medium">Instrument: scanning telescope</dt>
            <dd>60° field, shaft 0°, trunnion 0°.</dd>
            <dd className="text-stone-500">A free fit of the scan recovers shaft {p.recovered.shaftDeg.toFixed(1)}°, trunnion {p.recovered.trunnionDeg.toFixed(1)}°.</dd>
          </div>
          <div>
            <dt className="font-medium">Projection</dt>
            <dd>Azimuthal equidistant, ±50°, as seen through the telescope</dd>
          </div>
          <div>
            <dt className="font-medium">Stars</dt>
            <dd>
              <a className="underline" href={docLink('69-fm-197', 309)}>RTCC catalogue, B1970</a> (148 stars), positioned
              from the Yale Bright Star Catalog; the 37 navigation stars use the guidance computer's own vectors.
            </dd>
          </div>
        </dl>
      </section>
      <section className="space-y-3 rounded border border-stone-300 p-4 dark:border-stone-700">
        <h2 className="font-mono text-xs uppercase tracking-widest text-stone-500">Try it</h2>
        <label className="block">
          GET (hhh:mm:ss)
          <input
            value={p.getText} onChange={(e) => p.onGetText(e.target.value)}
            aria-invalid={p.getError !== null} aria-describedby={p.getError ? 'get-error' : undefined}
            className="mt-1 w-full rounded border border-stone-400 bg-transparent px-2 py-1 font-mono dark:border-stone-600"
          />
        </label>
        {p.getError && <p id="get-error" role="alert" className="text-amber-700 dark:text-amber-400">{p.getError}. Showing the last valid time.</p>}
        {gimbalInput('inner', 'Inner gimbal (I)')}
        {gimbalInput('middle', 'Middle gimbal (M)')}
        {gimbalInput('outer', 'Outer gimbal (O)')}
        <button
          type="button" onClick={p.onReset} disabled={p.isBaseline}
          className="rounded border border-stone-900 px-3 py-1 font-mono text-xs uppercase tracking-wide disabled:opacity-40 dark:border-stone-100"
        >
          Reset to 1969 values
        </button>
      </section>
    </aside>
  );
}
```

- [ ] **Step 4: The exhibit island** `site/src/components/fig3a/Fig3aExhibit.tsx`

```tsx
import { useMemo, useState } from 'react';
import { buildScene, FIG_3A_SPEC, InvalidGetError, parseGet, renderSvg, type GimbalAngles } from '@asl/view-engine';
import { baseline, baselineResiduals, recovered, residualArrows, scanUnderlay, stars, TOLERANCE } from '../../lib/fig3a';
import { InputsPanel } from './InputsPanel';
import { ResidualsTable } from './ResidualsTable';

type Mode = 'recreation' | 'original' | 'overlay';
type Style = 'microfilm' | 'print';

function Segmented<T extends string>(props: { label: string; value: T; options: ReadonlyArray<readonly [T, string]>; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{props.label}</legend>
      {props.options.map(([v, text]) => (
        <label
          key={v}
          className={`cursor-pointer rounded border px-3 py-1 font-mono text-xs uppercase tracking-wide has-[:focus-visible]:outline-2 ${
            props.value === v
              ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
              : 'border-stone-400 dark:border-stone-600'
          }`}
        >
          <input type="radio" className="sr-only" name={props.label} value={v} checked={props.value === v} onChange={() => props.onChange(v)} />
          {text}
        </label>
      ))}
    </fieldset>
  );
}

const sameGimbals = (a: GimbalAngles, b: GimbalAngles) => a.inner === b.inner && a.middle === b.middle && a.outer === b.outer;

export default function Fig3aExhibit() {
  const [mode, setMode] = useState<Mode>('recreation');
  const [style, setStyle] = useState<Style>('microfilm');
  const [labels, setLabels] = useState(true);
  const [opacity, setOpacity] = useState(0.55);
  const [getText, setGetText] = useState(FIG_3A_SPEC.get);
  const [validGet, setValidGet] = useState(FIG_3A_SPEC.get);
  const [getError, setGetError] = useState<string | null>(null);
  const [gimbals, setGimbals] = useState<GimbalAngles>(FIG_3A_SPEC.gimbals);

  const onGetText = (text: string) => {
    setGetText(text);
    try {
      parseGet(text);
      setValidGet(text.trim());
      setGetError(null);
    } catch (e) {
      setGetError(e instanceof InvalidGetError ? e.message : String(e));
    }
  };
  const reset = () => { onGetText(FIG_3A_SPEC.get); setGimbals(FIG_3A_SPEC.gimbals); };

  const isBaseline = validGet === FIG_3A_SPEC.get && sameGimbals(gimbals, FIG_3A_SPEC.gimbals);
  const dl = useMemo(
    () => (isBaseline ? baseline : buildScene({ ...FIG_3A_SPEC, get: validGet, gimbals }, { stars })),
    [isBaseline, validGet, gimbals],
  );
  const svg = useMemo(() => {
    const arrows = mode === 'overlay' && isBaseline ? residualArrows(baselineResiduals.rows) : [];
    return renderSvg({ ...dl, primitives: [...dl.primitives, ...arrows] }, {
      style,
      labels,
      showPrimitives: mode !== 'original',
      underlay: mode === 'recreation' ? undefined : scanUnderlay(mode === 'original' ? 1 : opacity, style === 'microfilm'),
      title: mode === 'original' ? 'TN D-6853 Figure 3a, 1972 scan' : 'Figure 3a recomputed from 1969 inputs',
    });
  }, [dl, mode, style, labels, opacity, isBaseline]);

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Figure 3a exhibit">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="View" value={mode} onChange={setMode}
            options={[['recreation', 'Recreation'], ['original', '1972 original'], ['overlay', 'Overlay']] as const} />
          <Segmented label="Style" value={style} onChange={setStyle}
            options={[['microfilm', 'Microfilm'], ['print', 'Report print']] as const} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Labels
          </label>
        </div>
        {mode === 'overlay' && (
          <label className="flex items-center gap-3 text-sm">
            Scan opacity
            <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-48" />
          </label>
        )}
        <div
          className="overflow-hidden rounded border border-stone-300 dark:border-stone-700 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {mode === 'overlay' && (isBaseline
          ? <p className="text-sm text-stone-600 dark:text-stone-400">Orange arrows run from each body's position on the 1972 scan toward its recomputed position, magnified ×5.</p>
          : <p className="text-sm text-amber-700 dark:text-amber-400">The inputs differ from 1969, so the overlay no longer lines up. Reset to compare.</p>)}
        {dl.notes.map((n) => <p key={n} className="text-sm text-stone-600 dark:text-stone-400">{n}</p>)}
      </div>
      <InputsPanel
        getText={getText} getError={getError} onGetText={onGetText}
        gimbals={gimbals} onGimbals={setGimbals} onReset={reset}
        utc={dl.utc} recovered={recovered} isBaseline={isBaseline}
      />
      <div className="lg:col-span-2">
        <ResidualsTable {...baselineResiduals} tolerance={TOLERANCE} />
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Exhibit page** `site/src/pages/view-program/fig-3a.astro`

```astro
---
import { getEntry, render } from 'astro:content';
import Base from '../../layouts/Base.astro';
import Fig3aExhibit from '../../components/fig3a/Fig3aExhibit';

const exhibit = await getEntry('exhibits', 'fig-3a');
if (!exhibit) throw new Error('exhibit fig-3a is missing');
const { Content } = await render(exhibit);
const refs = await Promise.all(exhibit.data.figureRefs.map(async (r) => {
  const doc = await getEntry(r.document);
  if (!doc) throw new Error(`unknown document ${r.document.id}`);
  const anchor = doc.data.anchors[r.anchor];
  if (!anchor) throw new Error(`unknown anchor ${r.anchor} in ${doc.id}`);
  return { href: `/documents/${doc.id}/?page=${anchor.page}`, text: `${doc.data.reportNumber}: ${anchor.label}` };
}));
---
<Base title={exhibit.data.title} description={exhibit.data.summary}>
  <p class="font-mono text-xs uppercase tracking-widest text-stone-500"><a class="hover:underline" href="/view-program/">MSC View Program</a> / Exhibit</p>
  <h1 class="mt-2 max-w-4xl text-3xl font-semibold tracking-tight">{exhibit.data.title}</h1>
  <p class="mt-3 max-w-3xl text-stone-700 dark:text-stone-300">{exhibit.data.summary}</p>
  <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
    {refs.map((r) => <li><a class="underline" href={r.href}>{r.text}</a></li>)}
  </ul>
  <div class="mt-8"><Fig3aExhibit client:load /></div>
  <article class="prose-lite mt-12"><Content /></article>
</Base>
```

- [ ] **Step 6: Build and check**

Run: `bun run build && bun run check:site`
Expected: every route builds, including `/view-program/fig-3a/`, and `astro check` reports 0 errors.

- [ ] **Step 7: Commit**

```bash
git add site
git commit -m "feat(site): interactive Fig 3a exhibit with overlay, residuals and try-it inputs"
```

---

### Task 16: End-to-end verification, README and spec amendments

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-09-29-view-program-fig3a-design.md` (append "Amendments during planning and implementation")

- [ ] **Step 1: Run the full suite**

Run: `bun run test && bun run typecheck && bun run check:site && bun run build`
Expected: all tests pass (golden included) and there are 0 type errors. The build emits `/`, `/view-program/`, `/view-program/fig-3a/` and three `/documents/*` pages.

- [ ] **Step 2: Verify in a real browser**

Start `bun run dev` in the background. Then, with Playwright:
1. Visit `/`, `/view-program/`, `/view-program/fig-3a/` and `/documents/tn-d-6853/?page=10`. Take a screenshot of each and check that the console has no errors.
2. On the exhibit:
   - Switch to **Overlay**. The scan and the recreation should line up, with short orange arrows.
   - Switch to **1972 original**.
   - Toggle **Report print** and **Labels**.
   - Type `abc` into GET: an alert appears and the view keeps rendering.
   - Set the middle gimbal to `90`: the view still renders.
   - Click **Reset**.
3. Check at a 390 px viewport width: there is no horizontal page scroll, and the controls wrap.

Fix anything broken, rerun Step 1, and repeat.

- [ ] **Step 3: README**

`README.md`:
````md
# Apollo Software Library

Working recreations of Apollo-era software, each with its history and primary sources.
The first entry is the MSC **view program** (NASA TN D-6853, 1972). Its first exhibit recomputes
TN D-6853 Figure 3a from 1969 inputs and measures the result against the 1972 scan.

## Layout

- `packages/view-engine`: framework-free TypeScript: catalogs, time, frames (REFSMMAT, gimbals, optics),
  ephemeris, projection, scene, SVG plotter, fitting.
- `site`: Astro + React islands + Tailwind.
- `data/sources`: primary-source PDFs (public domain) and `SOURCES.md`.
- `data/derived`: generated data; each JSON file records its provenance.
- `data/manual`: hand-made inputs to the data scripts (OCR overrides, the figure name map).
- `docs/superpowers`: design spec and implementation plan.

## Commands

```sh
bun install
bun run test          # engine + script tests, including the Fig 3a golden test
bun run dev           # site at http://localhost:4321
bun run build
```

## Rebuilding the data

These need `pdftoppm` (poppler) and `tesseract`:

```sh
bun scripts/fetch-sources.ts
bun scripts/build-bsc.ts
bun scripts/build-agc-stars.ts
bun scripts/ocr-rtcc.ts && bun scripts/build-rtcc-catalog.ts
bun scripts/extract-figures.ts && bun scripts/digitize-fig3a.ts
```
````

- [ ] **Step 4: Spec amendments**

Append a section `## 11. Amendments during planning and implementation` to the spec. It records:
- The facts established during planning (from the plan header).
- The RTCC catalogue replacing the BSC stand-in.
- The simplified fit: rotation and handedness only, since the frame registration handles scale and offset.
- The Markdown files are plain `.md`, not MDX.
- PDFs are synced to `site/public` rather than duplicated in git.
- Any overrides or measurements made in Tasks 4 and 11, such as `SCT_SCALE`.
- The golden result: RMS, max, and the recovered angles.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-09-29-view-program-fig3a-design.md
git commit -m "docs: README and spec amendments with the Fig 3a result"
```

- [ ] **Step 6: Whole-branch review**

Dispatch one fresh reviewer (most capable model) over the whole repository against the spec and this plan. Triage its findings with superpowers:receiving-code-review, fix what is valid, and rerun Step 1.
