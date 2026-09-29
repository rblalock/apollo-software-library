# View Program Roadmap: Design

- **Date:** 2026-09-29
- **Status:** Approved for autonomous execution (the maintainer chose "fully autonomous": no approval pauses, one report at the end)
- **Builds on:** `2026-09-29-view-program-fig3a-design.md` (the Fig 3a POC, merged into `main`)

## 1. Goal

Grow the Fig 3a proof of concept into a recreation that covers every capability TN D-6853 describes.

Each capability ships as a library exhibit and is validated against the published 1969–72 figures, using the same method as Fig 3a:
- 1969 inputs where they exist;
- zero-parameter prediction wherever possible;
- golden tests with thresholds fixed before any data is digitized;
- a stop rule: never tune inputs to force a pass.

Where 1969 data does not survive (coastlines, crater sets, window drawings), we build our own version and label it as reconstructed.

## 2. Execution order

The spec's §10 list is reordered by dependency. The Earth, window and descent views all need spacecraft positions.

| # | Item | Depends on |
|---|---|---|
| 1 | Figs 3b, 3c, the Fig 3a unlabeled-dot check, and the LM AOT views (Fig 4) | Fig 3a engine |
| 7 | The 1,078-star catalog (69-FM-107 Table I) | Fig 3a catalog tooling |
| 5 | Trajectory integration (up to 4 vehicles) and hidden-line vehicle models | none |
| 2 | Earth and Moon rendering (limb, terminator hatching, coastlines, lunar features) | 5 |
| 3 | CM window outlines and critical-maneuver views (Figs 1, 2, 9) | 2, 5 |
| 4 | LM descent: front and docking windows, the LPD scale, crater models (Figs 5, 8, 69-FM-197 PDI frames) | 2, 3, 5 |
| 6 | Film playback of frame sequences, plus line-printer "printer-plot" output | 1–4 |
| 8 | Design pass, label placement, source links, bundle size, hosting preparation (no deploy) | all |
| 9 | Outreach drafts (NARA, JSC History Office, Roush and Rosen), prepared for the maintainer to send | none |

## 3. Items

### Item 1: Validate on figures the convention was not fitted to

- **Figs 3b and 3c** (TN D-6853 PDF p. 10; 69-FM-197 Fig 9.3-8b/c):
  - Inputs: the Lunar lift-off REFSMMAT; gimbals I = 17.86°, M = O = 0 at 125:00:00, and I = 89.10°, M = O = 0 at 125:15:00; SCT at rest.
  - **Zero-parameter golden tests** on the labeled bodies, with RMS ≤ 1.0° and max ≤ 2.0°.
  - Fig 3b shows the Moon's limb. The Moon is not drawn until item 5 supplies the CSM position; stars behind it are still drawn and noted as a limitation.
