import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { file, glob } from 'astro/loaders';

const link = z.object({ label: z.string(), url: z.string() });

const documents = defineCollection({
  loader: file('src/content/documents.json'),
  schema: z.object({
    title: z.string(),
    reportNumber: z.string(),
    date: z.string(),
    authors: z.array(z.string()),
    pdf: z.string(),
    sourceUrl: z.string(),
    pageCount: z.number(),
    anchors: z.record(z.string(), z.object({ page: z.number(), label: z.string() })),
  }),
});

const exhibits = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/exhibits' }),
  schema: z.object({
    title: z.string(),
    entry: z.string(),
    summary: z.string(),
    figureRefs: z.array(z.object({ document: reference('documents'), anchor: z.string() })),
    /** Figure ids from site/src/lib/figures.ts shown by the exhibit (several = a panel switch). */
    figures: z.array(z.string()).min(1),
  }),
});

const entries = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/entries' }),
  schema: z.object({
    title: z.string(),
    era: z.string(),
    provenanceTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    summary: z.string(),
    people: z.array(z.object({ name: z.string(), role: z.string() })),
    sources: z.array(link),
    film: link.optional(),
    documents: z.array(reference('documents')),
    exhibits: z.array(reference('exhibits')),
  }),
});

export const collections = { documents, exhibits, entries };
