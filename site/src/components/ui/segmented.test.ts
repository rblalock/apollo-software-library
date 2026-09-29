import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Segmented } from './Segmented';

describe('Segmented', () => {
  it('draws the keyboard focus ring in the accent colour, visible on the selected (dark) option too', () => {
    const html = renderToStaticMarkup(createElement(Segmented, { label: 'View', value: 'a', options: [['a', 'A'], ['b', 'B']] as const, onChange: () => {} }));
    const classes = [...html.matchAll(/<label class="([^"]+)"/g)].map((m) => m[1]!);
    expect(classes).toHaveLength(2);
    for (const c of classes) expect(c).toMatch(/has-\[:focus-visible\]:outline-accent/);
  });
});
