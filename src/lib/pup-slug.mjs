// The ONE definition of a puppy page's URL slug (/puppies/<id>-<colour>-<girl|boy>; maltipoo.sg uses build.format "file", no trailing slash).
// Plain JS so astro.config.mjs (sitemap filter) and the build-time redirect
// integration (scripts/lib/puppy-redirects.mjs) import the same function as the
// page code (src/lib/puppy-cards.ts): the card link, the generated route and a
// retired page's 301 source can never drift apart. Same shape as Curious Tails.
const half = (g) => (g === 'Female' ? 'Girl' : g === 'Male' ? 'Boy' : 'Puppy');

/** @param {{ id: number | string, color?: string | null, gender?: string | null }} p */
export const pupPageSlug = (p) =>
  `${p.id}-${p.color ?? ''}-${half(p.gender)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** @param {{ id: number | string, color?: string | null, gender?: string | null }} p */
export const pupPagePath = (p) => `/puppies/${pupPageSlug(p)}`;
