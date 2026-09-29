---
title: "Figure 3b · Scanning telescope, rev 30, 125:00:00 GET"
entry: view-program
summary: "Twenty minutes after Fig 3a, with the inner gimbal at 17.86°. Predicted with no fitted parameters, as a test of the conventions recovered from Fig 3a."
figureRefs:
  - { document: tn-d-6853, anchor: fig3a }
  - { document: 69-fm-197, anchor: fig-9-3-8 }
figures: [fig3b]
---

## Why this figure matters

Fig 3a was used to establish how the scanning-telescope plots were drawn: the telescope at rest, "up" toward increasing trunnion, the view as seen. Fig 3b was not used for any of that. It shows the same platform twenty minutes later with only the printed inner gimbal angle changed (17.86°), so it tests whether those conventions are right.

Recomputed with nothing fitted, its eight labeled bodies land within **0.52° RMS (0.80° worst)** of the 1972 print. A free fit of its stars, turned back into gimbal angles, gives I = 17.88°, M = −0.28°, O = −0.23°: the printed 17.86°, 0°, 0°.

## Limits

- **The Moon.** The Moon's limb crosses the top of the original, hatched as the night side. The recreation draws it from the command module's reconstructed position: the Mission Report's docking state propagated back three hours, 58 nautical miles above the far side. From there the Moon is 70.3° in radius and its limb crosses the field almost straight, at Y ≈ +31°.
- **The 1969 limb is drawn differently.** On the original the limb is a clean circle (fitted to the scan to 0.16°) of radius 37.8°, centred 72.8° from the telescope's axis. No point on the real orbit gives a Moon that small: it would take an altitude near 1,100 km. The limb test registered before measuring allowed 1.0° RMS; it measures 8.8°. The rule the 1969 program used to draw the horizon is not recovered, and nothing was adjusted to hide the difference.
- Because the true horizon is lower, Menkar sits 1.3° behind the Moon in the recreation although the 1969 plot shows it. The residuals table still measures Menkar, because it uses the Moon's center as the observer, as registered for these tests.
- The 1969 plotter drew Navi slightly past the frame edge. The recreation clips at the frame, so Navi appears in the residuals table but not on the plot.
