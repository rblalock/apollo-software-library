---
title: Limits
summary: What the recreation can't reproduce, what doesn't survive from 1969, and what is still unknown, with the reason for each.
---

Every figure the recreation draws is compared with its original, and every difference is recorded. This page collects in one place what the recreation can't do, does differently, or leaves out, and why. The measurements and the reasoning behind each item are in the [ledger](https://github.com/rblalock/apollo-software-library/blob/main/docs/ledger.md).

## What doesn't survive

These parts of the 1969 program are not known to survive in public. Without them, the recreation has to infer the program's rules from its printed output.

- **The source code.** The FORTRAN V program for the UNIVAC 1108 is not known to survive. Its projection, labelling, clipping and drawing rules were recovered by fitting the published figures. Listings or card decks would replace those fits with the real rules.
- **The input-deck format.** The documents give each view's inputs (mission time, platform alignment, gimbal angles), but not how they were fed to the program.
- **The 391-star catalogue.** TN D-6853 says the program could draw a 391-star catalogue whose first 37 entries, the Apollo navigation stars, were named on the film. It has not been found. The recreation uses the mission-control (RTCC) catalogue the figures were drawn from and the 1,078-star catalogue printed in 69-FM-107.
- **The crater models.** MSC built two-dimensional crater models from photographs of the landing site and installed them in the program for the descent views. They are lost, so recreated descent craters would have to come from a modern catalogue.
- **The coastline file.** The Earth views use modern, generalized coastlines from Natural Earth. Some dots on the originals, probably rivers or borders, are not drawn.
- **The window drawings.** MSC took the window outlines, the landing point designator (LPD) and the docking scribe from engineering drawings of the spacecraft. The recreation's command module window is traced from the 1969 plots instead, to within about 0.5°.
- **The planetary ephemeris.** In Fig 3a, Venus sits 1.6° from its printed position, along the direction of its own daily motion. That points to the 1969 program's planet positions rather than to the geometry.
- **The microfilm and the film.** MSC's film, *View from a Spacecraft*, survives as a video copy without the mission time of each frame, so its frames are not compared. The original microfilm has not been found.
- **The later views notes.** The Apollo 12 to 17 editions of the views notes, such as 69-FM-264 and 70-FM-90, appear only as index entries. The documents themselves are not online.

## Not built yet

- **The front-window descent views.** TN D-6853 Figure 5(a) and the front-window half of 69-FM-197's timed descent frames show the LM's front windows with the LPD scale and the crater models. The [LM descent exhibit](/view-program/lm-descent/) shows them as scans only. Figure 5 prints no time or attitude, the LM's attitude through the burn is known only from the note's narrative, the crater models are lost, and reading the horizon on the LPD depends on the horizon rule below. A recreation would use modern craters and could only be compared by eye.
- **Figure 8, the Rima Prinz study.** A candidate landing site seen through the LM's left front window, with a narrowed field, the LPD, rilles and craters, and the lunar horizon at the LPD's 58° mark ([scan](/documents/tn-d-6853/?page=15)). No time, trajectory or attitude is printed for it, and it depends on the same lost crater models.
- **Figure 9, the Apollo 13 abort view.** A preflight view through the command module window for an abort burn two hours after lunar orbit insertion on Apollo 13, with the Earth and stars ([scan](/documents/tn-d-6853/?page=15)). Every trajectory and attitude source in this project is from Apollo 11. The view needs Apollo 13's planned trajectory and burn attitude.
- **Encke's method.** The report says the program integrated trajectories by Encke's or Cowell's method. Only Cowell's is implemented.
- **One vehicle seen from another.** The [hidden-line LM and S-IVB](/view-program/lm-model/) are drawn on their own. Drawing one inside another spacecraft's window view is not built.

## Built, but different from the original

Each of these comparisons had its pass mark set before the scan was measured, and each missed. Nothing was adjusted to make them pass.

