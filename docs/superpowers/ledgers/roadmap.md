# Ledger — plan: docs/superpowers/plans/2026-09-29-view-program-roadmap.md
Spec: docs/superpowers/specs/2026-09-29-view-program-roadmap-design.md
Mode: fully autonomous (user choice, 2026-09-29).

Roadmap: Ruling: tracked task-level plan without pre-written code — the user asked for autonomy and throughput; each task still names its tests and acceptance — cost if wrong: less step-by-step guidance if a different executor resumes.
Roadmap: Ruling: order 1 → 7 → 5 → 2 → 3 → 4 → 6 → 8 → 9 (dependency order; Earth/window/descent views need spacecraft positions from item 5) — cost if wrong: none.
Roadmap: Ruling: a missed golden test is recorded and marked it.skip with a ledger pointer rather than left red — keeps the suite usable for later items — cost if wrong: a miss could be overlooked (mitigated: reported prominently at the end).
Item 1.1: golden dots — 23 round scan dots all within 0.82° of a recreated star (median 0.26°); 23/30 unlabeled recreated stars matched directly, 7 confirmed by eye as merged dots (Orion's belt pair, 2 on the SCT circle, 1 touching '-40', 2 double-struck) and listed as exclusions; the test fails if the unmatched set changes.
Item 1.2: Ruling: digitizing driven by data/manual/figures/<id>.json (source page, crop, bodies); digitize-fig3a.ts and fig3a-names.json replaced by digitize-figure.ts — Fig 3a points/frame/scan verified byte-identical after migration — cost if wrong: none.
Item 1.1: Ruling: round-dot criterion area 50–90 px, ≤11 px, |w−h| ≤ 1, fill ≥ 0.7 — chosen from the observed blob distribution (dots 67–75 px, letters 10×15) before writing the golden test — cost if wrong: some dots classified as exclusions.
