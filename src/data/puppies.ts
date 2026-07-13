// Single source for the available-puppies gallery, shown on / and /puppies.
// [NEEDS PROOF] Representative entries; owner refreshes weekly with real availability.
// Palette per owner (2026-07-13): APRICOT-dominant — that is what we actually place.
// No names on cards by design. Images: generated at Phase E via imggen-runner
// (consistency string maltipoo-sg-*); until then cards render the paw fallback.

// Card images generated 2026-07-14 (consistency string maltipoo-sg-f3f2e8-5c7838-softdaylight-v1).
import pup2 from '../assets/site/2-maltipoo-card-cream-apricot-f.webp';
import pup3 from '../assets/site/3-maltipoo-card-cream-apricot-m.webp';
import pup4 from '../assets/site/4-maltipoo-card-apricot-teddy.webp';
import pup5 from '../assets/site/5-maltipoo-card-apricot-wavy.webp';
import pup6 from '../assets/site/6-maltipoo-card-apricot-fluffy.webp';
import pup7 from '../assets/site/7-maltipoo-card-apricot-curls.webp';
import pup8 from '../assets/site/8-maltipoo-card-deep-apricot-m.webp';
import pup9 from '../assets/site/9-maltipoo-card-deep-apricot-f.webp';
import pup10 from '../assets/site/10-maltipoo-card-apricot-white.webp';

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
  { color: 'Cream Apricot', gender: 'Female', ageLabel: '9 weeks', coat: 'Fluffy coat', hdb: true, imageSrc: pup2.src, imageAlt: 'Cream apricot Maltipoo puppy for sale in Singapore' },
  { color: 'Cream Apricot', gender: 'Male', ageLabel: '10 weeks', coat: 'Soft waves', hdb: true, imageSrc: pup3.src, imageAlt: 'Cream apricot Maltipoo puppy with soft waves for sale in Singapore' },
  { color: 'Apricot', gender: 'Male', ageLabel: '9 weeks', coat: 'Teddy curls', hdb: true, imageSrc: pup4.src, imageAlt: 'Apricot Maltipoo puppy with teddy curls for sale in Singapore' },
  { color: 'Apricot', gender: 'Female', ageLabel: '10 weeks', coat: 'Wavy coat', hdb: true, imageSrc: pup5.src, imageAlt: 'Apricot Maltipoo puppy with wavy coat for sale in Singapore' },
  { color: 'Apricot', gender: 'Female', ageLabel: '11 weeks', coat: 'Fluffy coat', hdb: true, imageSrc: pup6.src, imageAlt: 'Fluffy apricot Maltipoo puppy for sale in Singapore' },
  { color: 'Apricot', gender: 'Male', ageLabel: '12 weeks', coat: 'Tight curls', hdb: true, imageSrc: pup7.src, imageAlt: 'Apricot Maltipoo puppy with tight curls for sale in Singapore' },
  { color: 'Deep Apricot', gender: 'Male', ageLabel: '10 weeks', coat: 'Teddy curls', hdb: true, imageSrc: pup8.src, imageAlt: 'Deep apricot Maltipoo puppy for sale in Singapore' },
  { color: 'Deep Apricot', gender: 'Female', ageLabel: '9 weeks', coat: 'Soft curls', hdb: true, imageSrc: pup9.src, imageAlt: 'Deep apricot Maltipoo puppy with soft curls for sale in Singapore' },
  { color: 'Apricot & White', gender: 'Female', ageLabel: '11 weeks', coat: 'Wavy coat', hdb: true, imageSrc: pup10.src, imageAlt: 'Apricot and white Maltipoo puppy for sale in Singapore' },
];
