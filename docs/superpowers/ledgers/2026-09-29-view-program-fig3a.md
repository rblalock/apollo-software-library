# SDD ledger — plan: docs/superpowers/plans/2026-09-29-view-program-fig3a.md
Spec: docs/superpowers/specs/2026-09-29-view-program-fig3a-design.md
Setup: Ruling: work on branch feat/view-program-fig3a in place (no separate worktree) — fresh repo with only spec+plan commits, user said "go ahead and implement"; a branch keeps main clean — cost if wrong: none (branch can be moved to a worktree later).

Pre-flight (shared interfaces):
- T3→T4: CatalogStar, starDirection, precessionMatrix, APOLLO_NAV_STARS, bsc45.json shape — consistent.
- T4→T6/T8/T12/T15: APOLLO_11 (created in T4 step 9, extended in T8 with FIG_3A_SPEC) — consistent; apollo11.ts imports scene types type-only (no runtime cycle).
- T5→T6/T8/T10: PlotAxes {ex,ey,ez}, projectAzimuthalEquidistant, unproject, axesFromBoresight(as-seen ex = ez×ey) — sctPlotAxes uses same convention — consistent.
- T7→T8: bodyDirection/bodyAngularRadiusDeg/BODY_LABEL/BodyName/Observer — consistent.
- T8→T9/T15: Primitive (text.rotate?, polyline.tone?), DisplayList, PlacedBody.direction — plotter handles rotate/tone — consistent.
- T4(fetch-sources)→T11: data/sources/tn-d-6853.pdf + sources.json fields url/retrieved/sha256 — consistent.
- T11→T12/T15: fig3a-points.json {image.widthPx/heightPx, frame, points[id,kind,xDeg,yDeg]} — consistent.
- T13→T14/T15: collections entries/documents/exhibits and fields — consistent.
Task 1: Ruling: root workspaces = ["packages/*"] until site/ exists (Task 13 adds "site") — bun errors on a missing workspace dir — cost if wrong: none
Task 1: complete (commits 3e52b28..947f460, tests: bun run test →    Duration  67ms (transform 60%, import 22%, tests 10%, worker 7%))
Task 2: complete (commits 947f460..4492567, tests: bun run test →    Duration  71ms (transform 61%, import 22%, tests 10%, worker 7%))
Task 3: complete (commits 4492567..bcc2656, tests: bun run test →    Duration  109ms (transform 62%, import 25%, tests 7%, worker 6%))
Task 4: Ruling: override rows store printedRaDeg/printedDecDeg/separationDeg = null (build no longer computes a separation from their garbled OCR) — the plan's script produced meaningless separations up to 98° for override rows; the corrected reading is kept in each override's reason and was verified < 0.002° — cost if wrong: none (data-only field)
Task 4: complete (commits bcc2656..683328f, tests: bun run test →    Duration  126ms (transform 68%, import 22%, tests 6%, worker 4%))
Task 4: Ruling: added .gitattributes (*.pdf, *.png binary) — git stored 69-fm-107.pdf as text — cost if wrong: none
Task 5: complete (commits 83e7e9f..acd2fe3, tests: bun run test →    Duration  135ms (transform 68%, import 22%, tests 6%, worker 4%))
Task 6: complete (commits acd2fe3..3a222d9, tests: bun run test →    Duration  159ms (transform 65%, import 25%, tests 6%, worker 4%))
Task 7: Ruling: tightened 'observer cannot look at itself' to toThrow(/cannot view itself/) — the plan's bare toThrow() passed before the implementation existed — cost if wrong: none
Task 7: complete (commits 3a222d9..e07b49c, tests: bun run test →    Duration  254ms (transform 72%, import 23%, tests 3%, worker 2%))
Task 8: complete (commits e07b49c..2046f24, tests: bun run test →    Duration  238ms (transform 68%, import 25%, tests 4%, worker 3%))
Task 9: complete (commits 2046f24..8a2de7c, tests: bun run test →    Duration  258ms (transform 69%, import 24%, tests 4%, worker 2%))
Task 10: Ruling: annotated eigen.ts identity matrix as number[][] — plan code inferred (0|1)[][] and failed tsc — cost if wrong: none
Task 10: complete (commits 8a2de7c..634f63a, tests: bun run test →    Duration  284ms (transform 68%, import 25%, tests 4%, worker 3%))
Task 11: Ruling: Fig 3a crop box = {x:150,y:215,w:1080,h:1040} (plan's y:300,h:1000 clipped the gimbal-angle block) — cost if wrong: none
Task 11: SCT_SCALE measured on the scan: '0' tick at −24.9°, '5' tick at −20.2° → zeroAtYDeg −25 kept
Task 11: complete (commits 634f63a..a5bb082, tests: bun run test →    Duration  302ms (transform 64%, import 29%, tests 5%, worker 3%))
Task 12: golden result — RMS 0.624°, max 1.595° (Venus); free fit: mirror=false shaft=-0.38° trunnion=0.27° rms=0.508°
Task 12: complete (commits a5bb082..db8a9cb, tests: bun run test →    Duration  290ms (transform 62%, import 30%, tests 5%, worker 3%))
Task 13: Ruling: root workspaces now ["packages/*", "site"] (deferred from Task 1)
Task 13: complete (commits db8a9cb..91df9d1, tests: bash -c 'bun run test && bun run build' → 11:43:29 [build] Complete!)
Task 14: Rosen attribution NOT added — the YouTube description (chapters only) does not name Barry Rosen; leaving him out of 'people' until verified (flag in final report)
Task 14: Ruling: added break-all to the document source URL — the 150-char Wayback URL would force horizontal scroll at phone width — cost if wrong: none
Task 14: complete (commits 91df9d1..0da12e4, tests: bash -c 'bun run build && bun run check:site' → - 0 hints)
Task 15: complete (commits 0da12e4..b7a15d5, tests: bash -c 'bun run build && bun run check:site' → - 0 hints)
Task 16: Ruling: added site/public/favicon.svg + <link rel=icon> — the browser check showed a favicon.ico 404 console error on every page — cost if wrong: none
Task 16: complete (commits b7a15d5..4853ae4, tests: bash -c 'bun run test && bun run typecheck && bun run check:site && bun run build' → 11:48:09 [build] Complete!)
Final review: fresh reviewer (opus) — verdict "With fixes"; 0 Critical, 3 Important, 11 Minor.
Final: re-graded minor 4 (unsupported reader-facing claims: era "1965", "37-, 391- or 1,078-star catalog") → Important — same class as Important 3 (false statements to readers of a history library).
Final: re-graded minor 6a (reticle scale labels print "−0…−50" but page claims "drawn as it appears") → Important — reader-visible false claim + overlay mismatch.
Task 11: Ruling: 4 of 12 golden points (Sirius, Navi, Venus, Saturn) use manualPx instead of blob snapping — their glyphs merge with the frame line or reticle; measured on 4× zooms (±1.5 px ≈ 0.2°), reviewer re-verified them — cost if wrong: ≤0.2° on four points (recorded late, per reviewer minor 10).
Final: fixed RTCC rows accepted unchecked (Important 2) — resolveRtccRows tests + data test 'verifies every row' RED→GREEN, suite 69/69; overrides now structured {hr, ra, dec} and verified (22 rows, incl. nav 5/7/19/35 read from page 291; row 96 tenths corrected to 24.4 from page 293); rtcc1970.json provenance now also lists the BSC source
Final: fixed unsupported reader claims (Important 3 + re-graded minors 4, 6a) — scene tests 'nav-star names … machine layer' and 'reticle scale −0 … −50' RED→GREEN, suite 71/71; fig-3a.md/README/spec §11/view-program.md reworded (labels provenance, "consistent with" not "independently", era "1960s–1972", 391/1,078 catalogs); Venus limit line added after verifying model Venus at −34 h lands 0.16° from the scan
Final: Ruling: spec §11 also records reviewer minor 9 (gnomonic/mirror dropped, ViewSpec shape, no magnitude size classes, Rosen omitted) — edited while correcting §11 for Important 3; documentation only, no code — cost if wrong: none
Final: fixed gimbal inputs rendering values the reader did not type (Important 1) — parseAngleDraft tests RED→GREEN, suite 74/74; browser repro: '-45' → M = −45.0°, '' / '4590' → inline alert + last valid angle, '-90' renders without NaN; Reset now counts drafts/errors (reviewer minor 7 resolved by the same state change)
Final: Ruling: vitest now also collects site/src/**/*.test.ts — needed to unit-test the exhibit's input parser — cost if wrong: none
Final: minor (deferred): source links missing for range zero, gimbal angles, 60° FOV; "Inputs (1969)" heading shows try-it time; residuals table doesn't say it stays on 1969 values (reviewer 8) → design pass (roadmap 8)
Final: minor (deferred): agc37.json provenance should also list the ALSJ star-name source (reviewer 11, partly fixed for rtcc1970.json) → catalog item (roadmap 7)
Final: minor (deferred): no command typechecks scripts/ (reviewer 12)
Final: minor (deferred): client bundle ships all of bsc45.json (189 KB) to resolve 148 stars (reviewer 13) → design pass / hosting
Final: minor (deferred): page doesn't say M/O rest on the CALCGA round trip rather than a golden figure (reviewer 14) → roadmap 1 golden tests exercise other gimbals
Final: minor (deferred): planets drawn as open discs while both originals use the star glyph (reviewer 6b)
Final: minor (deferred): typed labels overlap reticle marks on the plot (own browser check)
Final: Ruling: declined-to-judge — favicon.ico 404: we ship /favicon.svg via <link rel=icon>; the ico probe is harmless — cost if wrong: a console line
Final: Ruling: declined-to-judge — server.fs.allow ['..'] is dev-only; revisit at hosting — cost if wrong: none now
Final: Ruling: declined-to-judge — visual polish → roadmap 8; 1972 print's broken horizontal reticle line is a print artifact (1969 version is continuous) — keep full line; ephemeris aberration/nutation/light-time at arcsecond level stay out; grid 4096 not exposed in UI → film mode (roadmap 6); REFSMMAT digits and range zero were verified from the page image during planning; tesseract-version drift is now caught because every row (incl. overrides) is position-verified; bun.lock not reviewed — cost if wrong: low
Final: Ruling: ledger copied to docs/superpowers/ledgers/ before deleting the git-ignored workspace — the user chose fully autonomous roadmap execution with one report at the end, so the rulings must survive context compaction — cost if wrong: one extra doc file
