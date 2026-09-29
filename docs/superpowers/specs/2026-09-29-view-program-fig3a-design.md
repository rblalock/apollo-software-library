# Apollo Software Library: View Program, Fig 3a Proof of Concept

- **Date:** 2026-09-29
- **Status:** Approved design, awaiting spec review
- **Scope:** app shell for the library, plus the first exhibit: TN D-6853 Figure 3a recomputed from real data

## 1. Context and goal

We are building an online **Apollo software library**: web recreations of Apollo-era software, each presented with its history and primary sources. The first entry is the **MSC "view program"**. It is documented in NASA TN D-6853, *Apollo Experience Report – The Application of a Computerized Visualization Capability to Lunar Missions* (Hyle & Lunde, June 1972). It ran in FORTRAN V on a UNIVAC 1108 and produced CRT-to-microfilm frames. They showed what the crew would see through the windows and optics at any point in a mission.

The program's source code is not publicly available. The recreation is therefore rebuilt from documents and published output, not ported. Its geometry is validated against the published frames.

This proof of concept answers one question: **can we recompute a published view-program frame from period inputs and real star data, to within the precision of the scan?** It also stands up the library shell the answer will live in.

### Constraints the user stated

- Get as close to the original as possible. Where 1969 data is not recoverable (coastlines, crater sets, the 391-star catalog), our own reproduction is acceptable.
- Work from a written plan that is tracked and worked down.
- Build the app shell now, with Fig 3a as its first exhibit.
- Stack: Astro with React islands.
- Approach: a period-faithful computation pipeline, with a fitting tool used for validation.

## 2. Background and primary sources

| Source | What we use it for |
|---|---|
| TN D-6853 (NTRS 19720017950), https://ntrs.nasa.gov/api/citations/19720017950/downloads/19720017950.pdf, also HathiTrust `uiug.30112106781450` | The entry's narrative and Figure 3a (PDF page 10, printed page 5) |
| MSC IN 69-FM-197 Rev 1, *Views from the CM and LM During the Flight of Apollo 11* (A. N. Lunde, 3 Jul 1969, 321 pp), https://www.ibiblio.org/apollo/Documents/19740073250.pdf | Fig 9.3-8 (PDF p. 290; the source of TN D-6853 Fig 3; three panels at 124:40, 125:00 and 125:15 GET); Table II mission REFSMMATs (PDF p. 38); Figs 9.0-1 and 9.0-2 (the scanning telescope's location and field of view; rotated pages at about PDF pp. 261–262, whose text extraction fails, so they must be read as images); credits G. B. Roush with the tool |
| MSC IN 69-FM-107, the Apollo 10 edition, https://web.archive.org/web/20250615183849/https://www.nasa.gov/wp-content/uploads/static/history/afj/ap10fj/pdf/a10-views-from-sc-1969-05-18-launch-19690422.pdf | Table I, the 1,078-star catalog. Later work: text recognition of this table |
| Comanche055 (Colossus 2A, Apollo 11 CM software), https://github.com/virtualagc/virtualagc/tree/master/Comanche055 | `STAR_TABLES.agc` (37 nav-star unit vectors); `INFLIGHT_ALIGNMENT_ROUTINES.agc` (`CALCGA` gimbal axes); `CSM_GEOMETRY.agc` (`SXTNB`, `NB1NB2`) |
| "View from a Spacecraft" film (16:41, introduced by Barry Rosen), https://www.youtube.com/watch?v=O8Hv4R_kHn4 | The entry page (link or embed only; the uploader says it is the narrator's personal copy, so it is not re-hosted) |
| Yale Bright Star Catalog, 5th ed. (VizieR V/50) | Background stars down to V ≤ 4.5, standing in for the 1,078-star catalog |
| `astronomy-engine` (MIT) | Sun, Moon and planet positions for July 1969 |

### Facts established during design

- **Fig 3a inputs:** Apollo 11 lunar orbit, rev 30, **124:40:00 GET**. Platform aligned to the **Lunar lift-off REFSMMAT**, with gimbal angles **I = 49.1°, M = 0.0°, O = 0.0°**.
- **Lunar lift-off REFSMMAT** (69-FM-197 Table II(e)). Digits were checked against the page image, and the rows are orthonormal to about 1e-5:
  ```
   .63482512   .71274759   .29830852
   .00595964  -.39058739   .92054658
   .77263288  -.58260827  -.25220240
  ```
  The rows are the stable-member X, Y and Z axes expressed in the reference frame (format `xx xy xz / yx yy yz / zx zy zz`).
