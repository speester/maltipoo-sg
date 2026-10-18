// @ts-check
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { puppyRedirects, soldPagePaths } from './scripts/lib/puppy-redirects.mjs';

const pagesDir = new URL('./src/pages/', import.meta.url);

// Real last-modified date for a sitemap entry, from the mtime of the source
// file that produced it. The sitemap previously carried no lastmod at all,
// which matters because Search Console reports most URLs here as "Discovered -
// currently not indexed, crawled: never". The date must always come from a real
// content change: a lastmod that does not track one is a fabricated freshness
// signal, so an unresolvable source yields no lastmod rather than a guess.
function sitemapLastmod(item) {
  const path = new URL(item.url).pathname.replace(/^\/|\/$/g, '');
  const candidates = path === '' ? ['index.astro'] : [`${path}.astro`, `${path}/index.astro`];
  for (const rel of candidates) {
    try {
      item.lastmod = statSync(fileURLToPath(new URL(rel, pagesDir))).mtime.toISOString();
      return item;
    } catch {
      // not this shape; try the next candidate
    }
  }

  // Puppy pages (/puppies/<slug>) are data-driven: their content changes when the
  // feed sync rewrites src/data/available-puppies.json, not when the route file is
  // edited, so the route mtime would be a fabricated date. No lastmod.
  if (/^puppies\/[^/]+$/.test(path)) return item;

  // Dynamic route (e.g. areas/dog-grooming-[slug].astro): no file matches the
  // URL, but the route file is still the source that produced the page, so its
  // mtime is the honest date. Without this the whole generated tier ships with
  // no lastmod at all.
  const slash = path.lastIndexOf('/');
  const dir = slash === -1 ? '' : path.slice(0, slash);
  const base = slash === -1 ? path : path.slice(slash + 1);
  try {
    const dirUrl = new URL(dir ? `${dir}/` : './', pagesDir);
    for (const entry of readdirSync(fileURLToPath(dirUrl))) {
      if (!entry.endsWith('.astro') || !entry.includes('[')) continue;
      const pattern = new RegExp(
        `^${entry.slice(0, -'.astro'.length).replace(/[.*+?^${}()|\\]/g, '\\$&').replace(/\[[^\]]*\]/g, '.+')}$`,
      );
      if (pattern.test(base)) {
        item.lastmod = statSync(fileURLToPath(new URL(entry, dirUrl))).mtime.toISOString();
        return item;
      }
    }
  } catch {
    // no such directory; fall through with no lastmod
  }
  return item;
}

const soldPages = soldPagePaths();

// https://astro.build/config
export default defineConfig({
  site: 'https://maltipoo.sg',
  output: 'static',
  compressHTML: false,
  trailingSlash: 'never',
  build: { format: 'file' },
  server: { port: 4323 },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    sitemap({
      serialize: sitemapLastmod,
      // A placed pup's page stays up for 90 days with noindex: keep it out.
      filter: (page) => !soldPages.has(new URL(page).pathname.replace(/\/$/, '')),
    }),
    puppyRedirects(),
  ]
});

