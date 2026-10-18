// Astro integration: 301 every retired puppy page to /puppies (maltipoo.sg: build.format "file").
// Ported from Curious Tails scripts/lib/puppy-redirects.mjs (single-breed site).
//
// A puppy page (/puppies/<slug>/) is built while the pup is available and, once
// it has found its home, for the placed archive's 90-day window
// (src/data/placed-archive.json). Every other archived pup - withdrawn, expired,
// or placed without a photo - no longer has a page. After the build this appends
// one 301 per such URL to dist/_redirects (Cloudflare Pages).
//
// It writes to dist/ only: public/_redirects stays owned by gen-redirects.mjs.
// A URL that was built is never redirected, whatever the archive says.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pupPagePath } from '../../src/lib/pup-slug.mjs';

const ARCHIVE = fileURLToPath(new URL('../../src/data/placed-archive.json', import.meta.url));
export const RETIRED_MARK = '# Retired puppy pages: generated at build by scripts/lib/puppy-redirects.mjs';

const archivePups = () => (existsSync(ARCHIVE) ? JSON.parse(readFileSync(ARCHIVE, 'utf8')).pups ?? [] : []);

/** URL paths of archived pups whose page is up but noindexed (kept out of the sitemap). */
export const soldPagePaths = () => new Set(archivePups().filter((p) => p.status === 'placed').map(pupPagePath));

/** The 301 rules for every archived puppy whose page is not in `distDir`. */
export function retiredPuppyRules(distDir) {
  const built = (urlPath) => existsSync(path.join(distDir, `${urlPath}.html`));
  return archivePups()
    .map(pupPagePath)
    .filter((from) => !built(from))
    .map((from) => `${from} /puppies 301`);
}

export function puppyRedirects() {
  return {
    name: 'maltipoo-sg:puppy-redirects',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const rules = retiredPuppyRules(distDir);
        const file = path.join(distDir, '_redirects');
        const base = existsSync(file) ? readFileSync(file, 'utf8') : '';
        // Idempotent: drop a previous run's block before appending this one.
        const kept = base.includes(RETIRED_MARK) ? base.slice(0, base.indexOf(RETIRED_MARK)) : base;
        if (!rules.length && !kept.trim()) {
          logger.info('0 retired puppy pages');
          return;
        }
        writeFileSync(file, `${kept.trimEnd()}${kept.trim() ? '\n\n' : ''}${RETIRED_MARK}\n${rules.join('\n')}${rules.length ? '\n' : ''}`);
        logger.info(`${rules.length} retired puppy page(s) now 301 to /puppies`);
      },
    },
  };
}
