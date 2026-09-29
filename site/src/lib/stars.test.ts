import { describe, expect, it } from 'vitest';
import {
  APOLLO_11, resolveCatalog, resolveVerifiedCatalog, type Agc37File, type BscFile, type RtccFile, type VerifiedCatalogFile,
} from '@asl/view-engine';
import bsc from '../../../data/derived/bsc45.json';
import agc from '../../../data/derived/agc37.json';
import rtcc from '../../../data/derived/rtcc1970.json';
import cat1078 from '../../../data/derived/cat1078.json';
import siteStars from '../../../data/derived/site-stars.json';

// The site ships pre-resolved star directions (scripts/build-site-data.ts) instead of the catalogues themselves.
describe('data/derived/site-stars.json', () => {
  it('equals the live resolution of the RTCC catalogue and the verified 1,078-star rows', () => {
    const live = {
      rtcc: resolveCatalog(rtcc as RtccFile, bsc as BscFile, agc as Agc37File, APOLLO_11.referenceEpochJd),
      cat1078: resolveVerifiedCatalog(cat1078 as VerifiedCatalogFile, agc as Agc37File, APOLLO_11.referenceEpochJd),
    };
    for (const k of ['rtcc', 'cat1078'] as const) {
      expect(siteStars[k].length).toBe(live[k].length);
      siteStars[k].forEach((s, i) => {
        const l = live[k][i]!;
        expect({ ...s, direction: undefined }).toEqual({ ...l, direction: undefined });
        for (let j = 0; j < 3; j++) expect(Math.abs(s.direction[j]! - l.direction[j]!)).toBeLessThan(1e-9);
      });
    }
  });
});
