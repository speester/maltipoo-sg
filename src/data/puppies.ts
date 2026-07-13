// Single source for the available-puppies gallery, shown on / and /puppies.
// [NEEDS PROOF] Representative entries; owner refreshes weekly with real availability.
// Palette per owner (2026-07-13): APRICOT-dominant — that is what we actually place.
// No names on cards by design. Images: generated at Phase E via imggen-runner
// (consistency string maltipoo-sg-*); until then cards render the paw fallback.

export interface AvailablePuppy {
  color: string;
  gender: 'Male' | 'Female';
  ageLabel: string;
  coat?: string;
  hdb: boolean;
  imageSrc?: string;
  imageAlt?: string;
}

// Ordered light → deep apricot.
export const availablePups: AvailablePuppy[] = [
  { color: 'Cream Apricot', gender: 'Female', ageLabel: '9 weeks', coat: 'Fluffy coat', hdb: true },
  { color: 'Cream Apricot', gender: 'Male', ageLabel: '10 weeks', coat: 'Soft waves', hdb: true },
  { color: 'Apricot', gender: 'Male', ageLabel: '9 weeks', coat: 'Teddy curls', hdb: true },
  { color: 'Apricot', gender: 'Female', ageLabel: '10 weeks', coat: 'Wavy coat', hdb: true },
  { color: 'Apricot', gender: 'Female', ageLabel: '11 weeks', coat: 'Fluffy coat', hdb: true },
  { color: 'Apricot', gender: 'Male', ageLabel: '12 weeks', coat: 'Tight curls', hdb: true },
  { color: 'Deep Apricot', gender: 'Male', ageLabel: '10 weeks', coat: 'Teddy curls', hdb: true },
  { color: 'Deep Apricot', gender: 'Female', ageLabel: '9 weeks', coat: 'Soft curls', hdb: true },
  { color: 'Apricot & White', gender: 'Female', ageLabel: '11 weeks', coat: 'Wavy coat', hdb: true },
];
