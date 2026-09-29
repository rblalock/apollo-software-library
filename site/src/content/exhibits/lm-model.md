---
title: "Hidden-line LM and S-IVB"
entry: view-program
summary: "The program's hidden-line vehicle models, rebuilt from the dimensions in the 1969 Apollo 11 press kit. Turn the lunar module or the S-IVB and only the edges an observer could see are drawn."
component: vehicle
figureRefs:
  - { document: tn-d-6853, anchor: appendix }
  - { document: a11-press-kit-1, anchor: lm-structures }
  - { document: a11-press-kit-2, anchor: descent-stage }
  - { document: a11-press-kit-2, anchor: s-ivb }
---

## What the program did

The report's list of capabilities includes: "Hidden-line models of the LM and the S-IVB can be produced; that is, given a certain spacecraft attitude, only the portion of the spacecraft visible to the observer will be shown." The program could also draw vehicle outlines at their apparent size as seen from another vehicle, and integrate up to four trajectories at once so that one spacecraft could be checked for visibility through another's window. The MSC film *View from a Spacecraft* shows a lunar module turning, drawn this way.

## How it is rebuilt

- **Shapes.** The 1969 models do not survive. These are rebuilt from the dimensions the Apollo 11 press kit prints: the LM stands 22 ft 11 in and spans 31 ft across its landing gear; the ascent and descent stages are 12 ft 4 in and 10 ft 7 in high, both 14 ft 1 in across; the crew compartment is 92 in by 42 in; footpads are 37 in. The S-IVB is 58 ft 4 in by 21 ft 8 in, with a 3 ft instrument unit. Tests hold every one of these within 1%. Everything else is an estimate from photographs and is listed beside the drawing.
- **Hidden lines.** Each vehicle is a set of convex solids (boxes, prisms, cones) plus thin "wires" for probes, ladder, antennas and window outlines. An edge is drawn only where no other solid stands between it and the eye: each edge is clipped exactly against the region hidden behind every other solid.
- **Drawing.** A perspective camera keeps straight edges straight, as they were on the CRT, and everything is plotted as line segments on the same recorder grid as the star charts.

## Limits

- Strut attachment points, box sizes, antenna placement and window shapes are estimates. Round parts are 16-sided.
- The S-IVB is shown after the spacecraft has separated: the adapter's four upper panels are gone and the lunar module, gear folded, is not modelled inside the ring.
- Drawing one vehicle inside another's window view comes with the window exhibits. The trajectory service that places the vehicles is already built: the Fig 3 plots use it.
