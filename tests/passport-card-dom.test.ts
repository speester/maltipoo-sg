import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { buildDays, hr } from '../src/lib/passport-booking.ts';
import {
  initPassportCards,
  setPassportClock,
  dayButtonsHtml,
  nextTextFor,
  CARD_CLOSED_DOWS,
} from '../src/scripts/passport-card.ts';

// happy-dom stands in for the browser. The script reads window and document as globals.
const win = new Window({ url: 'https://cavapoopuppy.sg/' });
Object.assign(globalThis, { window: win, document: win.document });
Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true, writable: true });

const NOW = new Date('2026-11-20T02:00:00Z'); // 10:00am SGT, Friday 20 Nov. 11am is still open.

function setDesktop(matches: boolean): void {
  (win as unknown as { matchMedia: unknown }).matchMedia = (q: string) => ({
    matches,
    media: q,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}

function click(el: Element, init: MouseEventInit = {}): MouseEvent {
  const ev = new win.MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  return ev;
}

function pressKey(key: string): void {
  document.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true }));
}

const slotButtons = () =>
  [11, 12, 13, 14, 15, 16, 17].map((h) => `<button class="slot" data-act="slot" data-h="${h}" aria-pressed="false">${hr(h)}</button>`).join('');

type CardOpts = { id: string; name: string; slides?: number; video?: boolean; photoBar?: boolean };

// Mirrors the markup PassportCard.astro renders. The DOM contract is the same, so Task 4 must keep these selectors.
function cardHtml(o: CardOpts): string {
  const slides = o.slides ?? 2;
  const days = dayButtonsHtml(buildDays(NOW, 8, [...CARD_CLOSED_DOWS]), NOW);
  const imgs = Array.from({ length: slides }, (_, i) => `<img src="/p${i}.webp" alt="photo ${i + 1}">`).join('');
  const video = o.video ? `<div class="vslide" data-yt="iK5HAQE5lEE"><img src="/poster.jpg" alt=""><button type="button" data-act="vplay" data-ga4-event="video_play_click">Play</button></div>` : '';
  const dots = slides > 1 || o.video ? `<div class="ind bars">${Array.from({ length: slides + (o.video ? 1 : 0) }, (_, i) => `<button type="button" data-act="car-go" data-ci="${i}"><b class="fill"></b></button>`).join('')}</div><button class="nav prev" type="button" data-act="car-prev">‹</button><button class="nav next" type="button" data-act="car-fwd">›</button>` : '';
  return `<article class="pc" data-passport data-pup="${o.id}" data-pup-name="${o.name}" data-pup-breed="Cavapoo" data-wa="6582206408" data-call="6597921567" data-call-show="9792 1567" data-phone="+65 8220 6408" data-hours="Tue to Sun, 11am to 6pm · closed Mon">
    <div class="car bars" data-car>
      <div class="car-track" data-act="car-next">${imgs}${video}</div>
      ${dots}
    </div>
    <div class="bk">
      <div class="dates scroll" data-style="scroll">${days}</div>
      <div class="slots">${slotButtons()}</div>
      <button class="nextopen" type="button" data-act="next-open" data-ga4-event="earliest_visit_click"><span class="go">Book It</span><span class="next-t">x</span></button>
      <a class="book" data-act="book" href="#" data-ga4-event="book_viewing_click"><span><svg viewBox="0 0 2 2"></svg></span><span class="bk-lbl">Book viewing</span></a>
      <a class="ic chat" href="https://wa.me/6582206408?text=Hi%20there" data-ga4-event="whatsapp_click" data-ga4-label="chat_icon"><svg viewBox="0 0 2 2"></svg></a>
      <a class="ic call" data-act="call" href="tel:+6597921567" data-ga4-event="call_click"><svg viewBox="0 0 2 2"></svg></a>
    </div>
    <button class="kit-tg" type="button" data-act="kit" aria-expanded="false" aria-controls="kit-${o.id}"><span>What's in the 30-item kit</span></button>
    <div class="kit-body" id="kit-${o.id}" hidden>kit list</div>
    <button class="peek" type="button" data-act="sheet" data-ga4-event="perks_open" data-ga4-label="strip">Perks</button>
    <div class="sheet"><button class="grab" type="button" data-act="sheet-close" data-ga4-event="perks_close" data-ga4-label="handle">Close</button></div>
  </article>`;
}

let gtagCalls: unknown[][] = [];

beforeEach(() => {
  document.body.innerHTML = '';
  setDesktop(false);
  setPassportClock(() => NOW);
  gtagCalls = [];
  (win as unknown as { gtag: unknown }).gtag = (...args: unknown[]) => {
    gtagCalls.push(args);
  };
});