- **Gimbal order** (`CALCGA`): outer gimbal axis = navigation-base X; inner gimbal axis = stable-member Y; middle gimbal axis = unit(OGA × IGA). The stable-member → navigation-base transform is a rotation about Y by IGA, then Z by MGA, then X by OGA.
- **Optics mounting** (`SXTNB`, `NB1NB2`): the optics line of sight in the optics frame is `(cos SA·sin TA, sin SA·sin TA, cos TA)` for shaft SA and trunnion TA. It goes to navigation-base axes through a 32.523° rotation about Y (cos = 0.8431756920, sin = 0.5376381241). The shaft axis therefore sits 57.5° from +X toward +Z.
- **Projection:** a fit of 36 star-pair separations hand-read from Fig 3a favors **azimuthal equidistant**, at about 2.8° RMS. That matches the reading error. The tangent-plane and az/el projections fit 2–4× worse. It also matches the report's "fisheye" remark.
- **Timebase:** Apollo 11 range zero is 1969-07-16 13:32:00 UTC, so 124:40:00 GET = 1969-07-21 18:12:00 UTC.

## 3. Scope

### In scope

1. A monorepo containing the framework-free `view-engine` package, an Astro site, data scripts and derived data.
2. Library shell pages: home, the view-program entry, the Fig 3a exhibit, and document pages.
3. A view engine able to produce scanning-telescope star views: catalogs, time, ephemeris, frames, projection, scene, SVG plotter, and the fitting tool.
4. The Fig 3a exhibit: recreation, overlay against the 1972 scan, residuals, inputs with sources, and live "try it" controls.
5. Tests, including a golden validation test against Fig 3a.

### Out of scope (roadmap, section 10)

Earth and Moon outlines and terminator hatching; window outlines; the LM descent and LPD; hidden-line vehicles; trajectory integration; film playback and animation; hosting and deployment; visual-design polish; text recognition of the 1,078-star catalog.

## 4. Architecture

### 4.1 Repository layout

```
apollo-experience-report/
  package.json                 Bun workspaces root
  packages/view-engine/        framework-free TypeScript (no DOM or framework imports)
    src/{math,time,catalog,ephemeris,frames,projection,scene,plotter,fit}/
    test/
  site/                        Astro + React islands + Tailwind
  data/
    sources/                   original public-domain PDFs + SOURCES.md (URL, retrieval date, checksum)
    derived/                   generated JSON; every file carries a `provenance` block
  scripts/                     Bun TypeScript data-build scripts
  docs/superpowers/{specs,plans}/
```

The package manager is Bun, with Vitest as the test runner. `pdftoppm` (poppler) is a system dependency, used only by the figure-extraction script.

### 4.2 Site pages

| Route | Contents |
|---|---|
| `/` | Library intro and a card for each entry. Each card carries a **provenance badge** |
| `/view-program/` | Entry page: what the program was, who built it (Roush, Rosen, Hyle, Lunde), how it worked, how it was used (Apollo 8 LOI through the Apollo 13 contingency), what is original versus reconstructed, a film link or embed, sources, and a list of exhibits |
| `/view-program/fig-3a/` | The first exhibit (section 6) |
| `/documents/[id]/` | Citation details, plus the PDF opened at a given page in the browser's built-in viewer (`#page=N`), with a download link |

There are three **provenance tiers**, and every entry shows one:
1. *Emulated from original code*
2. *Rebuilt from documented algorithms*
3. *Rebuilt from documents and output*

The view program is **tier 3**, and parts of its math come from the documented AGC routines.

### 4.3 Content model (Astro content collections)

- `entries`: `title`, `slug`, `era`, `provenanceTier`, `summary`, `authors[]`, `sources[]` (label and URL), `documents[]` (IDs), `exhibits[]` (IDs); MDX body.
- `documents`: `id`, `title`, `reportNumber`, `date`, `authors[]`, `pdf` (site path), `sourceUrl`, `pages` (named anchors, e.g. `fig3a: 10`).
- `exhibits`: `id`, `entry`, `title`, `figureRefs[]` (`{document, page, label}`), `component` (the island name); MDX body for "how this was made".

Visual design stays minimal and archival: clean type, black and white, dark and light modes. Polish is a later, separate pass.

## 5. View engine (`packages/view-engine`)

### 5.1 Modules

