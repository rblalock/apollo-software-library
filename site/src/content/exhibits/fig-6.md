---
title: "Figure 6 · Earth from the command module, translunar coast, 23–26 h GET"
entry: view-program
summary: "The Earth as the program drew it a day out from Earth: disc, terminator, night-side hatching and coastlines, recomputed from the Apollo 11 trajectory and compared with the 1972 prints."
component: globe
figureRefs:
  - { document: tn-d-6853, anchor: fig6 }
  - { document: a11-mission-report, anchor: table-7-ii }
figures: [fig6a, fig6b, fig6c, fig6d]
---

## How it is recomputed

1. **Where the spacecraft is.** The command module's state comes from the Apollo 11 Mission Report's trajectory table, propagated to the panel's time: from translunar injection or the first midcourse correction, whichever is nearer.
2. **What it is looking at.** The Earth's centre, in a 4° field, as the figure says.
3. **Which way is up.** The figures do not say. On panel (a), turning the plot to lay today's coastlines on the 1972 ink gives −121.1° from celestial north, with the coastlines landing on average 0.8 pixels from the printed ones. Of the candidate conventions, only one lands there: the spacecraft's own direction of travel (−120.8°). That rule, fixed on panel (a), draws panels (b) to (d) with nothing further adjusted.
4. **The globe.** Coastlines and large lakes are Natural Earth's 1:110 million outlines; the Earth turns with the time shown; the terminator and night side come from the Sun's position at that minute.

## How close it comes

Thresholds were set before any measurement: disc and terminator within 2% of the disc's diameter, named features within 3%.

| Panel | Disc | Terminator | Features (worst of 7–8) |
|---|---|---|---|
| (a) 23 h | 0.57% | 0.42% | 0.74% |
| (b) 24 h | 0.78% | 0.18% | 0.77% |
| (c) 25 h | 1.54% | 0.19% | 1.02% |
| (d) 26 h | 1.11% | 0.00% | 1.05% |

The features are Cape Agulhas, Cape Guardafui, Madagascar, Lake Victoria, Ras al Hadd, the tip of India, Cape Verde and Cabo de São Roque, wherever they are on the visible side. Each is found on the scan by sliding the modern coastline around it until it lies on the printed ink, and the slide is the error. Panel (a) was used to recover the "up" rule, so only (b) to (d) are true predictions; they do as well.

The printed R_E is the spacecraft's distance from the Earth's centre, not its altitude as the report's text defines it: R_E − h_E is exactly the Earth's radius on every panel.

## Limits

- **Hatching.** The 1969 program's night hatching does not follow any rule tested here: its lines run 33° to 51° away from the direction of the Sun and do not fit Earth's meridians. The recreation hatches along great circles through the Sun, every 15°, and its lines lean differently from the originals.
- The coastlines are modern and generalized; the 1969 program's own coastline file does not survive. Some dots on the originals (rivers or borders) are not drawn.
