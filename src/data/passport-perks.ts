// The six perks on the passport card (perks strip and perks sheet). Values are the owner's Decision D5:
// kit $533 (30 items), vaccines $230, trainer lesson $160, home setup $70. Every breed site uses this list.
// Icons are names in PassportCard.astro's icon set.

export type Perk = {
  k: 'kit' | 'vac' | 'chip' | 'vet' | 'lesson' | 'home';
  c: string; // accent colour
  icon: 'gift' | 'syringe' | 'chip' | 'steth' | 'lesson' | 'truck';
  mq: string; // marquee chip text
  title: string;
  detail: string;
  v?: string; // value shown on the sheet, e.g. "$533"
  worth?: boolean; // show the "worth" label before the value
};

export const PERKS: readonly Perk[] = [
  { k: 'kit', c: '#e5383b', icon: 'gift', mq: '$533 starter kit', title: 'Free 30-item starter kit', detail: 'Playpen, bed, carrier, grooming set, outdoor essentials, food, toilet training, toys & more.', v: '$533', worth: true },
  { k: 'vac', c: '#2f7fd6', icon: 'syringe', mq: 'Free 3rd & 4th vaccine', title: 'Vaccinated', detail: 'Free 3rd and 4th vaccine, via Vets For Pets.', v: '$230', worth: true },
  { k: 'chip', c: '#8b5cf6', icon: 'chip', mq: 'Microchipped', title: 'Microchipped', detail: 'Licensing paperwork done with you at purchase.' },
  { k: 'vet', c: '#0f9d6e', icon: 'steth', mq: 'Vet-checked', title: 'Vet-checked', detail: 'Your puppy is generally healthy and vet-checked. If they fall sick within 5 days, we nurse them at no additional cost.' },
  { k: 'lesson', c: '#ef8a00', icon: 'lesson', mq: 'Free lesson by AVS trainer', title: 'Free first lesson', detail: 'One session with an AVS trainer.', v: '$160', worth: true },
  { k: 'home', c: '#0aa2c0', icon: 'truck', mq: 'Free home setup', title: 'Home delivery and setup', detail: 'Free delivery and playpen setup. We walk you through every item.', v: '$70', worth: true },
];