| Module | Responsibility | Depends on |
|---|---|---|
| `math` | `Vec3`, row-major `Mat3`, `rotX/rotY/rotZ`, orthonormality checks, angle helpers | none |
| `time` | GET ↔ UTC for a mission's range zero; Julian date; Besselian epoch | none |
| `catalog` | `Star {id, name?, navStar?, raDeg, decDeg, mag, epoch}`; loaders for the AGC 37 and BSC ≤ 4.5; precession (IAU 1976) between epochs; direction unit vectors in a chosen reference frame | `math`, `time` |
| `ephemeris` | Unit direction from an observer (Earth center, Moon center, or an explicit position) to the Sun, Moon, Earth and planets at a UTC, in the platform reference frame. Wraps `astronomy-engine` | `math`, `time` |
| `frames` | `refsmmat` (reference → stable member); `smToNb(gimbals)` (Y-Z-X order, per `CALCGA`); `nbToOptics` (`NB1NB2`); `opticsLos(shaft, trunnion)`; instrument definitions (the SCT: 60° circular field, 1×) | `math` |
| `projection` | `azimuthalEquidistant` (default) and `gnomonic`. Parameters: boresight, roll reference (up vector), mirror flag. Output is `(xDeg, yDeg)`; the inverse is provided too | `math` |
| `scene` | `buildScene(viewSpec) → DisplayList`. Primitives: `dot` (size class from magnitude), `navMark` (asterisk), `segment` (straight lines only; circles become polylines), `frame` (±extent axes and ticks), `label` (annotation layer only) | all of the above |
| `plotter` | `renderSvg(displayList, {grid: 1024 or 4096, style: 'microfilm' or 'print', labels: boolean}) → string`. Quantizes to the recorder grid | `scene` types |
| `fit` | `fitView(points, catalog, options)`: least squares (Levenberg–Marquardt) over boresight (2), roll (1), per-axis scale (2), offset (2), mirror and projection. Returns per-point residuals, RMS and maximum error, and the fitted boresight. `impliedOpticsAngles(boresight, refsmmat, gimbals)` returns `{shaft, trunnion}` | `math`, `projection`, `frames` |

### 5.2 Key types

```ts
interface ViewSpec {
  mission: { rangeZeroUtc: string };          // e.g. Apollo 11: "1969-07-16T13:32:00Z"
  get: string;                                // "124:40:00"
  observer: { body: 'earth' | 'moon' } | { positionKm: Vec3; frame: 'eci' | 'selenocentric' };
  platform: { refsmmat: Mat3; epoch: string }; // the reference epoch is resolved by the catalog epoch test
  gimbals: { inner: number; middle: number; outer: number }; // degrees
  instrument: { kind: 'sct'; shaft: number; trunnion: number };
  plot: { extentDeg: number; projection: 'azimuthal-equidistant' | 'gnomonic'; mirror: boolean };
  catalogs: Array<'agc37' | 'bsc45'>;
  bodies: Array<'earth' | 'sun' | 'venus' | 'mars' | 'jupiter' | 'saturn'>;
}
```

### 5.3 Data flow

- Rendering: `ViewSpec → scene → DisplayList → plotter → SVG string` (a React island mounts the SVG).
- Validation: `digitized scan points + catalog → fit → residuals + fitted boresight → impliedOpticsAngles`.

### 5.4 Known unknowns and how each gets resolved

| Unknown | How it gets resolved |
|---|---|
| The telescope shaft and trunnion for Fig 3a (not printed on the figure) | Recovered by `fit` and `impliedOpticsAngles`. They must be physically plausible (trunnion between 0° and 60°). If 69-FM-197 Fig 9.0-2 states a standard SCT position, the two are cross-checked |
| The vertical −0…−50 scale inside the telescope circle | Read 69-FM-197 §9 and Fig 9.0-2. Render it as an instrument overlay once its meaning is known. If it stays unexplained, draw it as it appears and say so on the exhibit page |
| The platform reference epoch (the notes use a "Besselian 1970" star table; the AGC tables may differ) | Catalog epoch test: compare the AGC's 37 vectors with BSC precessed to candidate epochs, and pick the one with the smallest residual |
| Plot orientation (roll reference) and mirroring | Recovered by `fit`; then expressed as a rule in `projection` (e.g. "up = optics shaft direction"), so the next SCT figure (Fig 3b and 3c) can be predicted without fitting |

## 6. The Fig 3a exhibit

- **Header and citations:** "Scanning telescope view, Apollo 11 lunar orbit rev 30, 124:40:00 GET". Links to TN D-6853 Fig 3a (document page, PDF p. 10) and 69-FM-197 Fig 9.3-8a (PDF p. 290).
- **Viewer (React island):**
  - a `Recreation` / `1972 original` / `Overlay` switch, with an opacity slider in overlay mode;
  - a `Microfilm` / `Report print` style switch;
  - a labels on/off switch;
  - residual arrows (×5) in overlay mode.
