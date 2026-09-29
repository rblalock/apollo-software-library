import { buildScene, formatGet, parseGet, vehiclePrimitives, type DisplayList } from '@asl/view-engine';
import { displaySpec, FIGURES, stars } from './figures';
import { GLOBES, globeDisplay } from './globes';
import { orbitCamera, VEHICLES } from './vehicle';

/** A computed film: `frames` display lists at a fixed step, played in sequence like the program's microfilm. */
export interface Reel {
  id: string;
  /** The reel selector's button text, kept short so the four buttons fit on one line. */
  short: string;
  label: string;
  description: string;
  frames: number;
  fps: number;
  frame(i: number): { dl: DisplayList; caption: string };
}

const get = (from: string, stepS: number, i: number) => formatGet(parseGet(from) + i * stepS);
const pad3 = (n: number) => String(n).padStart(3, '0');
const getLabel = (g: string) => `GET ${g.padStart(9, '0')}`;

export const REELS: Reel[] = [
  {
    id: 'earth', short: 'Earth', label: 'Earth, translunar coast', fps: 12, frames: 101,
    description: 'The Earth from the command module every 3 minutes from 22:00 to 27:00 GET, framed like Figure 6: the Earth turns and shrinks as the spacecraft climbs away.',
    frame(i) { const g = get('22:00:00', 180, i); return { dl: globeDisplay(GLOBES.fig6a!, g)!.dl, caption: getLabel(g) }; },
  },
  {
    id: 'moon', short: 'Moon', label: 'Moon on the approach', fps: 12, frames: 115,
    description: 'The Moon from the command module every 15 minutes from 40:00 to 68:30 GET, framed like Figure 7: it grows to fill the 6° field, almost entirely in shadow.',
    frame(i) { const g = get('40:00:00', 900, i); return { dl: globeDisplay(GLOBES.fig7a!, g)!.dl, caption: getLabel(g) }; },
  },
  {
    id: 'sct', short: 'Telescope', label: 'Scanning telescope, rev 30', fps: 8, frames: 121,
    description: 'The scanning telescope held at Figure 3a\'s attitude from 124:00 to 126:00 GET, a minute a frame: the stars stay put while the Moon\'s horizon sweeps through as the command module orbits.',
    frame(i) { const g = get('124:00:00', 60, i); return { dl: buildScene(displaySpec(FIGURES.fig3a!, { get: g }), { stars }), caption: getLabel(g) }; },
  },
  {
    id: 'lm', short: 'LM', label: 'LM, turning', fps: 12, frames: 120,
    description: 'The hidden-line lunar module turning a full circle, 3° a frame, as in the MSC film.',
    frame(i) {
      const v = VEHICLES.lm, az = 3 * i;
      const primitives = vehiclePrimitives(v.parts, orbitCamera({ azDeg: az, elDeg: 15, distance: v.distance, target: v.target, extentDeg: v.extentDeg }));
      return { dl: { extentDeg: v.extentDeg, utc: new Date(0), primitives, placed: [], notes: [] }, caption: `FRAME ${pad3(i)}  azimuth ${az}°` };
    },
  },
];
