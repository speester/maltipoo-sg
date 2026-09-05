// Cluster sibling links. Comparison pages previously linked only back to the
// /compare-maltipoo hub, which left each one on a single internal inbound link
// and stuck at "Discovered - currently not indexed" in Search Console
// (2026-07-28). Cross-linking siblings gives every page in the cluster real
// internal reach.

export interface ClusterLink {
  href: string;
  label: string;
  note: string;
}

export const comparisons: ClusterLink[] = [
  {
    href: '/maltese-vs-maltipoo',
    label: 'Maltipoo vs Maltese',
    note: 'Coat, shedding and the purebred question',
  },
  {
    href: '/maltipoo-vs-cavapoo',
    label: 'Maltipoo vs Cavapoo',
    note: 'Two poodle crosses, two different homes',
  },
  {
    href: '/maltipoo-vs-poodle',
    label: 'Maltipoo vs Toy Poodle',
    note: 'Same curl, softer temperament',
  },
  {
    href: '/maltipoo-vs-bichon-frise',
    label: 'Maltipoo vs Bichon Frise',
    note: 'Grooming load and energy compared',
  },
  {
    href: '/maltipoo-vs-shih-tzu',
    label: 'Maltipoo vs Shih Tzu',
    note: 'Flat faces, heat and Singapore humidity',
  },
  {
    href: '/maltipoo-vs-cockapoo',
    label: 'Maltipoo vs Cockapoo',
    note: 'Size, exercise and flat suitability',
  },
];