- **Inputs panel:** GET → UTC; the REFSMMAT matrix; gimbal angles; shaft and trunnion (marked *recovered by fit*); field of view; projection. Every value is linked to its source.
- **"Try it":** editable GET and the three gimbal angles re-render live, with a "Reset to 1969 values" button.
- **Residuals table:** body, scan position (°), recreated position (°), Δ (°), pass or fail. Overall RMS and maximum below the table.
- **"How this was made"** (MDX): the pipeline in plain language, and what is original (1969 inputs, AGC math) versus reconstructed (the stand-in catalog, the fitted optics angles).

### 6.1 The scan asset and digitization

- `extract-figures` crops Fig 3a from TN D-6853 at 300 dpi into `site/public/scans/tnd6853-fig3a.png`.
- `digitize-fig3a` detects dot and asterisk blobs, and registers pixels to degrees from the ±50° axis ticks (affine).
- Name matching is done by hand (by me, reviewable by the user) and stored in `data/derived/fig3a-points.json`. The file holds pixel and degree coordinates, the registration, and the provenance.

## 7. Data pipeline and provenance

| Script | Output | Notes |
|---|---|---|
| `scripts/build-agc-stars.ts` | `data/derived/agc37.json` | Parses `STAR_TABLES.agc` at a pinned virtualagc commit hash. Names come from the ALSJ Apollo nav-star list (https://www.apollojournals.org/alsj/alsj-AOTNavStarsDetents.html), including Navi = 3, Regor = 15, Dnoces = 16 |
| `scripts/build-bsc.ts` | `data/derived/bsc45.json` | VizieR V/50, V ≤ 4.5, J2000 RA/Dec, HR number, common name when present |
| `scripts/extract-figures.ts` | `site/public/scans/*.png` | Needs `pdftoppm` |
| `scripts/digitize-fig3a.ts` | `data/derived/fig3a-points.json` | Blob detection plus a checked-in manual name map |

Every derived JSON file includes `provenance: { sources: [{url, retrieved, sha256}], method, script, generated }`, where `sha256` is the checksum of the downloaded source file. `data/sources/SOURCES.md` lists every original PDF with its URL and checksum.

## 8. Testing and acceptance

### 8.1 Unit tests (Vitest, `packages/view-engine/test`)

- `math`: rotations are orthonormal with determinant +1; rotation composition is correct.
- `time`: 124:40:00 GET for Apollo 11 → 1969-07-21T18:12:00Z; Julian date and Besselian epoch conversions against known values.
- `frames`: the `NB1NB2` angle is 32.523° (±0.001°); the Lunar lift-off REFSMMAT is orthonormal to 1e-5; a gimbal round trip (angles → matrix → angles via the `CALCGA` construction) holds to 1e-9.
- `catalog`: AGC-37 vectors versus precessed BSC agree within **0.01°** at the resolved epoch, and that epoch is recorded.
- `projection`: forward/inverse round trip to 1e-9; azimuthal-equidistant radius equals the angular distance from the boresight.
- `plotter`: grid quantization and style output (snapshot of a tiny display list).
- `fit`: recovers known parameters from synthetic points with noise.

### 8.2 Golden validation (Fig 3a)

Render from the 1969 inputs plus the recovered optics angles, then compare every identified body in `fig3a-points.json`:
- **Pass:** RMS ≤ **1.0°**, maximum ≤ **2.0°**.
- Venus, Saturn and Earth are included, which checks the ephemeris.

### 8.3 Site

`astro build` succeeds. The four routes are verified manually in a browser, with screenshots.

### 8.4 Definition of done

1. `bun dev` serves home → entry → exhibit → document page.
2. The exhibit renders Fig 3a from real data, with the overlay and the residuals table.
3. The golden test meets its thresholds. **If it does not, the work stops and the misfit is reported with an analysis. Inputs are not tuned to force a pass.**
4. The recovered shaft and trunnion are physically plausible and recorded on the exhibit.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Scan distortion or reading error exceeds the thresholds | The per-axis scale in the fit absorbs linear distortion; residual arrows make any systematic pattern visible. Thresholds may be revisited only with evidence, recorded in this spec |
| The platform epoch or frame convention is wrong (errors of about 0.4° or more) | The catalog epoch test catches it first, before any figure comparison |
| Gimbal sign or order conventions are misread | The round-trip test plus the golden test; the conventions are taken directly from `CALCGA`, not from memory |
| Blob detection mislabels stars | Name matching is manual and reviewable; the residuals table exposes mismatches |
| Astro, React island and workspace friction | Keep the engine free of Astro; the island imports the engine as a workspace package |

## 10. Roadmap after the POC (each item gets its own spec and plan)

1. The rest of Fig 3 (3b, 3c) and Fig 4 (the six AOT detent views): same machinery, predicted without per-figure fitting.
2. Earth and Moon rendering: our own coastlines and lunar features, simplified to the period look; terminator hatching (Figs 6, 7).
3. CM window outlines and critical-maneuver views (Figs 1, 2, 9).
4. LM descent: window outlines, LPD scale, crater models in perspective (Figs 5, 8), plus the 69-FM-197 PDI frame sequence.
5. Trajectory integration (Cowell/Encke), up to 4 vehicles, and hidden-line LM and S-IVB models.
6. Film mode: microfilm playback of frame sequences, and a line-printer "printer-plot" output.
7. Text recognition of the 1,078-star catalog from 69-FM-107 Table I, replacing the stand-in catalog.
8. Visual-design pass for the library; hosting and deployment.
9. Archival outreach: NARA Fort Worth (the 35 mm film and any listings), G. B. Roush and Barry Rosen.

## 11. Amendments during planning and implementation

### Established during planning (verified before implementation)

- **AGC star epoch:** the Comanche055 star vectors are the mean equator and equinox of **B1970.0**, with proper motion. They match BSC5 at 2.6″ RMS and 3.6″ max; the next-best epoch, B1969.75, is 10″ RMS.
- **AGC star order:** stars 34–37 are Peacock, Deneb, Enif and Fomalhaut.
- **Catalog:** the stand-in catalog of §3, BSC ≤ 4.5, is replaced for Apollo 11 exhibits by the note's own **RTCC star catalogue for Besselian year 1970**. It has 148 stars (69-FM-197 PDF pp. 309–313) and was transcribed by OCR. BSC remains the position source, and the 37 nav stars use the AGC vectors.
- **SCT plot convention**, which resolves §5.4:
  - the boresight is the optics line of sight at trunnion 0, i.e. the shaft axis;
  - plot +y is the direction of increasing trunnion;
  - plot +x = boresight × up, the as-seen view.

  Fig 3a therefore needs **no free parameters**.
- **Reticle scale:** the 0–50 scale inside the SCT circle has 0 at y = −25°. The TN D-6853 scan measures the "0" tick at −24.9° and the "5" tick at −20.2°. Its meaning is still unexplained.
- **Gimbal order and optics mounting** are taken from `CALCGA` and `NB1NB2` (32.523°).
- **Ephemeris:** astronomy-engine agrees with JPL Horizons to about 4″ (Venus, Saturn) and 14″ (Earth). IAU 1976 precession reproduces Meeus Example 21.b.

### Changes to the design

- **Fit (§5.1):** simplified to rotation and handedness only (Davenport q-method), because frame registration absorbs scale and offset. It still returns per-point residuals and the implied SCT angles.
- **Content:** plain `.md`, not MDX. No component is embedded in prose.
- **PDFs:** they live once in `data/sources/` and are copied to `site/public/docs/` by `scripts/sync-public.ts` (git-ignored), rather than duplicated in git.

### Data decisions made during implementation

- **RTCC catalogue:**
  - 18 of the 148 rows had OCR digits too garbled to match automatically. They are resolved in `data/manual/rtcc-overrides.json`, each confirmed by Bayer designation and by the corrected printed position (all < 0.002°).
  - Row 104 (κ Vel) was read from the page image as 9:21:11.0, −54:52:56.
  - The other 126 rows match BSC within 0.0084°.
- **Fig 3a digitization:** 8 glyphs are detected as blobs. Four glyphs touch the frame line or the SCT reticle (Sirius, Navi, Venus, Saturn) and were measured by eye on a 4× zoom (±0.2°). They are marked `method: "manual"`.
- **Crop box:** the Fig 3a crop is `{x:150, y:215, w:1080, h:1040}` at 300 dpi.

### Result (§8.2 golden test)

- **Fit to the scan:** 12 labeled bodies, **RMS 0.624°, max 1.595°** (Venus), meeting both targets.
- **Per body:** Aldebaran 0.08°, Saturn 0.14°, Menkar 0.23°, Alpheratz 0.27°, Mirfak 0.35°, Rigel 0.34°, Capella 0.36°, Navi 0.43°, Earth 0.51°, Diphda 0.70°, Sirius 0.81°, Venus 1.60°.
- **Free fit of the scan:** not mirrored, shaft −0.38°, trunnion 0.27°, RMS 0.508°. This confirms the SCT-at-rest convention independently.
