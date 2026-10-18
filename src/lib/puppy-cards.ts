// Shared helpers for the live Maltipoo listings (src/data/available-puppies.json,
// written by `npm run sync:puppies`). Used by BakeryPupCard, LivePuppies and the
// per-puppy page, so a card and its page always say the same thing.
import { whatsappLink } from '../data/site';
import { pupPageSlug as slugOf } from './pup-slug.mjs';
import liveData from '../data/available-puppies.json';
import archiveData from '../data/placed-archive.json';

export interface Pup {
  id: number | string;
  name: string | null;
  color: string | null;
  gender: 'Male' | 'Female' | null;
  age: string | null;
  price: number | null;
  image: string | null;
  images?: string[];
  location: string | null;
  origin: string | null;
  // 'Miniature' unless the feed's Size- column says Standard (rendered truthfully).
  size?: 'Miniature' | 'Standard' | null;
  // true only when the shop's sheet ticks HDBApproved. null = not stated: no claim.
  hdbApproved?: boolean | null;
  video?: string | null;
  // The shop's cal.com booking link for this exact pup (feed CalLink-).
  bookHref?: string | null;
}

export interface PlacedPup extends Pup {
  status: 'placed' | 'withdrawn' | 'expired' | null;
  placedAt: string;
}

// GA4: every card WhatsApp link carries data-wa-source="pup:<id>" and this
// variant, read by Analytics.astro (same attributes as Curious Tails).
export const WA_VARIANT = 'bakery-v14';

const photos = import.meta.glob<ImageMetadata>('../assets/live/*.webp', { eager: true, import: 'default' });
export const photoFor = (file: string | null | undefined) => (file ? photos[`../assets/live/${file}`] : undefined);

export const pupPageSlug = (p: Pup): string => slugOf(p);
export const pupPageHref = (p: Pup) => `/puppies/${pupPageSlug(p)}`;

export const half = (g: Pup['gender']) => (g === 'Female' ? 'Girl' : g === 'Male' ? 'Boy' : 'Puppy');

/** The pup's name, or the shop's puppy number when the sheet has no name yet. */
export const displayName = (p: Pup) => p.name ?? `Pup #${p.id}`;

// Single-breed site: the feed's Size- column (a Dachshund field) is ignored here.
export const breedShort = (_p: Pup) => 'Maltipoo';
export const breedLong = (_p: Pup) => 'Maltipoo';

export const priceLabel = (p: Pup) => (typeof p.price === 'number' ? `$${p.price.toLocaleString('en-SG')}` : null);

/** "2 months" -> "2 mo", "9 weeks" -> "9 wk" for the card's facts row. */
export const ageShort = (age: string | null) =>
  age ? age.replace(/\s*months?\b/i, ' mo').replace(/\s*weeks?\b/i, ' wk') : null;

/** Full aria context: "Biscuit, Apricot Maltipoo girl, $4,088 all-in". */
export const pupContext = (p: Pup, { price = true } = {}) =>
  [
    displayName(p),
    `${[p.color, breedShort(p), half(p.gender).toLowerCase()].filter(Boolean).join(' ')}`,
    price && priceLabel(p) ? `${priceLabel(p)} all-in` : null,
  ]
    .filter(Boolean)
    .join(', ');

const subject = (p: Pup) =>
  p.name
    ? `${p.name} (ID ${p.id})`
    : `the ${[p.color?.toLowerCase(), half(p.gender).toLowerCase()].filter(Boolean).join(' ')} ${breedShort(p)} (ID ${p.id})`;

/** Pre-filled availability question for this exact pup. */
export const waLink = (p: Pup) => whatsappLink(`Hi, is ${subject(p)} still available?`);
export const waPhotosLink = (p: Pup) => whatsappLink(`Hi, could you send me more photos of ${subject(p)}?`);
export const waBookLink = (p: Pup) => whatsappLink(`Hi, I'd like to book a visit to meet ${subject(p)}.`);
export const waSimilarLink = (p: Pup) =>
  whatsappLink(
    `Hi, I saw ${subject(p)} has found a home. Do you have a similar ${[p.color?.toLowerCase(), breedShort(p)].filter(Boolean).join(' ')} available or coming soon?`,
  );

/** "Viewing at" label (plan D3): the feed's location, minus the "Area" suffix. */
export const viewingAt = (p: Pup) => (p.location ? p.location.replace(/\s+area$/i, '').trim() : null);