- **Fig 3a unlabeled-dot check** (the reviewer's recommendation): every RTCC star the recreation puts in the frame must have a scan dot within 1.0°, and every round scan dot must have a recreated star within 1.0°. Dots touching reticle lines or labels are listed as exclusions.
- **LM AOT** (TN D-6853 Fig 4a–f = 69-FM-197 Fig 10.0-3, "2 hours prior to lunar lift-off"):
  - New instrument: the AOT is fixed to the LM body, with six detents at 60° spacing in azimuth around +X, 45° from +X, each with a 60° field. Geometry comes from 69-FM-197 Fig 10.0-1 and the ALSJ.
  - The LM body attitude on the surface is not printed, so it is **fitted on panel (a) only**, together with the AOT plot convention. **Panels (b)–(f) are then predicted with zero further parameters**, and that prediction is the golden test (same thresholds).
  - The fitted attitude must be physically plausible: +X within 5° of the local vertical at the landing site, and yaw reported next to the actual ALSJ value.
  - Time: 122:23:21 GET, 2 hours before the note's planned ascent at 124:23:21 (69-FM-197 Table I). Observer: the Moon's center, with the site offset noted.
- **Exhibits:** the Fig 3a exhibit is generalized into a reusable figure exhibit (config: spec, scan, points, instrument), with pages for Fig 3b, Fig 3c and Fig 4 (six panels).

### Item 7: The 1,078-star catalog

- OCR of 69-FM-107 Table I (PDF pp. 14–32, rotated line-printer pages).
- Each row is matched to BSC5 by position and verified exactly like the RTCC catalogue: every row checked, overrides structured and checked, and failures that name the row.
- Delivered as `data/derived/cat1078.json`, with an engine loader and an exhibit catalog switch between "RTCC 148" and "1,078".
- **Acceptance:** at least 1,000 rows verified within 0.05°; unmatched rows listed and explained. The table's epoch is determined like the AGC epoch test.

### Item 5: Trajectory and vehicles

- **Cowell integrator** (adaptive RK, Earth + Moon + Sun point masses; Earth J2 while in Earth orbit) in the engine. Encke is optional; the report says either was used.
- **Initial states** from the Apollo 11 Mission Report trajectory-parameter tables (event GET, latitude, longitude, altitude, space-fixed velocity, flight-path angle, heading), converted to inertial state vectors.
- **Validation:** the R_E and V_i printed on TN D-6853 Figs 6–7 (23–26 h and 70–72 h GET) within 1%, and the Mission Report event parameters at later events within 1%.
- **Up to four vehicles** (CSM, LM, S-IVB) are propagated together.
- **Hidden-line models:** LM (descent and ascent stages) and S-IVB as polyhedra from published dimensions. Edge visibility is computed against the faces and drawn as recorder-grid polylines.
  - Validation: unit tests on primitive solids, and a visual comparison with the film's rotating-LM segment.

### Item 2: Earth and Moon

- **Rendering:** perspective globe rendering from the observer's position: the limb, the terminator, and night-side hatching along great circles through the subsolar axis, as on Figs 6–7.
- **Earth coastlines:** Natural Earth 1:110m (public domain), simplified toward the period look.
- **Moon features:** maria outlines and major craters from public-domain lunar datasets, labeled as reconstructed.
- **Validation:** Figs 6a–d and 7a–b:
  - the disc size and terminator position/orientation within 2% of the disc diameter;
  - named features (Africa, South America, Copernicus, Mare Serenitatis) placed within 3% of the diameter.

### Item 3: CM windows and maneuver views

- **Window outlines:** the CM rendezvous and hatch windows are recovered as angular polygons for the left and right eye from Fig 1 and checked for consistency on Figs 2 and 9. They are labeled as reconstructed from the published plots.
- **Attitude:** fitted from the labeled stars in each figure (the attitudes are not printed).
- **Validation:** the Earth horizon and terminator positions are predicted, and they must match the scan within 2°.

### Item 4: LM descent

- **Window geometry:** LM front windows (170° field) and docking window (100°), with the LPD scale, from 69-FM-197 Fig 6.2.1-1 and TN D-6853 Fig 5.
- **Descent path:** reconstructed from the Mission Report's powered-descent data.
- **Attitude:** windows down, then a yaw to windows up, per the note's narrative.
- **Crater models:** built around the landing site from a public lunar crater catalog, drawn as perspective ellipses.
- **Validation:**
  - the horizon's LPD reading at the note's timed frames within 3°;
  - Earth and star positions in the docking-window frames within 2°;
  - crater placement is qualitative and documented as such.

### Item 6: Film and printer plots

- **Film playback:** frame sequences, such as Fig 3's 124:40 → 125:15 and the descent frames, shown in microfilm style with frame timing and an optional grain/bloom treatment, from the engine's display lists.
- **Printer plots:** a line-printer rendering of any display list (132 columns), as the report says the program produced for a quick look.
- **Acceptance:** deterministic output tests (a snapshot of a small display list), and an exhibit page.

### Item 8: Design and hosting preparation

- **Visual design:** typography, color tokens, dark and light modes, and the exhibit layout.
- **Plots:** label collision avoidance on plots; planets drawn with the originals' star glyph.
- **Exhibit fixes:** every input value linked to its source; the "Inputs (1969)" and "residuals stay at 1969" wording corrected.
- **Performance:** catalog resolution moves to build time, so the client no longer ships `bsc45.json`.
- **Accessibility:** a pass on labels, keyboard use and contrast.
- **Hosting preparation:** a static-host configuration and README deploy notes. Nothing is published.

### Item 9: Outreach drafts

Letters and emails for the maintainer to review and send (kept outside the repository):
- a NARA Fort Worth reference request (the 35 mm film and any listings);
- the JSC History Office;
- a VTC Media inquiry about Barry Rosen, to confirm his role;
- a note for the ALSJ/AFJ editors.

## 4. Cross-cutting rules

- The engine stays framework-free; data scripts write provenance; every golden threshold is fixed before digitizing.
- Each item appends its decisions to `docs/ledger.md` as `Ruling:` lines and records its golden result.
- The provenance tier stays at 3 ("rebuilt from documents and output").
- The stop rule: if a golden test misses, never tune inputs. Record the measured misfit and its analysis in the ledger. Mark the assertion `it.skip('… — see ledger: <item>')` so the suite stays usable for later items, keep a passing test that records the measured values, and report the miss prominently at the end. Continue with independent items.
