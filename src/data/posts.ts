// Link metadata for every blog post, used by RelatedPosts.astro to cross-link
// siblings. Blog posts previously had only their /blog index entry pointing at
// them (1 internal inbound link), which left several stuck at "Discovered -
// currently not indexed" in Search Console (2026-07-28).
//
// Every entry here must correspond to a built post under src/pages/blog/, and
// every post listed in src/pages/blog/index.astro must appear here.

export interface PostLink {
  href: string;
  tag: string;
  label: string;
}

export const posts: PostLink[] = [
  { href: '/blog/maltipoo-first-week-home', tag: 'New owners', label: 'Bringing your Maltipoo home at 9 weeks' },
  { href: '/blog/maltipoo-potty-training', tag: 'Training', label: 'Potty training a Maltipoo in Singapore' },
  { href: '/blog/maltipoo-sleep', tag: 'Routine', label: 'Where should your Maltipoo sleep?' },
  { href: '/blog/maltipoo-puppy-biting', tag: 'Training', label: 'Stopping puppy biting and nipping' },
  { href: '/blog/maltipoo-separation-anxiety', tag: 'Behaviour', label: 'Separation anxiety, prevented early' },
  { href: '/blog/maltipoo-barking', tag: 'Behaviour', label: 'Do Maltipoos bark a lot?' },
  { href: '/blog/maltipoo-adolescence', tag: 'Behaviour', label: 'Surviving Maltipoo adolescence' },
  { href: '/blog/maltipoo-licking', tag: 'Behaviour', label: 'Why does my Maltipoo lick so much?' },
  { href: '/blog/maltipoo-tear-stains', tag: 'Face care', label: 'Tear stains: what works in Singapore' },
  { href: '/blog/maltipoo-coat-matting', tag: 'Grooming', label: 'Preventing matting in Maltipoo coats' },
  { href: '/blog/maltipoo-first-groom', tag: 'Grooming', label: 'The first grooming, done right' },
  { href: '/blog/maltipoo-hypoallergenic-shedding', tag: 'Coat & allergies', label: 'Are Maltipoos hypoallergenic?' },
  { href: '/blog/maltipoo-food', tag: 'Feeding', label: 'What to feed a Maltipoo puppy' },
  { href: '/blog/maltipoo-hot-weather', tag: 'Singapore living', label: 'Comfortable in Singapore heat' },
  { href: '/blog/maltipoo-hdb-living', tag: 'Singapore living', label: 'Living with a Maltipoo in an HDB flat' },
  { href: '/blog/maltipoo-transport-singapore', tag: 'Singapore living', label: 'Getting around Singapore together' },
  { href: '/blog/maltipoo-daycare-options', tag: 'Singapore living', label: 'Daycare, sitters and helpers' },
  { href: '/blog/maltipoo-with-kids', tag: 'Family', label: 'Are Maltipoos good with kids?' },
  { href: '/blog/maltipoo-second-dog', tag: 'Multi-pet', label: 'Adding a Maltipoo to a home with pets' },
  { href: '/blog/maltipoo-growth-stages', tag: 'Development', label: 'Growth from puppy to adult' },
  { href: '/blog/male-vs-female-maltipoo', tag: 'Choosing', label: 'Male or female Maltipoo?' },
  { href: '/blog/maltipoo-adoption-singapore', tag: 'Buying honestly', label: 'Adopting vs buying in Singapore' },
  { href: '/blog/maltipoo-cost-ownership', tag: 'Money', label: 'The real cost of ownership' },
  { href: '/blog/maltipoo-crate-training', tag: 'Training', label: 'Crate training without the crying' },
  { href: '/blog/maltipoo-in-chinese', tag: 'Local knowledge', label: 'What is a Maltipoo called in Chinese?' },
];

// Same-tag siblings first, then circular neighbours, so every post is linked
// from at least `count` others no matter how small its tag group is.
export function relatedPosts(href: string, count = 4): PostLink[] {
  const index = posts.findIndex((p) => p.href === href);
  if (index === -1) return posts.slice(0, count);

  const self = posts[index];
  const picked: PostLink[] = posts.filter((p) => p.href !== href && p.tag === self.tag);

  for (let step = 1; picked.length < count && step < posts.length; step++) {
    const candidate = posts[(index + step) % posts.length];
    if (candidate.href !== href && !picked.some((p) => p.href === candidate.href)) {
      picked.push(candidate);
    }
  }

  return picked.slice(0, count);
}
