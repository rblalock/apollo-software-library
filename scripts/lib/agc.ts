import type { Vec3 } from '../../packages/view-engine/src/index';

/** Apollo navigation stars in AGC order, with Yale BSC HR numbers (verified against STAR_TABLES.agc). */
export const APOLLO_NAV_STARS: ReadonlyArray<{ navStar: number; name: string; hr: number }> = [
  { navStar: 1, name: 'Alpheratz', hr: 15 }, { navStar: 2, name: 'Diphda', hr: 188 },
  { navStar: 3, name: 'Navi', hr: 264 }, { navStar: 4, name: 'Achernar', hr: 472 },
  { navStar: 5, name: 'Polaris', hr: 424 }, { navStar: 6, name: 'Acamar', hr: 897 },
  { navStar: 7, name: 'Menkar', hr: 911 }, { navStar: 8, name: 'Mirfak', hr: 1017 },
  { navStar: 9, name: 'Aldebaran', hr: 1457 }, { navStar: 10, name: 'Rigel', hr: 1713 },
  { navStar: 11, name: 'Capella', hr: 1708 }, { navStar: 12, name: 'Canopus', hr: 2326 },
  { navStar: 13, name: 'Sirius', hr: 2491 }, { navStar: 14, name: 'Procyon', hr: 2943 },
  { navStar: 15, name: 'Regor', hr: 3207 }, { navStar: 16, name: 'Dnoces', hr: 3569 },
  { navStar: 17, name: 'Alphard', hr: 3748 }, { navStar: 18, name: 'Regulus', hr: 3982 },
  { navStar: 19, name: 'Denebola', hr: 4534 }, { navStar: 20, name: 'Gienah', hr: 4662 },
  { navStar: 21, name: 'Acrux', hr: 4730 }, { navStar: 22, name: 'Spica', hr: 5056 },
  { navStar: 23, name: 'Alkaid', hr: 5191 }, { navStar: 24, name: 'Menkent', hr: 5288 },
  { navStar: 25, name: 'Arcturus', hr: 5340 }, { navStar: 26, name: 'Alphecca', hr: 5793 },
  { navStar: 27, name: 'Antares', hr: 6134 }, { navStar: 28, name: 'Atria', hr: 6217 },
  { navStar: 29, name: 'Rasalhague', hr: 6556 }, { navStar: 30, name: 'Vega', hr: 7001 },
  { navStar: 31, name: 'Nunki', hr: 7121 }, { navStar: 32, name: 'Altair', hr: 7557 },
  { navStar: 33, name: 'Dabih', hr: 7776 }, { navStar: 34, name: 'Peacock', hr: 7790 },
  { navStar: 35, name: 'Deneb', hr: 7924 }, { navStar: 36, name: 'Enif', hr: 8308 },
  { navStar: 37, name: 'Fomalhaut', hr: 8728 },
];

const LINE = /2DEC\s+([+-]?\.\d+)\s+B-1\s+#\s+STAR\s+(\d+)\s+([XYZ])/;

/** Parse Comanche055 STAR_TABLES.agc: `2DEC ±.nnnn B-1 # STAR n X|Y|Z` (values are unit-vector components). */
export function parseAgcStarTable(text: string): Map<number, Vec3> {
  const parts = new Map<number, Partial<Record<'X' | 'Y' | 'Z', number>>>();
  for (const line of text.split('\n')) {
    const m = LINE.exec(line);
    if (!m) continue;
    const star = Number(m[2]);
    parts.set(star, { ...parts.get(star), [m[3] as 'X' | 'Y' | 'Z']: Number(m[1]) });
  }
  const out = new Map<number, Vec3>();
  for (const [star, p] of parts) {
    if (p.X === undefined || p.Y === undefined || p.Z === undefined) throw new Error(`STAR ${star}: incomplete vector`);
    out.set(star, [p.X, p.Y, p.Z]);
  }
  return out;
}
