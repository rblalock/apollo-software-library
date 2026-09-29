# Apollo Software Library

Working recreations of Apollo-era software, each with its history and primary sources.
The first entry is the MSC **view program** (NASA TN D-6853, 1972). Its first exhibit recomputes
TN D-6853 Figure 3a from 1969 inputs and measures the result against the 1972 scan.

**Result:** recomputed with no fitted parameters, the 12 labeled bodies land within **0.62° RMS
(max 1.60°)** of the 1972 figure. A free fit of the scan is consistent with the telescope-at-rest convention
(trunnion 0.3°, shaft −0.4°); that convention was itself chosen by fitting this figure during planning.

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