// ---- origin flags ----------------------------------------------------------
// Inline SVG flags (never flag emoji). Unknown origins show their own text with
// no flag; a blank origin hides the "Bred in" fact. Never show a wrong country.
const FLAG = {
  SG: '<svg class="flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false"><rect width="30" height="10" fill="#EF3340"/><rect y="10" width="30" height="10" fill="#fff"/><circle cx="7" cy="5" r="3.4" fill="#fff"/><circle cx="8.3" cy="5" r="3.2" fill="#EF3340"/><g fill="#fff"><circle cx="9.6" cy="3" r=".6"/><circle cx="11.6" cy="4.2" r=".6"/><circle cx="11" cy="6.6" r=".6"/><circle cx="8.3" cy="6.6" r=".6"/><circle cx="7.6" cy="4.2" r=".6"/></g></svg>',
  AU: '<svg class="flag" viewBox="0 0 20 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="20" height="10" fill="#012169"/><path d="M0 0l10 5M10 0L0 5" stroke="#fff" stroke-width="1.2"/><path d="M5 0v5M0 2.5h10" stroke="#fff" stroke-width="1.6"/><path d="M5 0v5M0 2.5h10" stroke="#C8102E" stroke-width=".9"/><g fill="#fff"><circle cx="5" cy="7.6" r="1"/><circle cx="15" cy="2" r=".5"/><circle cx="17" cy="4" r=".5"/><circle cx="15" cy="8" r=".5"/><circle cx="13" cy="4.6" r=".5"/></g></svg>',
  // No clipPath: an id inside a repeated inline SVG would duplicate per card.
  UK: '<svg class="flag" viewBox="0 0 60 30" aria-hidden="true" focusable="false"><rect width="60" height="30" fill="#012169"/><path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" stroke-width="2"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  IE: '<svg class="flag" viewBox="0 0 3 2" aria-hidden="true" focusable="false"><rect width="1" height="2" fill="#169B62"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#FF883E"/></svg>',
} as const;

export const ORIGINS: Record<string, { code: keyof typeof FLAG; name: string }> = {
  local: { code: 'SG', name: 'Singapore' },
  singapore: { code: 'SG', name: 'Singapore' },
  australia: { code: 'AU', name: 'Australia' },
  uk: { code: 'UK', name: 'United Kingdom' },
  'united kingdom': { code: 'UK', name: 'United Kingdom' },
  ireland: { code: 'IE', name: 'Ireland' },
};

/** { flag, code, name } for a known origin, { text } for an unknown one, null for blank. */
export function originOf(origin: string | null) {
  if (!origin?.trim()) return null;
  const known = ORIGINS[origin.trim().toLowerCase()];
  return known ? { flag: FLAG[known.code], code: known.code, name: known.name } : { flag: null, code: origin.trim(), name: origin.trim() };
}

// ---- coat colour swatch ----------------------------------------------------
// A visual aid next to the colour NAME (the name is the fact; the swatch never
// replaces it). Built from the words in the feed's colour, so new values still
// get a sensible dot; an unrecognised colour gets a neutral one.
const TONE: [RegExp, string][] = [
  [/black/, '#222222'],
  [/choc|brown|liver/, '#5a3825'],
  [/isabella|lilac/, '#b9a08f'],
  [/red/, '#a8522a'],
  [/gold|wheat|fawn|apricot/, '#d9a441'],
  [/cream/, '#f1d6b0'],
  [/tan/, '#c58a4a'],
  [/white|piebald/, '#ffffff'],
  [/grey|gray|silver|blue/, '#8a8f96'],
  [/dapple|merle/, '#b8a99a'],
  [/sable/, '#7a4e2d'],
];
export function swatch(color: string | null) {
  if (!color) return '#d8c5a0';
  const c = color.toLowerCase();
  const tones = c.includes('tri')
    ? ['#222222', '#c58a4a', '#ffffff']
    : TONE.filter(([rx]) => rx.test(c)).map(([, hex]) => hex);
  if (c.includes('piebald') && tones.length === 1) tones.unshift('#8a5a3a');
  if (/dapple|merle/.test(c) && tones.length === 1) tones.unshift('#7a5a45'); // dapple patches on a darker base
  const uniq = [...new Set(tones)];
  if (uniq.length === 0) return '#d8c5a0';
  if (uniq.length === 1) return uniq[0];
  const step = 100 / uniq.length;
  return `linear-gradient(90deg,${uniq.map((t, i) => `${t} ${i * step}% ${(i + 1) * step}%`).join(',')})`;
}

// ---- data access -------------------------------------------------------------
export const livePups = () => liveData.available as Pup[];
export const recentlyPlacedPups = () => liveData.recentlyPlaced as Pup[];
export const liveSyncedAt = () => liveData.syncedAt;

/** Archived pups that keep a page: sold evidence and inside the 90-day window. */
export const placedArchivePups = () =>
  ((archiveData as { pups?: PlacedPup[] }).pups ?? []).filter((p) => p.status === 'placed' && photoFor(p.image));

/** Up to `max` placed pups for the D2 fallback grid: dated archive first, then the undated top-up. */
export function placedShowcase(max = 4): { pup: Pup; hasPage: boolean }[] {
  const out: { pup: Pup; hasPage: boolean }[] = placedArchivePups().map((pup) => ({ pup, hasPage: true }));
  const seen = new Set(out.map((x) => String(x.pup.id)));
  for (const pup of recentlyPlacedPups()) {
    if (seen.has(String(pup.id)) || !photoFor(pup.image)) continue;
    out.push({ pup, hasPage: false });
  }
  return out.slice(0, max);
}
