import { readdirSync, readFileSync } from 'node:fs';

/** `actually` names the true body when the published label is wrong (with the evidence in `note`). */
type BodyMeta = { kind: string; actually?: string; note?: string };
export type BodyEntry = (BodyMeta & { approxPx: [number, number] }) | (BodyMeta & { manualPx: [number, number] });

export interface FigureConfig {
  id: string;
  /** Scan file name under data/derived/scans/. */
  scan: string;
  source: { file: string; page: number; dpi: number; crop: { x: number; y: number; w: number; h: number } };
  extentDeg: number;
  bodies: Record<string, BodyEntry>;
}

const DIR = 'data/manual/figures';

export function loadFigureConfigs(ids?: string[], dir = DIR): FigureConfig[] {
  const all = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as FigureConfig);
  if (!ids?.length) return all;
  const missing = ids.filter((id) => !all.some((c) => c.id === id));
  if (missing.length) throw new Error(`unknown figure ids: ${missing.join(', ')}`);
  return all.filter((c) => ids.includes(c.id));
}
