// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://maltipoo.sg',
  output: 'static',
  server: { port: 4323 },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap()]
});

