import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARD_EVENTS, cardEvent, type CardEl } from '../src/lib/ga4-card.ts';

const pepper = { id: '2694', name: 'Pepper', breed: 'Cavapoo' };

function el(attrs: Record<string, string>, extra: Partial<CardEl> = {}): CardEl {
  return {
    getAttribute: (n: string) => attrs[n] ?? null,
    closestPup: pepper,
    href: null,
    ...extra,
  };
}

test('a plain card button sends one event with label and puppy params', () => {
  const out = cardEvent(el({ 'data-ga4-event': 'time_select', 'data-ga4-label': '2pm' }));
  assert.deepEqual(out, [
    {
      name: 'time_select',
      params: { label: '2pm', puppy_id: '2694', puppy_name: 'Pepper', breed: 'Cavapoo' },
    },
  ]);
});

test('a wa.me button sends its own event and then whatsapp_click with button', () => {
  const out = cardEvent(
    el(
      { 'data-ga4-event': 'book_viewing_click', 'data-ga4-label': 'viewing' },
      { href: 'https://wa.me/6582206408?text=x' },
    ),
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].name, 'book_viewing_click');
  assert.deepEqual(out[1], {
    name: 'whatsapp_click',
    params: { button: 'book_viewing_click', puppy_id: '2694', puppy_name: 'Pepper', breed: 'Cavapoo' },
  });
});

test('book_viewing_click sends the slot as the viewing param, not label', () => {
  const out = cardEvent(el({ 'data-ga4-event': 'book_viewing_click', 'data-ga4-label': 'Sat 21 Nov 2pm' }));
  assert.deepEqual(out[0].params, { viewing: 'Sat 21 Nov 2pm', puppy_id: '2694', puppy_name: 'Pepper', breed: 'Cavapoo' });
});

test('whatsapp_click itself is not doubled', () => {
  const out = cardEvent(
    el(
      { 'data-ga4-event': 'whatsapp_click', 'data-ga4-label': 'chat_icon' },
      { href: 'https://wa.me/6582206408' },
    ),
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'whatsapp_click');
});

test('an event name outside CARD_EVENTS returns nothing', () => {
  assert.deepEqual(cardEvent(el({ 'data-ga4-event': 'not_a_card_event' })), []);
});

test('an element without data-ga4-event returns nothing', () => {
  assert.deepEqual(cardEvent(el({ 'data-ga4-label': 'x' })), []);
});

test('CARD_EVENTS lists the 21 fixed names, maps_click included', () => {
  assert.equal(CARD_EVENTS.length, 21);
  assert.equal(new Set(CARD_EVENTS).size, 21);
  assert.ok(CARD_EVENTS.includes('maps_click'));
});

test('a maps link sends one maps_click event with its label', () => {
  assert.deepEqual(cardEvent(el({ 'data-ga4-event': 'maps_click', 'data-ga4-label': 'booking' })), [
    { name: 'maps_click', params: { label: 'booking', puppy_id: '2694', puppy_name: 'Pepper', breed: 'Cavapoo' } },
  ]);
});

test('Analytics.astro declares every CARD_EVENTS name in its inline delegate', () => {
  const src = readFileSync(new URL('../src/components/Analytics.astro', import.meta.url), 'utf8');
  for (const name of CARD_EVENTS) {
    assert.ok(src.includes(`'${name}'`), `Analytics.astro is missing ${name}`);
  }
});
