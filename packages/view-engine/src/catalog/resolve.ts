import { toVec3, unit, type Vec3 } from '../math/vec';
import { precessionMatrix } from './precession';
import { starDirection, type CatalogStar } from './stars';

export interface BscFile { stars: CatalogStar[] }
export interface NavStarRecord { navStar: number; name: string; hr: number; vector: number[] }
export interface Agc37File { epoch: string; epochJd: number; stars: NavStarRecord[] }
export interface RtccRecord { seq: number; hr: number; mag: number | null }
export interface RtccFile { stars: RtccRecord[] }

export interface ResolvedStar {
  seq: number;
  hr: number;
  navStar: number | null;
  name: string | null;
  mag: number | null;
  /** Unit vector in the reference frame (mean equator/equinox of the requested epoch). */
  direction: Vec3;
}

/**
 * RTCC catalogue rows → directions. Nav stars (rows 1–37) use the AGC's own vectors
 * when the requested epoch is the AGC epoch; every other star is precessed from BSC.
 */
export function resolveCatalog(rtcc: RtccFile, bsc: BscFile, agc: Agc37File, epochJd: number): ResolvedStar[] {
  const byHr = new Map(bsc.stars.map((s) => [s.hr, s]));
  const navBySeq = new Map(agc.stars.map((s) => [s.navStar, s]));
  const useAgcVectors = Math.abs(epochJd - agc.epochJd) < 1;
  const p = precessionMatrix(epochJd);
  return rtcc.stars.map((row) => {
    const nav = row.seq <= 37 ? navBySeq.get(row.seq) : undefined;
    const star = byHr.get(row.hr);
    if (!star) throw new Error(`RTCC star ${row.seq}: HR ${row.hr} is not in the BSC subset`);
    const direction = nav && useAgcVectors ? unit(toVec3(nav.vector)) : starDirection(star, epochJd, p);
    return { seq: row.seq, hr: row.hr, navStar: nav?.navStar ?? null, name: nav?.name ?? null, mag: row.mag, direction };
  });
}
