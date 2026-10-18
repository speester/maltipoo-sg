// Inline SVG icons for the Bakery Box puppy card and the puppy page, taken from
// Curious Tails src/components/PupCard.astro (gift, vax, chip, vet, hdb). Inline
// SVG, never emoji: Windows renders some emoji (flags especially) as letters.
export const PERK_ICONS = {
  gift: '<rect x="3" y="11" width="18" height="10" rx="1.5" fill="#ff6b8a"/><rect x="2" y="8" width="20" height="4" rx="1" fill="#ff8fa6"/><rect x="10.5" y="8" width="3" height="13" fill="#ffd34d"/><path d="M12 8C10 3 5.5 4 6.5 6.5 7.2 8 12 8 12 8Zm0 0c2-5 6.5-4 5.5-1.5C16.8 8 12 8 12 8Z" fill="#ffd34d"/>',
  vax: '<rect x="7" y="7" width="6" height="12" rx="1.5" transform="rotate(45 10 13)" fill="#cfe9ff"/><rect x="8" y="11" width="4" height="7" transform="rotate(45 10 13)" fill="#4aa8ff"/><path d="M15 5l4 4" stroke="#7d8aa0" stroke-width="2.4" stroke-linecap="round"/><path d="M17 7l-2.5 2.5" stroke="#7d8aa0" stroke-width="2"/><path d="M5.5 18.5 3 21" stroke="#9aa3b2" stroke-width="1.6" stroke-linecap="round"/>',
  chip: '<g stroke="#c9a227" stroke-width="2" stroke-linecap="round"><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></g><rect x="5" y="5" width="14" height="14" rx="3" fill="#3d4b63"/><rect x="9" y="9" width="6" height="6" rx="1" fill="#6ee7b7"/>',
  vet: '<path d="M6 3v6a4 4 0 0 0 8 0V3" fill="none" stroke="#7d8aa0" stroke-width="2.2" stroke-linecap="round"/><path d="M10 13v3a5 5 0 0 0 10 0v-2" fill="none" stroke="#7d8aa0" stroke-width="2.2"/><circle cx="20" cy="12" r="2.6" fill="#ff6b6b"/><circle cx="6" cy="3" r="1.4" fill="#4a5568"/><circle cx="14" cy="3" r="1.4" fill="#4a5568"/>',
  hdb: '<rect x="4" y="3" width="11" height="18" rx="1.5" fill="#ff9e6d"/><rect x="15" y="9" width="5" height="12" rx="1" fill="#e07a4e"/><g fill="#fff6d8"><rect x="6.5" y="6" width="2" height="2"/><rect x="10.5" y="6" width="2" height="2"/><rect x="6.5" y="10" width="2" height="2"/><rect x="10.5" y="10" width="2" height="2"/><rect x="6.5" y="14" width="2" height="2"/><rect x="10.5" y="14" width="2" height="2"/></g><rect x="8.5" y="18" width="2.5" height="3" fill="#7a4a2e"/>',
} as const;

export type PerkIcon = keyof typeof PERK_ICONS;

/** A complete, decorative <svg> for one icon. */
export const perkIcon = (k: PerkIcon, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PERK_ICONS[k]}</svg>`;

/** The card's sticker row, in the finalized Bakery Box v14 order. */
export const PERKS: [PerkIcon, string][] = [
  ['gift', 'Free 30-item kit'],
  ['vax', 'Vaccinated'],
  ['chip', 'Microchipped'],
  ['vet', 'Vet-checked'],
];