test('two cards on one page: Earliest visit on card 2 changes only card 2', () => {
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper' }) + cardHtml({ id: '2701', name: 'Biscuit' });
  initPassportCards();
  const [c1, c2] = Array.from(document.querySelectorAll<HTMLElement>('.pc'));

  click(c1.querySelector('[data-act="slot"][data-h="16"]') as Element);
  click(c2.querySelector('[data-act="slot"][data-h="15"]') as Element);
  assert.equal(c2.querySelector('.slot[aria-pressed="true"]')?.getAttribute('data-h'), '15');

  click(c2.querySelector('.nextopen') as Element);

  assert.equal(c2.querySelector('.slot[aria-pressed="true"]')?.getAttribute('data-h'), '11');
  assert.equal(c1.querySelector('.slot[aria-pressed="true"]')?.getAttribute('data-h'), '16');
});

test('the play button opens the one shared pop-up with a nocookie embed, and Escape removes the iframe', () => {
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper', video: true }) + cardHtml({ id: '2701', name: 'Biscuit', video: true });
  initPassportCards();
  click(document.querySelector('[data-act="vplay"]') as Element);

  assert.equal(document.querySelectorAll('#pc-dlg').length, 1);
  const iframe = document.querySelector('#pc-dlg iframe');
  assert.ok(iframe);
  assert.ok(iframe.getAttribute('src')?.startsWith('https://www.youtube-nocookie.com/embed/iK5HAQE5lEE?autoplay=1'));

  pressKey('Escape');
  assert.equal(document.querySelector('#pc-dlg iframe'), null);
  assert.equal((document.getElementById('pc-dlg') as HTMLElement).hidden, true);
});

test('the kit toggle flips aria-expanded and hidden, and sends kit_list_toggle with the state', () => {
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper' });
  initPassportCards();
  const btn = document.querySelector('.kit-tg') as HTMLElement;
  const body = document.getElementById('kit-2694') as HTMLElement;

  click(btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'true');
  assert.equal(body.hidden, false);
  assert.deepEqual(gtagCalls.at(-1), [
    'event',
    'kit_list_toggle',
    { puppy_id: '2694', puppy_name: 'Pepper', breed: 'Cavapoo', label: 'open' },
  ]);

  click(btn);
  assert.equal(btn.getAttribute('aria-expanded'), 'false');
  assert.equal(body.hidden, true);
});

test('on desktop, a WhatsApp click is intercepted and opens the QR pop-up', () => {
  setDesktop(true);
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper' });
  initPassportCards();
  const ev = click(document.querySelector('.ic.chat') as Element);

  assert.equal(ev.defaultPrevented, true);
  const dlg = document.getElementById('pc-dlg') as HTMLElement;
  assert.equal(dlg.hidden, false);
  assert.ok(dlg.querySelector('.qr svg'), 'QR code rendered');
});

test('on a phone, a WhatsApp click is not intercepted', () => {
  setDesktop(false);
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper' });
  initPassportCards();
  const ev = click(document.querySelector('.ic.chat') as Element);

  assert.equal(ev.defaultPrevented, false);
  assert.equal(document.getElementById('pc-dlg'), null);
});

test('a one-photo pup gets no clones', () => {
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper', slides: 1, video: false });
  initPassportCards();
  const track = document.querySelector('.car-track') as HTMLElement;
  assert.equal(track.children.length, 1);
});

test('initPassportCards is idempotent: a second call does not clone the track again', () => {
  document.body.innerHTML = cardHtml({ id: '2694', name: 'Pepper', slides: 2, video: false });
  initPassportCards();
  initPassportCards();
  const track = document.querySelector('.car-track') as HTMLElement;
  assert.equal(track.children.length, 4); // 2 real slides plus 1 clone at each end
});

test('the day strip marks the closed Monday as Closed and disabled', () => {
  const days = buildDays(NOW, 8, [...CARD_CLOSED_DOWS]);
  const html = dayButtonsHtml(days, NOW);
  const monday = days.find((d) => d.closed);
  assert.ok(monday);
  assert.match(html, new RegExp(`data-key="${monday.key}"[^>]*disabled`));
  assert.match(html, /<i>Closed<\/i>/);
});

test('after 5pm SGT the earliest visit text rolls to tomorrow (Saturday) 11am', () => {
  const now = new Date('2026-11-20T09:30:00Z'); // 5:30pm SGT Friday
  const days = buildDays(now, 8, [...CARD_CLOSED_DOWS]);
  assert.equal(nextTextFor(days, now), 'Tomorrow, 11am');
});
