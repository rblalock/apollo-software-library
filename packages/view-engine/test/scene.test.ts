import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, buildScene, FIG_3A_SPEC, resolveCatalog,
  type Agc37File, type BscFile, type DisplayList, type RtccFile,
} from '../src/index';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';

const stars = resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd);

function allFinite(dl: DisplayList): boolean {
  return dl.primitives.every((p) => {
    const nums = p.kind === 'polyline' ? p.points.flat()
      : p.kind === 'text' ? [p.x, p.y, p.sizeDeg]
      : p.kind === 'disc' ? [p.x, p.y, p.r]
      : [p.x, p.y];
    return nums.every(Number.isFinite);
  });
}

describe('buildScene: Fig 3a', () => {
  const dl = buildScene(FIG_3A_SPEC, { stars });
  it('places every body the 1972 figure labels', () => {
    const labels = new Set(dl.placed.map((b) => b.label));
    for (const name of ['Sirius', 'Rigel', 'Capella', 'Aldebaran', 'Mirfak', 'Menkar', 'Navi', 'Alpheratz', 'Diphda', 'Earth', 'Venus', 'Saturn']) {
      expect(labels, name).toContain(name);
    }
  });
  it('keeps everything inside the ±50° frame with finite coordinates', () => {
    for (const b of dl.placed) {
      expect(Math.abs(b.x)).toBeLessThanOrEqual(50);
      expect(Math.abs(b.y)).toBeLessThanOrEqual(50);
    }
    expect(allFinite(dl)).toBe(true);
  });
  it('draws nav-star names as program output (named on the microfilm) and planet names as annotation', () => {
    const texts = dl.primitives.filter((p) => p.kind === 'text');
    expect(texts.find((t) => t.text === 'Sirius')?.layer).toBe('machine');
    expect(texts.find((t) => t.text === 'Venus')?.layer).toBe('annotation');
  });
  it('labels the reticle scale −0 … −50 as printed on the 1969–72 figures', () => {
    const labels = new Set(dl.primitives.flatMap((p) => (p.kind === 'text' && p.layer === 'machine' ? [p.text] : [])));
    for (const t of ['-0', '-5', '-20', '-30', '-50']) expect(labels, t).toContain(t);
  });
  it('converts 124:40:00 GET to 1969-07-21T18:12Z', () => {
    expect(dl.utc.toISOString()).toBe('1969-07-21T18:12:00.000Z');
  });
});

describe('buildScene: "try it" inputs', () => {
  it('renders finite geometry at and near gimbal lock', () => {
    for (const middle of [90, -90, 89.999]) {
      expect(allFinite(buildScene({ ...FIG_3A_SPEC, gimbals: { inner: 10, middle, outer: -170 } }, { stars }))).toBe(true);
    }
  });
  it('renders for a very large GET', () => {
    expect(allFinite(buildScene({ ...FIG_3A_SPEC, get: '9999:00:00' }, { stars }))).toBe(true);
  });
});
