import { describe, expect, it } from 'vitest';
import { APOLLO_NAV_STARS, parseAgcStarTable } from '../lib/agc';

const SNIPPET = `
\t\t2DEC\t+.8342971408 B-1\t# STAR 37\tX
\t\t2DEC\t-.2392481515 B-1\t# STAR 37\tY
\t\t2DEC\t-.4966976975 B-1\t# STAR 37\tZ
`;

describe('parseAgcStarTable', () => {
  it('reads unit vectors keyed by star number', () => {
    const t = parseAgcStarTable(SNIPPET);
    expect(t.get(37)).toEqual([0.8342971408, -0.2392481515, -0.4966976975]);
  });
});

describe('APOLLO_NAV_STARS', () => {
  it('lists 37 stars in AGC order, including the Apollo 1 names', () => {
    expect(APOLLO_NAV_STARS).toHaveLength(37);
    expect(APOLLO_NAV_STARS.find((s) => s.navStar === 3)!.name).toBe('Navi');
    expect(APOLLO_NAV_STARS.find((s) => s.navStar === 15)!.name).toBe('Regor');
    expect(APOLLO_NAV_STARS.find((s) => s.navStar === 16)!.name).toBe('Dnoces');
    expect(APOLLO_NAV_STARS.slice(33).map((s) => s.name)).toEqual(['Peacock', 'Deneb', 'Enif', 'Fomalhaut']);
  });
});
