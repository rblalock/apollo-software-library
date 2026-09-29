import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // The production origin, for absolute URLs in link previews.
  site: 'https://apollo-software-library.vercel.app',
  integrations: [react()],
  // The exhibit imports data/derived/*.json from the repo root.
  vite: { plugins: [tailwindcss()], server: { fs: { allow: ['..'] } } },
});
