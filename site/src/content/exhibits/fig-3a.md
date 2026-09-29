---
title: "Figure 3a · Scanning telescope, Apollo 11 lunar orbit rev 30, 124:40:00 GET"
entry: view-program
summary: "The command module scanning telescope's view shortly after the LM lifted off from the Moon, recomputed from the 1969 inputs and compared with the 1972 printed figure."
figureRefs:
  - { document: tn-d-6853, anchor: fig3a }
  - { document: 69-fm-197, anchor: fig-9-3-8 }
  - { document: 69-fm-197, anchor: refsmmat }
  - { document: 69-fm-197, anchor: rtcc-catalogue }
figures: [fig3a]
---

## How this was made

1. **Time.** 124:40:00 ground elapsed time after the 13:32:00 UTC range zero on 16 July 1969 is 18:12 UTC on 21 July.
2. **Stars.** The 148 stars of the note's own RTCC catalogue (Besselian 1970) were transcribed by OCR; 22 rows the OCR could not read were read from the page images. Every row's printed position was checked against the Yale Bright Star Catalog to within 0.05°. The 37 navigation stars use the unit vectors stored in the Apollo 11 command module computer.
3. **Earth and planets.** Positions for that minute come from `astronomy-engine`, seen from the Moon's center and rotated into the same B1970 frame.
4. **Spacecraft attitude.** The stars are rotated through the Lunar lift-off REFSMMAT, then the gimbal angles I = 49.1°, M = 0°, O = 0°, in the order the guidance computer's `CALCGA` routine uses, and then the 32.5° optics mounting (`NB1NB2`).
5. **Projection.** The telescope looks along its shaft axis (trunnion 0°). The view is plotted as an azimuthal-equidistant ("fisheye") projection ±50° across, with up toward increasing trunnion.
6. **Comparison.** The 1972 figure was scanned at 300 dpi, registered to its ±50° frame, and each labeled body's position was measured.

## Limits

- The plot is drawn from the command module's reconstructed position: the Apollo 11 Mission Report's trajectory table, propagated from the nearest tabulated state (the note under the plot says which). From there the Moon is 131° from the telescope's axis, well out of view, as on the original. The residuals table uses the Moon's center as the observer, as registered for the validation; the difference moves Earth by under 0.3°.
- The −0 to −50 scale along the reticle's vertical line is drawn as it appears on the figures. Neither document explains it.
- The program drew the 37 navigation-star names on the microfilm itself (TN D-6853, appendix), so they are always shown; the 1972 print re-lettered them. Planet and Earth names, the header and the axis titles were added to the published figures, and the **Labels** switch shows or hides that layer. The boxes around planet names follow the 1969 note's version of this figure (69-FM-197 Fig 9.3-8); the 1972 print has none.
- Venus sits 1.6° from its printed position, the largest difference. The offset lies along Venus's own daily motion, which suggests the 1969 program's planetary ephemeris rather than the geometry.
