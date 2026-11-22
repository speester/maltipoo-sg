// GA4 events for the passport card. Every button carries data-ga4-event and data-ga4-label.
// The inline delegate in src/components/Analytics.astro duplicates cardEvent (inline scripts cannot
// import TS). tests/ga4-card.test.ts checks that Analytics.astro declares every name in CARD_EVENTS.

export const CARD_EVENTS: readonly string[] = [
  'book_viewing_click',
  'whatsapp_click',
  'send_click',
  'call_click',
  'earliest_visit_click',
  'date_select',
  'time_select',
  'photo_dot_click',
  'photo_arrow_click',
  'photo_tap',
  'photo_swipe',
  'video_play_click',
  'perks_open',
  'kit_list_toggle',
  'perks_close',
  'whatsapp_web_click',
  'whatsapp_app_click',
  'call_copy_click',
  'call_dial_click',
  'popup_close',
  'maps_click',
];

export type Pup = { id: string; name: string; breed: string };

export type CardEl = {
  getAttribute(n: string): string | null;
  closestPup?: Pup | null;
  href?: string | null;
};

export type CardEvent = { name: string; params: Record<string, string> };

function puppyParams(pup: Pup | null | undefined): Record<string, string> {
  if (!pup) return {};
  return { puppy_id: pup.id, puppy_name: pup.name, breed: pup.breed };
}

// book_viewing_click carries its label as the viewing param ("Sat 21 Nov 2pm"). Other events use label.
// Returns 0, 1 or 2 events. A wa.me link also sends whatsapp_click with button = the event name,
// so the existing WhatsApp key event keeps counting. whatsapp_click itself is never doubled.
export function cardEvent(el: CardEl): CardEvent[] {
  const name = el.getAttribute('data-ga4-event');
  if (!name || !CARD_EVENTS.includes(name)) return [];

  const params: Record<string, string> = {};
  const label = el.getAttribute('data-ga4-label');
  if (label) params[name === 'book_viewing_click' ? 'viewing' : 'label'] = label;
  Object.assign(params, puppyParams(el.closestPup));

  const out: CardEvent[] = [{ name, params }];
  if (name !== 'whatsapp_click' && (el.href ?? '').includes('wa.me')) {
    out.push({ name: 'whatsapp_click', params: { button: name, ...puppyParams(el.closestPup) } });
  }
  return out;
}
