---
title: MSC View Program
era: 1960s–1972 · Gemini rendezvous studies through the Apollo lunar missions
provenanceTier: 3
summary: A FORTRAN V program on a UNIVAC 1108 that drew, onto microfilm, what Apollo crews would see through their windows and optics at any moment of a mission.
people:
  - { name: "Charles T. Hyle", role: "Co-author of TN D-6853 (1972), the Apollo Experience Report on the program" }
  - { name: "Alfred N. Lunde", role: "Co-author of TN D-6853; author of the Apollo 11 views note, 69-FM-197" }
  - { name: "G. B. Roush", role: "Credited in 69-FM-197 with developing its major analytical tool (Computation and Analysis Division)" }
sources:
  - { label: "TN D-6853 on the NASA Technical Reports Server", url: "https://ntrs.nasa.gov/citations/19720017950" }
  - { label: "TN D-6853 on HathiTrust", url: "https://babel.hathitrust.org/cgi/pt?id=uiug.30112106781450&seq=21" }
  - { label: "69-FM-197 (Apollo 11 views) at the Virtual AGC library", url: "https://www.ibiblio.org/apollo/Documents/19740073250.pdf" }
  - { label: "Comanche055, the Apollo 11 command module software (Virtual AGC)", url: "https://github.com/virtualagc/virtualagc/tree/master/Comanche055" }
film: { label: "“View from a Spacecraft”, MSC computer-generated film (16:41)", url: "https://www.youtube.com/watch?v=O8Hv4R_kHn4" }
documents: [tn-d-6853, 69-fm-197, 69-fm-107, a11-mission-report, a11-press-kit-1, a11-press-kit-2]
exhibits: [fig-1-2, fig-3a, fig-3b, fig-3c, fig-4, fig-6, fig-7, lm-descent, lm-model, film]
---

## What it was

Before Apollo 8, analysts at NASA's Manned Spacecraft Center needed to know what the crew would actually *see* at critical moments. Where would the lunar horizon sit in the window at lunar orbit insertion? Which stars would be in the telescope when the platform needed realigning? The geometry of Earth, Moon, Sun and a moving spacecraft was too hard to picture unaided, and the crew simulators could not show everything.

The answer was a "somewhat dormant" program, originally written for early Gemini rendezvous and docking studies, which was revived and extended. It ran in FORTRAN V on a UNIVAC 1108. Its output was microfilm: a camera photographed images built from dots and straight lines on a cathode-ray tube. Those frames were printed on paper for mission documents and crew charts, and some were cut together into a film.

## What it was used for

- **Attitude checks before big burns.** For Apollo 8 it showed that the lunar horizon's position against a mark on the window could support an onboard go/no-go for lunar orbit insertion. Similar views backed up translunar injection, transearth injection and entry.
- **Star charts through the optics.** The Apollo 11 crew asked for views through the command module's scanning telescope and the lunar module's alignment telescope, and used them to choose stars before flight.
- **The lunar descent.** Views through the LM windows, including the landing point designator scale, showed which craters should cross which marks and when. The craters came from models built from photographs of the landing site.
- **Landing-site studies**, such as whether enough landmarks at Rima Prinz would be visible in the final four minutes of a descent.
- **Apollo 13.** Preflight abort views existed because of this program, and during the flight, views of Earth were the *only* attitude reference for a midcourse correction.

## How it worked

The program had two halves. The first integrated trajectories (by Encke's or Cowell's method) for up to four vehicles. The second drew what an observer would see: stars from either a 391-star catalog (whose first 37, the Apollo navigation stars, were named on the film) or a 1,078-star catalog down to magnitude 4.5, continents and craters, the day/night terminator shown with hatching, window outlines taken from engineering drawings at the astronaut's design eye position, and LM and S-IVB models with hidden lines removed. Inputs were the vehicle's position, velocity and attitude and the time, taken from each mission's operational trajectory document.

## What is original here, and what is reconstructed

The program's source code is not known to survive in public. This entry is therefore **rebuilt from documents and output**:

- **Original:** the 1969 inputs (mission times, REFSMMATs, gimbal angles), the RTCC star catalogue the plots were drawn from, and the guidance computer's own star vectors and optics geometry (Comanche055).
- **Reconstructed:** the projection and plot conventions, which were recovered by fitting the published figures, the renderer, and star positions from the Yale Bright Star Catalog matched to the 1969 catalogue.

Each exhibit compares the recreation against a scan of the original and reports the difference in degrees.
