// Single source of business values — mirrors config/project-config.md.
// Never hardcode these in pages/components.

export const site = {
  domain: 'https://maltipoo.sg',
  brand: 'Maltipoo.sg',
  positioning: "Maltipoo.sg: Singapore's Maltipoo specialists, by Curious Tails",
  parent: {
    name: 'Curious Tails',
    url: 'https://curioustails.sg',
  },
  footerDisclosure: 'A Curious Tails brand · AVS licence AS24J00046',

  phoneDisplay: '+65 8220 6408',
  whatsappNumber: '6582206408',
  email: 'hello@curioustails.sg',
  address: {
    street: '2 Balestier Road #01-701',
    postal: 'Singapore 320002',
    full: '2 Balestier Road #01-701, Singapore 320002',
  },
  hours: 'Weekdays 12pm–6pm · Weekends 10am–6pm',
  hoursSpec: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '12:00', closes: '18:00' },
    { days: ['Saturday', 'Sunday'], opens: '10:00', closes: '18:00' },
  ],

  license: {
    avsNumber: 'AS24J00046', // the AVS pet shop licence — the ONLY number shown as "the licence"
    acraNumber: '202420075D', // company registration — never present as the licence
    registryUrl: 'https://avs.nparks.gov.sg/outreach/resources/public-registry-of-avs-licensed-pet-shops/',
  },

  pricing: {
    from: '$3,288',
    fromLine: 'From $3,288, all-in',
    range: '$3,288–$5,988',
  },

  reviews: {
    count: 41, // re-verify at launch
    rating: '5.0',
  },
  maltipoosPlaced: '100+',

  social: {
    instagram: 'https://www.instagram.com/curioustails.pups/',
    facebook: 'https://www.facebook.com/profile.php?id=61573140013505',
    gbp: 'https://www.google.com/search?kgmid=%2Fg%2F11w_rhg9mv&hl=en-SG&q=Curious%20Tails',
  },

  owners: 'Nelson and Kim',

  // GA4: NEW property at Phase F — never reuse the Curious Tails ID. Empty = snippet not rendered.
  ga4MeasurementId: '',
} as const;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
