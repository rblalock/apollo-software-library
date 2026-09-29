import type { Mat3 } from '../math/mat';
import { J2000_JD } from '../time/time';

const ARCSEC = Math.PI / (180 * 3600);

/** IAU 1976 (Lieske) precession: J2000 mean equator/equinox → mean equator/equinox of `epochJd`. */
export function precessionMatrix(epochJd: number): Mat3 {
  const t = (epochJd - J2000_JD) / 36525;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * ARCSEC;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * ARCSEC;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * ARCSEC;
  const cz = Math.cos(zeta), sz = Math.sin(zeta);
  const cZ = Math.cos(z), sZ = Math.sin(z);
  const ct = Math.cos(theta), st = Math.sin(theta);
  return [
    [cz * ct * cZ - sz * sZ, -sz * ct * cZ - cz * sZ, -st * cZ],
    [cz * ct * sZ + sz * cZ, -sz * ct * sZ + cz * cZ, -st * sZ],
    [cz * st, -sz * st, ct],
  ];
}
