// Names and adult-size fallbacks for the listing cards.
// A pup's own feed value wins. Otherwise its breed's typical adult weight (keyed by breed name,
// so a named mix listed here gets its own figure). Researched 2026-11-22 from breed guides.
export const breedPlural = 'Maltipoos';
export const breedSingular = 'Maltipoo';

export const adultSizeByBreed: Record<string, string> = {
  'Bichon Frise': '5 to 8 kg',
  Corgi: '10 to 13 kg',
  'Miniature Dachshund': '4 to 5 kg',
  Maltese: '2 to 3 kg',
  Maltipoo: '3 to 7 kg',
  'Shih Tzu': '4.5 to 8 kg',
  Chihuahua: '1.5 to 3 kg',
  Pomeranian: '1.8 to 3 kg',
  'Toy Poodle': '2 to 4.5 kg',
  'Shiba Inu': '7 to 11 kg',
  Malshi: '3 to 6 kg',
  Corgipoo: '5 to 12 kg',
  Cavachon: '4.5 to 9 kg',
  Poochon: '3 to 8 kg',
  Pomshi: '3 to 7 kg',
  Cockapoo: '5 to 11 kg',
  Cavapoo: '3 to 10 kg'
};

/** This site's own breed: the fallback when a pup has no adult size and no breed of its own. */
export const adultSize: string | null = adultSizeByBreed[breedSingular] ?? null;

/** The adult-size line for a pup: its feed value, else its breed's typical adult weight, else none. */
export function adultFor(pup: { adultSize?: string | null; breed?: string | null }): string | null {
  return pup.adultSize ?? adultSizeByBreed[pup.breed ?? breedSingular] ?? null;
}
