import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface ProvenanceSource { url: string; retrieved: string; sha256: string }
export interface Provenance { sources: ProvenanceSource[]; method: string; script: string; generated: string }

export const sha256 = (buf: Uint8Array): string => createHash('sha256').update(buf).digest('hex');
export const today = (): string => new Date().toISOString().slice(0, 10);

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

export async function download(url: string): Promise<{ bytes: Uint8Array; source: ProvenanceSource }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, source: { url, retrieved: today(), sha256: sha256(bytes) } };
}
