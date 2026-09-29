# View Program Roadmap: Implementation Plan

> Tracked plan for autonomous execution. Tick `- [x]` as work lands. Decisions go to `docs/superpowers/ledgers/roadmap.md`.
> Spec: `docs/superpowers/specs/2026-09-29-view-program-roadmap-design.md`

**Ruling on plan granularity:** each task below lists its files, its tests and its acceptance command. Code is written test-first during execution rather than pre-written here. The user asked for fully autonomous execution with a tracked plan; pre-writing all code, as the Fig 3a plan did, would double the work.

## Global Constraints

- The engine (`packages/view-engine/src`) imports no DOM, framework, `fs` or JSON.
- Every `data/derived/*.json` file carries a provenance block.
- Golden thresholds default to **RMS ≤ 1.0°, max ≤ 2.0°** unless an item's spec says otherwise, and are fixed before digitizing.
- Never tune inputs to pass; the stop rule is in spec §4.
- `bun run test && bun run typecheck && bun run check:site && bun run build` stays green at every commit.
- Each item ends with a commit, a golden result line in the ledger, and its checkbox ticked.

---

## Item 1: Figs 3b, 3c, the dot check, and AOT (Fig 4)

- [x] 1.1 **Dot-check golden (Fig 3a):** `scripts/lib/digitize.ts` exposes the round-dot blobs. Test `golden-fig3a-dots.test.ts`: every in-frame RTCC star has a scan dot within 1.0°, and every round scan dot has a star within 1.0°, apart from listed exclusions. Data: `fig3a-dots.json` from `digitize-fig3a.ts`.
- [x] 1.2 **Generalize digitizing:** `scripts/digitize-figure.ts <id>`, driven by `data/manual/figures/<id>.json` (source page, crop, name map). Migrate Fig 3a and keep its outputs identical (test).
- [x] 1.3 **Figs 3b and 3c:** add crops, name maps and points. Add `FIG_3B_SPEC` and `FIG_3C_SPEC`. Golden tests are zero-parameter.
- [x] 1.4 **AOT geometry:**
  - `frames/aot.ts`: detent line of sight in the LM body frame, plot axes, a 60° field.
  - `frames/surface.ts`: landing-site local frame → inertial, using the IAU Moon rotation from astronomy-engine.
  - Unit tests: detent directions are 45° from +X and 60° apart, and the local frame is orthonormal with +X up.
- [ ] 1.5 **Fig 4 digitizing:** six panels from TN D-6853 (PDF pp. 10–12), with name maps.
- [ ] 1.6 **Attitude fit on panel (a):** solve for the LM attitude and the AOT plot convention from panel (a) only. Record the result, check plausibility (+X within 5° of vertical; yaw compared with the ALSJ value), and freeze it into `FIG_4_LM_ATTITUDE`.
- [ ] 1.7 **Fig 4 golden:** panels (b)–(f) predicted with zero further parameters.
- [ ] 1.8 **Figure exhibit:** generalize `Fig3aExhibit` into `FigureExhibit` with a config; add pages for Fig 3b, 3c and 4, plus exhibit Markdown and entry links. Build and check in the browser.
- [ ] 1.9 **Ledger and commit.**

## Item 7: The 1,078-star catalog

- [ ] 7.1 **Locate and OCR:** find the table pages in `69-fm-107.pdf` (PDF pp. 14–32), check the rotation, and OCR into `data/derived/cat1078-ocr.txt`.
- [ ] 7.2 **Parser:** `scripts/lib/cat1078.ts` (SEQ, RA, Dec, magnitude, name), with fixture tests from real OCR lines.
- [ ] 7.3 **Resolve and verify:** reuse the `resolveRtccRows` pattern (generalized), with `data/manual/cat1078-overrides.json`. Determine the table's epoch with the epoch test.
- [ ] 7.4 **Data tests:** at least 1,000 rows verified within 0.05°, and the unresolved remainder listed.
- [ ] 7.5 **Engine and exhibit:** `resolveCatalog` accepts either catalog; the exhibit gets a catalog switch.
- [ ] 7.6 **Ledger and commit.**

## Item 5: Trajectory and vehicles

