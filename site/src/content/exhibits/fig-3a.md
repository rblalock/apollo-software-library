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
