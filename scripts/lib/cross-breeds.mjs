// Named crossbreeds the shop lists, and the parent breeds each one is made of.
//
// Owner decision 2026-10-20: a named mix is listed on the site of BOTH parents —
// "Malshi" (Maltese x Shih Tzu) appears on maltese.sg and shihtzu.sg. One shared
// list means the same rule holds on all eleven .sg sites: a site lists a mix when
// the site's own breed is one of that mix's parents. `scripts/puppy-feed.json`
// holds the per-site breed; this file is identical everywhere.
//
// A mix the feed writes as "A x B" (e.g. "Maltese x Pomeranian") matches without
// being listed here. A bare "X" label with an unknown other parent ("Poodle X")
// never matches.

export const CROSS_BREEDS = {
  malshi: { name: 'Malshi', parents: ['maltese', 'shih tzu'] },
  maltipoo: { name: 'Maltipoo', parents: ['maltese', 'poodle'] },
  corgipoo: { name: 'Corgipoo', parents: ['corgi', 'poodle'] },
  moodle: { name: 'Moodle', parents: ['maltese', 'poodle'] },
  morkie: { name: 'Morkie', parents: ['maltese', 'yorkshire terrier'] },
  maltichon: { name: 'Maltichon', parents: ['maltese', 'bichon frise'] },
  maltelier: { name: 'Maltelier', parents: ['maltese', 'cavalier king charles spaniel'] },
  maltalier: { name: 'Maltalier', parents: ['maltese', 'cavalier king charles spaniel'] },
  mauxie: { name: 'Mauxie', parents: ['maltese', 'dachshund'] },
  shichon: { name: 'Shichon', parents: ['shih tzu', 'bichon frise'] },
  shihpoo: { name: 'Shihpoo', parents: ['shih tzu', 'poodle'] },
  bulltzu: { name: 'Bulltzu', parents: ['shih tzu', 'bulldog'] },
  poochon: { name: 'Poochon', parents: ['poodle', 'bichon frise'] },
  bichonpoo: { name: 'Bichonpoo', parents: ['bichon frise', 'poodle'] },
  cavachon: { name: 'Cavachon', parents: ['cavalier king charles spaniel', 'bichon frise'] },
  cavapoo: { name: 'Cavapoo', parents: ['cavalier king charles spaniel', 'poodle'] },
  cavoodle: { name: 'Cavoodle', parents: ['cavalier king charles spaniel', 'poodle'] },
  cockapoo: { name: 'Cockapoo', parents: ['cocker spaniel', 'poodle'] },
  cockerpoo: { name: 'Cockerpoo', parents: ['cocker spaniel', 'poodle'] },
  spoodle: { name: 'Spoodle', parents: ['cocker spaniel', 'poodle'] },
  schnoodle: { name: 'Schnoodle', parents: ['schnauzer', 'poodle'] },
  japoodle: { name: 'Japoodle', parents: ['japanese spitz', 'poodle'] },
  chowpoo: { name: 'Chowpoo', parents: ['chow chow', 'poodle'] },
  chowdoodle: { name: 'Chowdoodle', parents: ['chow chow', 'poodle'] },
  chowspitzpoo: { name: 'Chowspitzpoo', parents: ['chow chow', 'japanese spitz', 'poodle'] },
  'chowspitz doodle': { name: 'Chowspitz Doodle', parents: ['chow chow', 'japanese spitz', 'poodle'] },
  labradoodle: { name: 'Labradoodle', parents: ['labrador', 'poodle'] },
  goldendoodle: { name: 'Goldendoodle', parents: ['golden retriever', 'poodle'] },
  bernedoodle: { name: 'Bernedoodle', parents: ['bernese mountain dog', 'poodle'] },
  bordoodle: { name: 'Bordoodle', parents: ['border collie', 'poodle'] },
  borderdoodle: { name: 'Bordoodle', parents: ['border collie', 'poodle'] },
  aussiedoodle: { name: 'Aussiedoodle', parents: ['australian shepherd', 'poodle'] },
  sheepadoodle: { name: 'Sheepadoodle', parents: ['old english sheepdog', 'poodle'] },
  'husky doodle': { name: 'Husky Doodle', parents: ['husky', 'poodle'] },
  'double doodle': { name: 'Double Doodle', parents: ['poodle'] },
  'australian mountain doodle': { name: 'Australian Mountain Doodle', parents: ['australian shepherd', 'poodle'] },
  'golden doxie': { name: 'Golden Doxie', parents: ['golden retriever', 'dachshund'] },
  doxiepoo: { name: 'Doxiepoo', parents: ['dachshund', 'poodle'] },
  pomshi: { name: 'Pomshi', parents: ['pomeranian', 'shiba inu'] },
  pomachon: { name: 'Pomachon', parents: ['pomeranian', 'bichon frise'] },
  pomski: { name: 'Pomski', parents: ['pomeranian', 'husky'] },
  corgitz: { name: 'Corgitz', parents: ['corgi', 'japanese spitz'] },
};

// Short display names for parents whose full breed name is too long for a card
// line. Matching still uses the canonical key above.
const PARENT_LABEL = {
  'cavalier king charles spaniel': 'Cavalier',
  'bernese mountain dog': 'Bernese',
  'old english sheepdog': 'Sheepdog',
  'australian shepherd': 'Aussie Shepherd',
  'golden retriever': 'Golden Retriever',
  'yorkshire terrier': 'Yorkie',
};
const titleCase = (s) =>
  (PARENT_LABEL[s] ?? s).replace(/\b[a-z]/g, (c) => c.toUpperCase());

// "Toy Poodle" / "Miniature Dachshund" / "Mini Dachshund" all reduce to the parent
// word used in CROSS_BREEDS.
export const normBreed = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\b(toy|miniature|mini|standard|welsh|pembroke)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The breed names this site answers to, normalised (labels, name, aliases). */
export function siteBreeds(cfg) {
  const names = [cfg.breedName, cfg.breedShort, ...(cfg.labels ?? []), ...(cfg.overseasLabels ?? [])];
  return new Set(
    names.flatMap((l) => [normBreed(l), normBreed(l).replace(/s$/, '')]).filter(Boolean),
  );
}

/**
 * The crossbreed this feed label names, when this site is one of its parents.
 * @returns {{ name: string, note: string } | null}
 */
export function crossBreedOf(label, breeds) {
  const key = String(label ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!key) return null;
  const named = CROSS_BREEDS[key];
  if (named && named.parents.some((p) => breeds.has(normBreed(p)))) {
    return { name: named.name, note: named.parents.map(titleCase).join(' × ') };
  }
  // Explicit "A x B" labels: match either side against this site's breed.
  const sides = key.split(/\s+x\s+/).map(normBreed);
  if (sides.length === 2 && sides.some((s) => breeds.has(s))) {
    return { name: label, note: sides.map(titleCase).join(' × ') };
  }
  return null;
}
