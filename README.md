# Apollo Software Library

Working recreations of Apollo-era software, each with its history and primary sources. Every recreation says how
close it is to the original, and every difference from the surviving output is measured and recorded.

The first entry is the MSC **view program** (NASA TN D-6853, Hyle & Lunde, 1972): the UNIVAC 1108 program that drew,
onto microfilm, what Apollo crews would see through their windows and optics. The original source code is not known
to survive, so this is a *rebuilt-from-documents-and-output* recreation (tier 3): it recomputes the published 1969–72
figures from their inputs and compares the result with scans of the originals.

## What it reproduces

Each check below had its threshold fixed before the scan was measured. A miss is recorded, analysed and left
standing; inputs are never adjusted to pass. The full record, with every ruling, is in
[`docs/superpowers/ledgers/roadmap.md`](docs/superpowers/ledgers/roadmap.md).

| Exhibit | What is compared | Result |
|---|---|---|
| Fig 3a–c, scanning telescope, rev 30 | labelled stars and planets | 0.62° / 0.52° / 0.71° RMS (limit 1.0°); 3c only after correcting a sign printed wrong in both documents |
| Fig 4, LM alignment telescope | five panels predicted from one | 2 of 5 within limits; 3 recorded misses (1.02–1.90° RMS) |
| 1,078-star catalogue (69-FM-107) | rows matched to the Bright Star Catalog | 826 verified (target 1,000: missed, the rest unreadable in the scan) |
| Trajectory (Mission Report Table 7-II) | Fig 6 distances and speeds; rows against each other | pass (0.3–0.8%); 7 rows of the 1969 table found misprinted or inconsistent |
| Fig 6, Earth views | disc, terminator, 30 coastal landmarks | all pass (≤ 1.54%, limits 2–3%), with the plot's "up" recovered as the direction of travel |
| Fig 7, Moon views | disc, lighting | missed: the figure does not match its own printed times |
| Figs 1–2, window views at TLI and entry | stars, window outline, horizon | stars 0.4° RMS, outline within 1°; horizon missed |
| LM descent (69-FM-197 PDI frames) | stars, Sun, horizon | Sun within 0.6° (pass); horizon missed |
| Fig 3b lunar limb | limb from the CSM's position | missed |

The recurring miss is the horizon: on every view the 1969 program drew the Earth's or Moon's horizon as a clean
circle much smaller than the true one (Figs 1, 2, 3b), a rule not yet recovered.

## Layout

- `packages/view-engine` — framework-free TypeScript: time, star catalogues, reference frames (REFSMMAT, gimbals,
  optics), ephemerides, trajectory integration (Cowell, Dormand–Prince 5(4)) and the Mission Report state service,
  projections, scenes, globes, hidden-line vehicles, SVG and line-printer plotters, fitting.
- `site` — Astro with React islands and Tailwind: exhibits, source documents, the film player.
- `data/sources` — the primary-source PDFs (public domain) with `SOURCES.md` checksums.
- `data/manual` — hand-made inputs: transcribed tables, figure crops and hand-read positions, each with its reason.
- `data/derived` — generated data; every file records how it was made.
- `scripts` — the data pipeline; `scripts/test` its tests.
- `docs/superpowers` — design specs, plans and the execution ledgers.

## Commands

Requires [Bun](https://bun.sh) 1.3.

```sh
bun install
bun run test               # engine, script and site-logic tests, including every golden comparison
bun run typecheck          # the engine
bun run typecheck:scripts  # the data scripts
bun run check:site         # Astro and the site's TypeScript
bun run dev                # the site at http://localhost:4321
bun run build              # static site in site/dist (copies the PDFs and scans into it first)
```

## Rebuilding the data

The derived files are committed; rebuild them only to change the pipeline. The scripts need `pdftoppm` (poppler),
`tesseract`, `unzip`, and ImageMagick (`magick`, for `zoom-grid.ts`):

```sh
bun scripts/fetch-sources.ts                              # primary PDFs, with checksums
bun scripts/build-bsc.ts && bun scripts/build-agc-stars.ts
bun scripts/ocr-rtcc.ts && bun scripts/build-rtcc-catalog.ts
bun scripts/ocr-cat1078.ts && bun scripts/build-cat1078.ts
bun scripts/fetch-geodata.ts                              # coastlines, lunar craters and maria
bun scripts/extract-figures.ts                            # figure crops from the PDFs
bun scripts/digitize-figure.ts                            # labelled bodies and dots
bun scripts/digitize-limb.ts && bun scripts/digitize-globe.ts && bun scripts/digitize-arcs.ts
bun scripts/build-site-data.ts                            # star directions resolved for the site
```

## Deploying

The site is fully static; nothing is deployed from this repository yet.

- **Build:** `bun install && bun run build` at the repository root. **Output:** `site/dist`.
- **Size:** about 37 MB, of which 32 MB is the primary-source PDFs (the largest is 11.8 MB, under the 25 MiB
  per-file limit of the stricter hosts). The scans are 2.3 MB and the scripts, styles and fonts 1.6 MB.
- **Headers:** `site/public/_headers` sets long caching for the hashed `/_astro` assets and a week for PDFs and
  scans, in the format Netlify and Cloudflare Pages read; on other hosts, set the same rules in their config.
- No server, database or environment variables are needed.

## Sources and rights

The primary documents are NASA publications in the public domain. Geographic data: Natural Earth (public domain),
the IAU/USGS Gazetteer of Planetary Nomenclature (public domain), and LROC mare boundaries (Nelson et al. 2014,
NASA PDS). Star data: the Yale Bright Star Catalogue (VizieR V/50) and the Apollo guidance computer's own star
tables (Virtual AGC). This project is not affiliated with NASA.