- **The horizon.** On [Figures 1 and 2](/view-program/fig-1-2/) (the Earth) and [Figure 3b](/view-program/fig-3b/) (the Moon), the 1969 program drew the horizon as a clean circle much smaller than the true one: 8.5°, 8.4° and 8.8° RMS off, against a limit of 1.0°. No point on the real trajectory gives a horizon that small. Fig 3b's would need an altitude near 1,100 km. On the [descent frames](/view-program/lm-descent/) the horizon passes at 2:06 into the burn and misses at ignition and at 5:26.
- **Night-side hatching.** On [Figures 6](/view-program/fig-6/) and [7](/view-program/fig-7/) the hatching runs 33° to 51° away from the direction of the Sun and does not follow the Earth's meridians. No rule tested fits it. The recreation hatches along great circles through the Sun.
- **Figure 7, the Moon on the approach.** The figure doesn't match its own printed times. Its distances disagree with its source, 69-FM-197. Fig 7(a)'s Moon is the size it was at about 68:39, not 70:00, and 7(b) is drawn at the same distance. Both show a lit crescent, where the Moon seen from the spacecraft at those times was nearly new.
- **Figure 4, the LM alignment telescope.** Panels (b), (c) and (e) miss their limit of 1.0°, at 1.02°, 1.90° and 1.26° RMS. Panels (d) and (f) pass. The LM's attitude on the surface is not printed, so it is fitted on panel (a).
- **Objects near the frame edge.** In Fig 4(e) the 1969 plot leaves out Menkar and the Sun, although both are in view. Its rule for which objects to draw near the corners is not documented.
- **Figure 1's Sun and Venus.** They are 3.5° and 3.1° from where they were on the launch date, and within 1.3° of where they would be three days later. The figure may come from a study for a later launch date, but that is unconfirmed.
- **The lunar orbit.** Over ten lunar orbits the recreated trajectory drifts 3.2° along its path from the Mission Report, and its direction after lunar orbit insertion is 3.0° off, against a limit of 1°. The model treats the Moon as a point mass, without the mass concentrations that pull real lunar orbits.
- **The 1,078-star catalogue.** 826 rows are verified against the Bright Star Catalogue, short of the 1,000 targeted. The rest, including 11 of the 37 navigation stars, failed OCR and could be transcribed by hand.

## Details not drawn

- The stippled night side of the Earth, and the atmosphere band on Figure 2.
- Crater rays on the Moon views.
- The parts of the alignment telescope's view blocked by the LM's own structure, shaded on the Figure 4 originals.
- The S-IVB with the LM still inside it. The model shows the stage after the spacecraft separated.

## Approximations

The recreation supplies these itself, and each exhibit says where it uses them.

- Coastlines from Natural Earth, crater names and positions from the IAU/USGS gazetteer, and mare outlines from LROC.
- Star positions from the Yale Bright Star Catalogue, matched to the 1969 catalogues.
- The plot conventions, fitted on Figure 3a and then tested on the other figures.
- The stars on the window and descent views, which are fitted, so they show consistency rather than a prediction.
- The LM descent path, read from a schematic figure (heights to within about 0.7 nautical miles).
- The LM and S-IVB models, built from press-kit dimensions. Strut attachment points, box sizes, antenna placement and window shapes are estimates.
- The [film](/view-program/film/)'s frames, which are the recreation's, not frames from the 1969 film.

## Open questions

- What rule did the program use to draw the horizon? The printed horizons sit at about 0.72 of the true distance from the plot centre, with 0.54 to 0.60 of the true radius.
- What rule placed the night-side hatching?
- What is the −0 to −50 scale along the scanning telescope reticle's vertical line in Figure 3? Neither document explains it.
- Why is Figure 7 labelled with times its own distances don't match?
- Which objects near the edge of the frame did the program leave out, and why?

## What would help

Any of these would move a limit on this page: the program's listings or card decks, its input-deck format, the 391-star catalogue, the crater models, the original microfilm or film, the Apollo 12 to 17 views notes, and Apollo 13's preflight trajectory data. If you know where any of them are, [open an issue on GitHub](https://github.com/rblalock/apollo-software-library/issues).
