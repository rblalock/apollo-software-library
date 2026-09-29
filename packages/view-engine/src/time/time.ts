export class InvalidGetError extends Error {
  constructor(get: string) {
    super(`Invalid GET "${get}" (expected hhh:mm:ss)`);
    this.name = 'InvalidGetError';
  }
}

const GET_RE = /^(\d{1,4}):([0-5]\d):([0-5]\d(?:\.\d+)?)$/;

/** Ground elapsed time "hhh:mm:ss[.s]" → seconds after range zero. */
export function parseGet(get: string): number {
  const m = GET_RE.exec(get.trim());
  if (!m) throw new InvalidGetError(get);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function formatGet(seconds: number): string {
  const s = Math.floor(seconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function getToUtc(rangeZeroUtc: string, get: string | number): Date {
  const seconds = typeof get === 'number' ? get : parseGet(get);
  return new Date(Date.parse(rangeZeroUtc) + seconds * 1000);
}

export const J2000_JD = 2451545.0;

/** Julian date on the UTC time scale (the TT−UTC difference is irrelevant at this precision). */
export const julianDate = (d: Date): number => d.getTime() / 86400000 + 2440587.5;

export const besselianEpochToJd = (b: number): number => 2415020.31352 + (b - 1900) * 365.242198781;
export const jdToBesselianEpoch = (jd: number): number => 1900 + (jd - 2415020.31352) / 365.242198781;
