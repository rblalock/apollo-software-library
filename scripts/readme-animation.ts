/**
 * The README animation: the film's Earth reel (the Earth from the command module every 3 minutes, 22:00–27:00 GET).
 * The engine draws each frame, rsvg-convert rasterizes it, and ffmpeg joins the frames into a looping GIF.
 * Needs rsvg-convert (librsvg) and ffmpeg. Writes docs/images/earth-reel.gif.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderSvg } from '../packages/view-engine/src/index';
import { REELS } from '../site/src/lib/reels';

const WIDTH = 520;
const OUT = 'docs/images/earth-reel.gif';

const run = (cmd: string[]) => {
  const p = Bun.spawnSync(cmd, { stderr: 'pipe' });
  if (p.exitCode !== 0) throw new Error(`${cmd[0]} failed: ${p.stderr.toString()}`);
};

const reel = REELS.find((r) => r.id === 'earth')!;
const dir = mkdtempSync(join(tmpdir(), 'earth-reel-'));
try {
  for (let i = 0; i < reel.frames; i++) {
    const svg = join(dir, `${String(i).padStart(3, '0')}.svg`);
    writeFileSync(svg, renderSvg(reel.frame(i).dl, { style: 'microfilm' }));
    run(['rsvg-convert', '-w', String(WIDTH), '-o', svg.replace(/svg$/, 'png'), svg]);
  }
  // One shared palette for all frames, no dithering: the frames are line drawings, so this keeps lines clean.
  run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', String(reel.fps), '-i', join(dir, '%03d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=32[p];[b][p]paletteuse=dither=none', '-loop', '0', OUT]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`${OUT}: ${reel.frames} frames at ${reel.fps} fps`);
