import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  // The exhibit imports data/derived/*.json from the repo root.
  vite: { plugins: [tailwindcss()], server: { fs: { allow: ['..'] } } },
});