- [ ] 5.1 **Constants and gravity:** GM for Earth, Moon and Sun; Earth J2; body positions from astronomy-engine. Tests: a two-body circular orbit conserves energy to 1e-9 over 10 orbits.
- [ ] 5.2 **Cowell integrator:** adaptive RK (Dormand–Prince 5(4)) in `trajectory/propagate.ts`. Test: Kepler orbit propagation against the analytic solution.
- [ ] 5.3 **Initial states:** transcribe the Mission Report trajectory-parameter tables into `data/manual/a11-events.json`, with a converter from geodetic/selenographic data to an inertial state. Test: round trip.
- [ ] 5.4 **Validation golden:** TN D-6853 Figs 6–7 R_E/V_i and h_M within 1%; later Mission Report events within 1%.
- [ ] 5.5 **Multi-vehicle state service:** `missionState(get) → { csm, lm?, sivb? }` positions.
- [ ] 5.6 **Hidden-line solids:** `vehicles/solids.ts` (LM, S-IVB) and `vehicles/hiddenline.ts`. Tests: cube and occluded-edge cases.
- [ ] 5.7 **Exhibit:** a rotating LM hidden-line view, plus Fig 3b's Moon limb from the CSM position (update its limitation note).
- [ ] 5.8 **Ledger and commit.**

## Item 2: Earth and Moon

- [ ] 2.1 **Coastline data:** a Natural Earth 110m download script, simplified, with provenance.
- [ ] 2.2 **Lunar feature data:** maria and major craters, with a download script and provenance.
- [ ] 2.3 **Globe renderer:** limb, terminator and hatching in the scene, from the observer state. Unit tests on limb radius and terminator geometry.
- [ ] 2.4 **Digitize Figs 6a–d and 7a–b:** limb circle, terminator ellipse and named features.
- [ ] 2.5 **Golden:** within 2% (disc and terminator) and 3% (features) of the diameter.
- [ ] 2.6 **Exhibits, ledger and commit.**

## Item 3: CM windows and maneuver views

- [ ] 3.1 **Digitize Figs 1, 2 and 9:** stars, the window outline polygons, the horizon, and the terminator.
- [ ] 3.2 **Window polygons:** in the CM body frame for the left and right eye. Consistency test across figures.
- [ ] 3.3 **Scenes:** attitude fitted from stars; Earth horizon and terminator predicted. Golden within 2°.
- [ ] 3.4 **Exhibits, ledger and commit.**

## Item 4: LM descent

- [ ] 4.1 **Descent data:** reconstruct the Apollo 11 PDI trajectory from the Mission Report; landing site constants.
- [ ] 4.2 **LM windows and LPD:** geometry from 69-FM-197 Fig 6.2.1-1 and TN Fig 5.
- [ ] 4.3 **Craters:** a crater set around the landing site, with provenance; drawn as perspective ellipses.
- [ ] 4.4 **Digitize the note's timed PDI frames:** the horizon's LPD reading, Earth and stars.
- [ ] 4.5 **Golden:** LPD horizon within 3°; Earth and stars within 2°.
- [ ] 4.6 **Exhibit (sequence), ledger and commit.**

## Item 6: Film and printer plots

- [ ] 6.1 **`plotter/printer.ts`:** a 132-column line-printer rendering, with snapshot tests.
- [ ] 6.2 **Film player island:** frame sequences, playback controls, microfilm treatment.
- [ ] 6.3 **Exhibit, ledger and commit.**

## Item 8: Design and hosting preparation

- [ ] 8.1 **Design system:** tokens, typography and layout, applied across pages.
- [ ] 8.2 **Plot labels:** collision-avoiding label placement; planet glyphs as on the originals.
- [ ] 8.3 **Exhibit input fixes:** source links for every input; the "Inputs (1969)" and residual-scope wording.
- [ ] 8.4 **Build-time catalog resolution:** remove `bsc45.json` from the client bundle.
- [ ] 8.5 **Accessibility pass;** a typecheck command for `scripts/`.
- [ ] 8.6 **Hosting preparation:** static-host config and README deploy notes (no deploy).
- [ ] 8.7 **Ledger and commit.**

## Item 9: Outreach drafts

- [ ] 9.1 Write the drafts in `docs/outreach/` (NARA, JSC History Office, VTC Media about Rosen, ALSJ/AFJ editors).
