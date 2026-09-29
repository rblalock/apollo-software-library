import { readdirSync, readFileSync } from 'node:fs';

export type BodyEntry = { kind: string; approxPx: [number, number] } | { kind: string; manualPx: [number, number] };

export interface FigureConfig {
  id: string;
  /** Scan file name under data/derived/scans/. */
  scan: string;
  source: { file: string; page: number; dpi: number; crop: { x: number; y: number; w: number; h: number } };
  extentDeg: number;
  bodies: Record<string, BodyEntry>;
}

const DIR = 'data/manual/figures';

export function loadFigureConfigs(ids?: string[]): FigureConfig[] {
  const all = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as FigureConfig);
  if (!ids?.length) return all;
  const missing = ids.filter((id) => !all.some((c) => c.id === id));
  if (missing.length) throw new Error(`unknown figure ids: ${missing.join(', ')}`);
  return all.filter((c) => ids.includes(c.id));
}
