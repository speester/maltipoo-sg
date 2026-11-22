// Passport card client script. Ported from the JS block of _passport-card-reference/pass-src.html.
// Server markup comes from src/components/PassportCard.astro, and this script attaches behaviour to it.
// initPassportCards(root) is idempotent. startPassportClock() re-dates the strip every 30s and on tab focus.
// Analytics: buttons carry data-ga4-event/label and are sent by the Analytics.astro delegate. Only dynamic
// events (photo_tap, photo_swipe, kit_list_toggle, popup_close, Esc perks_close) are sent here via pcTrack.
import qrcode from 'qrcode-generator';
import { buildDays, slotsFor, earliestOpen, hr, type Day } from '../lib/passport-booking.ts';

// Closed weekdays for every breed site (Decision 1: closed Mondays). 0 = Sunday, 1 = Monday.
export const CARD_CLOSED_DOWS: readonly number[] = [1];

const DESK_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

let clock: () => Date = () => new Date();
export function setPassportClock(fn: () => Date): void {
  clock = fn;
}

// ---------- pure helpers (also used by PassportCard.astro for the first render) ----------

const isOff = (d: Day, now: Date): boolean => d.closed || slotsFor(d, now).every((s) => s.disabled);

export function shortLabel(days: readonly Day[], d: Day): string {
  if (d.isToday) return 'today';
  if (days.indexOf(d) === 1) return 'tomorrow';
  return `${d.top} ${d.date}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);
}

// Day strip buttons. Same markup as the client rebuild, so the server and client renders match.
export function dayButtonsHtml(days: readonly Day[], now: Date): string {
  return days
    .map((d) => {
      const off = isOff(d, now);
      const note = d.closed ? 'Closed' : off ? 'Full' : d.mon;
      const aria = `${d.long}${d.isToday ? ', today' : ''}${d.closed ? ', closed' : off ? ', no times left' : ''}`;
      return `<button class="day${d.isToday ? ' is-today' : ''}" data-act="day" data-key="${d.key}" data-ga4-event="date_select" data-ga4-label="${d.key}" aria-pressed="false"${off ? ' disabled' : ''} aria-label="${escapeHtml(aria)}"><small>${d.top}</small><b>${d.date}</b><i>${note}</i></button>`;
    })
    .join('');
}

// "Tomorrow, 11am" style text for the Earliest visit row.
export function nextTextFor(days: readonly Day[], now: Date): string {
  const o = earliestOpen(days, now);
  if (!o) return 'message us for a time';
  const d = days.find((x) => x.key === o.key);
  const when = !d ? '' : d.isToday ? 'Today' : days.indexOf(d) === 1 ? 'Tomorrow' : d.long;
  return `${when}, ${hr(o.h)}`;
}

// ---------- shared state ----------

let DAYS: Day[] = [];
let DAYSIG = '';

const sigOf = (days: readonly Day[], now: Date): string =>
  days.map((d) => `${d.key}:${slotsFor(d, now).filter((s) => s.disabled).length}`).join(',');

type BookState = { day: string | null; slot: number | null };
const bookState = new WeakMap<HTMLElement, BookState>();
function stateOf(card: HTMLElement): BookState {
  let s = bookState.get(card);
  if (!s) {
    s = { day: null, slot: null };
    bookState.set(card, s);
  }
  return s;
}

function cardOf(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>('.pc[data-passport]');
}

function puppyParams(card: Element | null): Record<string, string> {
  if (!card) return {};
  const d = (card as HTMLElement).dataset;
  return { puppy_id: d.pup ?? '', puppy_name: d.pupName ?? '', breed: d.pupBreed ?? '' };
}

// Dynamic GA4 events only. Static buttons are sent by the Analytics.astro delegate.
export function pcTrack(name: string, params: Record<string, string>, card: Element | null): void {
  const payload = { ...puppyParams(card), ...params };
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  try {
    if (typeof w.gtag === 'function') w.gtag('event', name, payload);
  } catch {
    /* analytics must never break the card */
  }
}

function matchesQuery(q: string): boolean {
  try {
    return window.matchMedia(q).matches;
  } catch {
    return false;
  }
}

function waHref(card: HTMLElement, text: string): string {
  return `https://wa.me/${card.dataset.wa ?? ''}?text=${encodeURIComponent(text)}`;
}

// ---------- booking ----------

function syncBook(card: HTMLElement): void {
  const now = clock();
  const s = stateOf(card);
  let day: Day | null = DAYS.find((x) => x.key === s.day && !isOff(x, now)) ?? null;
  if (!day) {
    day = DAYS.find((x) => !isOff(x, now)) ?? null;
    s.day = day ? day.key : null;
  }
  const open = day ? slotsFor(day, now).filter((x) => !x.disabled).map((x) => x.h) : [];
  if (!day) s.slot = null;
  else if (s.slot == null || !open.includes(s.slot)) s.slot = open.length ? open[0] : null;

  card.querySelectorAll<HTMLElement>('.day').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.key === s.day));
  });
  card.querySelectorAll<HTMLButtonElement>('.slot').forEach((b) => {
    const h = Number(b.dataset.h);
    const off = !day || !open.includes(h);
    b.disabled = off;
    b.setAttribute('aria-pressed', String(!off && s.slot === h));
  });

  const book = card.querySelector<HTMLAnchorElement>('.book');
  if (!book) return;
  // The label span is .bk-lbl. The first span is the calendar icon, so writing to it doubled the text.
  const label = book.querySelector<HTMLElement>('.bk-lbl');
  if (day && s.slot != null) {
    const slot = s.slot;
    const text = `Hi Curious Tails! I'd like to book a viewing of ${card.dataset.pupName ?? ''} (ID ${card.dataset.pup ?? ''}, ${card.dataset.pupBreed ?? ''}) on ${day.long} at ${hr(slot)}.`;
    if (label) label.textContent = `Book ${shortLabel(DAYS, day)}, ${hr(slot)}`;
    book.href = waHref(card, text);
    book.classList.add('ready');
    book.dataset.ga4Label = `${day.long} ${hr(slot)}`;
  } else {
    if (label) label.textContent = 'Book viewing';
    book.setAttribute('href', '#');
    book.classList.remove('ready');
    delete book.dataset.ga4Label;
  }
}

function refreshDays(force: boolean): void {
  const now = clock();
  const next = buildDays(now, 8, [...CARD_CLOSED_DOWS]);
  const sig = sigOf(next, now);
  if (!force && sig === DAYSIG) return;
  DAYS = next;
  DAYSIG = sig;
  document.querySelectorAll<HTMLElement>('.pc[data-passport]').forEach((card) => {
    const box = card.querySelector<HTMLElement>('.dates');
    if (box) {
      const sl = box.scrollLeft;
      box.innerHTML = dayButtonsHtml(DAYS, now);
      box.scrollLeft = sl;
    }
    card.querySelectorAll('.next-t').forEach((n) => {
      n.textContent = nextTextFor(DAYS, now);
    });
    syncBook(card);
  });
}

// ---------- photo album: endless loop both ways (clone at each end), auto-advance when the bar fills ----------

type CarApi = { go(i: number): void; next(): void; prev(): void; resize(): void };
const carApi = new WeakMap<HTMLElement, CarApi>();
let io: IntersectionObserver | null = null;

function initCar(car: HTMLElement, card: HTMLElement): void {
  if (carApi.has(car)) return;
  const track = car.querySelector<HTMLElement>('.car-track');
  if (!track) return;
  const real = Array.from(track.children) as HTMLElement[];
  const n = real.length;
  const inds = Array.from(car.querySelectorAll<HTMLElement>('[data-ci]'));
  if (n > 1) {
    const a = real[n - 1].cloneNode(true) as HTMLElement;
    const b = real[0].cloneNode(true) as HTMLElement;
    [a, b].forEach((c) => {
      if (c.tagName === 'IMG') (c as HTMLImageElement).alt = '';
      c.setAttribute('aria-hidden', 'true');
      c.classList.remove('on');
      c.querySelectorAll<HTMLElement>('a,button').forEach((x) => {
        x.tabIndex = -1;
      });
    });
    track.prepend(a);
    track.append(b);
  }

  let cur = 0;
  let settleT: ReturnType<typeof setTimeout> | undefined;
  let holdT: ReturnType<typeof setTimeout> | undefined;
  const W = () => track.clientWidth || 1;
  const jump = (pos: number) => {
    track.style.scrollSnapType = 'none';
    track.scrollLeft = pos * W();
    void track.offsetWidth;
    track.style.scrollSnapType = '';
  };
  const mark = (i: number) => {
    cur = i;
    inds.forEach((el) => {
      el.classList.remove('on');
      el.classList.toggle('past', Number(el.dataset.ci) < i);
    });
    const el = inds[i];
    if (el) {
      void el.offsetWidth;
      el.classList.add('on');
    }
  };
  const settle = () => {
    if (n < 2) return;
    const pos = Math.round(track.scrollLeft / W());
    if (pos <= 0) {
      jump(n);
      if (cur !== n - 1) mark(n - 1);
    } else if (pos >= n + 1) {
      jump(1);
      if (cur !== 0) mark(0);
    } else if (pos - 1 !== cur) mark(pos - 1);
  };
  const go = (i: number) => {
    if (n < 2) return;
    mark((i + n) % n);
    track.scrollTo({ left: (i + 1) * W(), behavior: reduced() ? 'auto' : 'smooth' });
    if (reduced()) settle();
  };
  const api: CarApi = {
    go,
    next: () => go(cur + 1),
    prev: () => go(cur - 1),
    resize: () => jump(cur + 1),
  };
  carApi.set(car, api);

  track.addEventListener(
    'scroll',
    () => {
      clearTimeout(settleT);
      settleT = setTimeout(settle, 140);
    },
    { passive: true },
  );
  if ('onscrollend' in track) {
    track.addEventListener('scrollend', () => {
      clearTimeout(settleT);
      settle();
    });
  }

  // Mouse drag, so desktop can swipe too (touch already scrolls natively).
  let drag: { x: number; sl: number; moved: boolean; id: number } | null = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || n < 2) return;
    drag = { x: e.clientX, sl: track.scrollLeft, moved: false, id: e.pointerId };
    track.style.scrollSnapType = 'none';
    car.classList.add('hold');
  });
  track.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      try {
        track.setPointerCapture(drag.id);
      } catch {
        /* capture is best effort */
      }
    }
    if (drag.moved) track.scrollLeft = drag.sl - dx;
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const moved = drag.moved;
    drag = null;
    track.style.scrollSnapType = '';
    car.classList.remove('hold');
    if (moved) {
      track.dataset.dragged = '1';
      go(cur + (dx < -40 ? 1 : dx > 40 ? -1 : 0));
      if (Math.abs(dx) > 40) pcTrack('photo_swipe', { label: dx < 0 ? 'next' : 'prev', method: 'mouse' }, card);
    }
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  car.addEventListener('animationend', (e) => {
    const target = e.target as HTMLElement | null;
    if (e.animationName === 'fill' && target?.parentElement?.classList.contains('on')) go(cur + 1);
  });

  let tx: number | null = null;
  const hold = () => {
    clearTimeout(holdT);
    car.classList.add('hold');
  };
  const release = (ms: number) => {
    clearTimeout(holdT);
    holdT = setTimeout(() => car.classList.remove('hold'), ms);
  };
  track.addEventListener(
    'touchstart',
    (e) => {
      hold();
      tx = e.touches[0] ? e.touches[0].clientX : null;
    },
    { passive: true },
  );
  track.addEventListener(
    'touchend',
    (e) => {
      release(2500);
      const t0 = e.changedTouches[0];
      if (tx != null && t0 && Math.abs(t0.clientX - tx) > 40) {
        pcTrack('photo_swipe', { label: t0.clientX < tx ? 'next' : 'prev', method: 'touch' }, card);
      }
      tx = null;
    },
    { passive: true },
  );

  if (io) io.observe(car);
  jump(n > 1 ? 1 : 0);
  mark(0);
}

// ---------- perks sheet and kit list ----------

const openers = new WeakMap<HTMLElement, HTMLElement>();

function openSheet(card: HTMLElement, opener: HTMLElement): void {
  card.classList.add('sheet-open');
  openers.set(card, opener);
  card.querySelector<HTMLElement>('.sheet .grab')?.focus({ preventScroll: true });
}

function closeSheet(card: HTMLElement): void {
  card.classList.remove('sheet-open');
  const o = openers.get(card);
  if (o) o.focus({ preventScroll: true });
  card.scrollTop = 0;
}

function toggleKit(btn: HTMLElement, card: HTMLElement): void {
  const body = document.getElementById(btn.getAttribute('aria-controls') ?? '');
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  if (body) body.hidden = !open;
  pcTrack('kit_list_toggle', { label: open ? 'open' : 'close' }, card);
  const sheet = btn.closest<HTMLElement>('.sheet');
  if (open && sheet) sheet.scrollTo({ top: Math.max(0, btn.offsetTop - 10), behavior: reduced() ? 'auto' : 'smooth' });
}

function reduced(): boolean {
  return matchesQuery(REDUCED_QUERY);
}

// ---------- one shared pop-up: WhatsApp QR, call number, video ----------

let dlgOpener: HTMLElement | null = null;
let dlgCard: HTMLElement | null = null;
let dlgCar: HTMLElement | null = null;
let dlgKind = '';

function dialogEl(): HTMLElement {
  const existing = document.getElementById('pc-dlg');
  if (existing) return existing;
  // The .pc wrapper puts the shared pop-up under the passport card styles (.pc .dlg-wrap: fixed overlay, scrim, panel).
  const wrap = document.createElement('div');
  wrap.className = 'pc';
  const w = document.createElement('div');
  w.id = 'pc-dlg';
  w.className = 'dlg-wrap';
  w.hidden = true;
  w.innerHTML =
    '<div class="dlg-scrim" data-dlg-close="backdrop"></div>' +
    '<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-t" tabindex="-1">' +
    '<button class="dlg-x" type="button" data-dlg-close="close_button" aria-label="Close">&times;</button>' +
    '<div class="dlg-body"></div></div>';
  wrap.appendChild(w);
  document.body.appendChild(wrap);
  return w;
}

function openDlg(html: string, opener: HTMLElement | null, card: HTMLElement | null, kind: string, car: HTMLElement | null): void {
  const w = dialogEl();
  dlgKind = kind;
  dlgOpener = opener;
  dlgCard = card;
  w.classList.toggle('vmode', kind === 'video');
  const body = w.querySelector<HTMLElement>('.dlg-body');
  if (body) body.innerHTML = html;
  w.hidden = false;
  w.classList.add('show');
  w.querySelector<HTMLElement>('.dlg')?.focus({ preventScroll: true });
  dlgCar = car;
  if (car) car.classList.add('vid');
}

function closeDlg(method: string): void {
  const w = document.getElementById('pc-dlg');
  if (!w || w.hidden) return;
  ytFrame = null;
  pcTrack('popup_close', { label: dlgKind, method }, dlgCard);
  w.classList.remove('show');
  w.hidden = true;
  const body = w.querySelector<HTMLElement>('.dlg-body');
  if (body) body.innerHTML = '';
  if (dlgCar) {
    dlgCar.classList.remove('vid');
    dlgCar = null;
  }
  if (dlgOpener) dlgOpener.focus({ preventScroll: true });
}

function qrSvg(text: string): string {
  try {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const m = 2;
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + m * 2} ${n + m * 2}" shape-rendering="crispEdges" role="img" aria-label="QR code to chat with Curious Tails on WhatsApp"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111b21"/></svg>`;
  } catch {
    return '';
  }
}

function waDialog(href: string, opener: HTMLElement, card: HTMLElement): void {
  const u = new URL(href);
  const text = u.searchParams.get('text') ?? '';
  const num = card.dataset.wa ?? '';
  const web = `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(text)}`;
  const app = `whatsapp://send?phone=${num}&text=${encodeURIComponent(text)}`;
  const qr = qrSvg(href);
  const chatIcon = card.querySelector('.ic.chat svg')?.outerHTML ?? '';
  openDlg(
    `<div class="dlg-h wa"><span class="dlg-ic">${chatIcon}</span><div><h2 id="dlg-t">Chat with us on WhatsApp</h2><p>${escapeHtml(card.dataset.phone ?? '')} · usually replies within minutes</p></div></div>
    <div class="dlg-qr">${qr ? `<div class="qr">${qr}</div><p><b>Scan with your phone</b>Open your camera or WhatsApp and point it at the code. Your message is already typed in.</p>` : `<p><b>Open WhatsApp below</b>Your message is already typed in.</p>`}</div>
    ${text ? `<div class="dlg-msg"><small>Your message</small>${escapeHtml(text)}</div>` : ''}
    <a class="dlg-btn wa" href="${web}" target="_blank" rel="noopener" data-ga4-event="whatsapp_web_click" data-ga4-label="desktop_dialog">Open on WhatsApp Web</a>
    <a class="dlg-link" href="${app}" data-ga4-event="whatsapp_app_click" data-ga4-label="desktop_dialog">Use the WhatsApp desktop app instead</a>`,
    opener,
    card,
    'whatsapp',
    null,
  );
}

function callDialog(opener: HTMLElement, card: HTMLElement): void {
  const digits = card.dataset.call ?? '';
  const show = card.dataset.callShow ?? '';
  const phoneIcon = card.querySelector('.ic.call svg')?.outerHTML ?? '';
  openDlg(
    `<div class="dlg-h call"><span class="dlg-ic">${phoneIcon}</span><div><h2 id="dlg-t">Call Curious Tails</h2><p>${escapeHtml(card.dataset.hours ?? '')}</p></div></div>
    <div class="dlg-num"><small>+65</small>${escapeHtml(show)}</div>
    <button class="dlg-btn call" type="button" data-dlg-copy data-ga4-event="call_copy_click" data-ga4-label="desktop_dialog"><span>Copy number</span></button>
    <a class="dlg-link" href="tel:+${digits}" data-ga4-event="call_dial_click" data-ga4-label="desktop_dialog">Call from this computer</a>`,
    opener,
    card,
    'call',
    null,
  );
}

// The pop-up embed has no playlist=: a playlist draws the prev and next buttons.
// The loop is done here instead. When the player reports ENDED (0), it seeks to 0 and plays again.
let ytFrame: HTMLIFrameElement | null = null;

function ytSend(f: HTMLIFrameElement, msg: Record<string, unknown>): void {
  f.contentWindow?.postMessage(JSON.stringify(msg), '*');
}

function ytSubscribe(f: HTMLIFrameElement): void {
  ytSend(f, { event: 'listening', id: 1, channel: 'widget' });
  ytSend(f, { event: 'command', func: 'addEventListener', args: ['onStateChange'] });
}

function onYtMessage(e: MessageEvent): void {
  const f = ytFrame;
  if (!f || e.source !== f.contentWindow || typeof e.data !== 'string') return;
  let msg: { event?: string; info?: unknown } | null = null;
  try {
    msg = JSON.parse(e.data) as { event?: string; info?: unknown };
  } catch {
    return;
  }
  const info = msg && typeof msg.info === 'object' && msg.info !== null ? (msg.info as { playerState?: unknown }) : null;
  const ended = (msg?.event === 'onStateChange' && msg.info === 0) || (msg?.event === 'infoDelivery' && info?.playerState === 0);
  if (ended) {
    ytSend(f, { event: 'command', func: 'seekTo', args: [0, true] });
    ytSend(f, { event: 'command', func: 'playVideo', args: '' });
  }
}

let ytListening = false;

function ytWatch(f: HTMLIFrameElement): void {
  ytFrame = f;
  // Registered on first use, not at import: this module also runs during the server build, where there is no window.
  if (!ytListening) {
    window.addEventListener('message', onYtMessage);
    ytListening = true;
  }
  f.addEventListener(
    'load',
    () => {
      // The player may not be ready at load, so subscribe again a few times.
      [0, 1000, 3000].forEach((ms) =>
        setTimeout(() => {
          if (ytFrame === f) ytSubscribe(f);
        }, ms),
      );
    },
    { once: true },
  );
}

function videoDialog(id: string, name: string, opener: HTMLElement, card: HTMLElement, car: HTMLElement | null): void {
  if (!YT_ID.test(id)) return;
  openDlg(
    `<h2 id="dlg-t" class="vh">Video of ${escapeHtml(name)}</h2><div class="vbox"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&iv_load_policy=3&fs=0&disablekb=1&enablejsapi=1" title="Video of ${escapeHtml(name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`,
    opener,
    card,
    'video',
    car,
  );
  const frame = document.querySelector<HTMLIFrameElement>('#pc-dlg iframe');
  if (frame) ytWatch(frame);
}

function copyNumber(btn: HTMLElement, show: string): void {
  const done = (ok: boolean) => {
    btn.classList.add('ok');
    const s = btn.querySelector('span');
    if (s) s.textContent = ok ? `Copied ${show}` : `Number: ${show}`;
  };
  try {
    navigator.clipboard.writeText(show).then(
      () => done(true),
      () => done(false),
    );
  } catch {
    done(false);
  }
}

// ---------- toast ----------

const doneTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
let toastT: ReturnType<typeof setTimeout> | undefined;
function toast(msg: string): void {
  let el = document.getElementById('pc-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pc-toast';
    el.className = 'pc-toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el?.classList.remove('show'), 2600);
}

// ---------- events ----------

function onClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (!target || !target.closest) return;
  // The click that ends a drag on a strip does not select a pill.
  const strip = target.closest<HTMLElement>('.slots, .dates');
  if (strip && strip.dataset.dragged === '1') {
    delete strip.dataset.dragged;
    e.preventDefault();
    return;
  }

  const dlg = document.getElementById('pc-dlg');
  if (dlg && target.closest('#pc-dlg')) {
    if (dlg.hidden) return;
    const close = target.closest<HTMLElement>('[data-dlg-close]');
    if (close) {
      closeDlg(close.dataset.dlgClose ?? 'backdrop');
      return;
    }
    const copy = target.closest<HTMLElement>('[data-dlg-copy]');
    if (copy) copyNumber(copy, dlgCard?.dataset.callShow ?? '');
    return;
  }

  if (matchesQuery(DESK_QUERY)) {
    const waA = target.closest<HTMLAnchorElement>('a[href^="https://wa.me/"]');
    const waCard = waA ? cardOf(waA) : null;
    if (waA && waCard) {
      e.preventDefault();
      waDialog(waA.href, waA, waCard);
      return;
    }
    const callA = target.closest<HTMLElement>('[data-act="call"]');
    const callCard = callA ? cardOf(callA) : null;
    if (callA && callCard) {
      e.preventDefault();
      callDialog(callA, callCard);
      return;
    }
  }

  const t = target.closest<HTMLElement>('[data-act]');
  if (!t) return;
  const act = t.dataset.act ?? '';
  const card = cardOf(t);
  const car = t.closest<HTMLElement>('[data-car]');
  const api = car ? carApi.get(car) : undefined;

  if (act === 'vplay') {
    const vs = t.closest<HTMLElement>('.vslide');
    if (vs && card) videoDialog(vs.dataset.yt ?? '', card.dataset.pupName ?? '', t, card, car);
  } else if (act === 'car-go') {
    api?.go(Number(t.dataset.ci));
  } else if (act === 'car-next') {
    if (t.dataset.dragged === '1') {
      delete t.dataset.dragged;
      return;
    }
    if (target.closest('.vplay')) return;
    const rc = t.getBoundingClientRect();
    const back = e.clientX - rc.left < rc.width * 0.3;
    if (card) pcTrack('photo_tap', { label: back ? 'prev' : 'next' }, card);
    if (back) api?.prev();
    else api?.next();
  } else if (act === 'car-prev') {
    api?.prev();
  } else if (act === 'car-fwd') {
    api?.next();
  } else if (act === 'sheet' && card) {
    openSheet(card, t);
  } else if (act === 'sheet-close' && card) {
    closeSheet(card);
  } else if (act === 'kit' && card) {
    toggleKit(t, card);
  } else if (act === 'next-open' && card) {
    const go = t.querySelector<HTMLElement>('.go');
    if (go) {
      if (!go.dataset.orig) go.dataset.orig = go.innerHTML;
      t.classList.add('done');
      go.textContent = 'Selected';
      const prev = doneTimers.get(t);
      if (prev) clearTimeout(prev);
      doneTimers.set(
        t,
        setTimeout(() => {
          t.classList.remove('done');
          go.innerHTML = go.dataset.orig ?? 'Book It';
        }, 1800),
      );
    }
    const o = earliestOpen(DAYS, clock());
    if (o) {
      const s = stateOf(card);
      s.day = o.key;
      s.slot = o.h;
    }
    syncBook(card);
    const bk = card.querySelector<HTMLElement>('.bk');
    if (bk) {
      const br = bk.getBoundingClientRect();
      if (br.top < 0 || br.bottom > window.innerHeight) {
        window.scrollBy({ top: br.top - Math.max(16, (window.innerHeight - br.height) / 2), behavior: reduced() ? 'auto' : 'smooth' });
      }
      bk.classList.remove('flash');
      void bk.offsetWidth;
      bk.classList.add('flash');
    }
    const strip = card.querySelector<HTMLElement>('.dates');
    const dayBtn = card.querySelector<HTMLElement>('.day[aria-pressed="true"]');
    if (strip && dayBtn) {
      strip.scrollTo({ left: Math.max(0, dayBtn.offsetLeft - strip.offsetLeft - 6), behavior: reduced() ? 'auto' : 'smooth' });
    }
  } else if (act === 'day' && card) {
    stateOf(card).day = t.dataset.key ?? null;
    syncBook(card);
  } else if (act === 'slot' && card) {
    stateOf(card).slot = Number(t.dataset.h);
    syncBook(card);
  } else if (act === 'book' && card) {
    if (stateOf(card).slot == null) {
      e.preventDefault();
      const s = card.querySelector<HTMLElement>('.slots');
      if (s) {
        s.classList.remove('shake');
        void s.offsetWidth;
        s.classList.add('shake');
      }
      toast('Pick a time first, then tap Book viewing');
    }
  } else if (act === 'call' && card) {
    const show = card.dataset.callShow ?? '';
    toast(`Calling ${show}. Number copied in case your device doesn't dial.`);
    try {
      navigator.clipboard.writeText(show).catch(() => undefined);
    } catch {
      /* clipboard is optional */
    }
  }
}

function onInput(e: Event): void {
  const el = e.target as HTMLTextAreaElement | HTMLInputElement | null;
  if (!el || !el.matches || !el.matches('[data-msg]')) return;
  const card = cardOf(el);
  if (!card) return;
  const txt = el.value.trim() || (el.dataset.prefill ?? '');
  card.querySelectorAll<HTMLAnchorElement>('.send, .tip').forEach((a) => {
    a.href = waHref(card, txt);
  });
}

function onKey(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null;
  if (e.key === 'Enter' && !e.shiftKey && t && t.matches && t.matches('[data-msg]')) {
    // The message box is a textarea so long prefills wrap. Enter sends, Shift+Enter adds a line.
    e.preventDefault();
    const card = cardOf(t);
    card?.querySelector<HTMLElement>('.send')?.click();
    return;
  }
  if (e.key !== 'Escape') return;
  const dlg = document.getElementById('pc-dlg');
  if (dlg && !dlg.hidden) {
    closeDlg('esc');
    return;
  }
  const open = Array.from(document.querySelectorAll<HTMLElement>('.pc.sheet-open'));
  if (open.length) {
    pcTrack('perks_close', { label: 'esc' }, open[0]);
    open.forEach(closeSheet);
  }
}

// Mouse drag for a horizontal strip (time slots, date strip). Touch scrolls natively.
// A drag that moves the strip must not also count as a click on a pill.
function dragScroll(el: HTMLElement): void {
  if (el.dataset.dragReady === '1') return;
  el.dataset.dragReady = '1';
  let start: { x: number; left: number; moved: boolean; id: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    delete el.dataset.dragged;
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    start = { x: e.clientX, left: el.scrollLeft, moved: false, id: e.pointerId };
  });
  el.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    if (!start.moved && Math.abs(dx) > 5) {
      start.moved = true;
      el.classList.add('dragging');
      // Keep receiving moves when the pointer leaves the strip (it is only about 60 px tall).
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* no capture: the drag still works while the pointer stays over the strip */
      }
    }
    if (start.moved) el.scrollLeft = start.left - dx;
  });
  const end = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const moved = start.moved;
    start = null;
    el.classList.remove('dragging');
    if (moved) el.dataset.dragged = '1';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

// ---------- entry points ----------

let wired = false;

export function initPassportCards(root: ParentNode = document): void {
  if (!wired) {
    wired = true;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => {
      document.querySelectorAll<HTMLElement>('[data-car]').forEach((c) => carApi.get(c)?.resize());
    });
    const IO = (window as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    if (typeof IO === 'function') {
      io = new IO((entries) => entries.forEach((en) => en.target.classList.toggle('away', !en.isIntersecting)), { threshold: 0.25 });
    }
  }
  root.querySelectorAll<HTMLElement>('.pc[data-passport]').forEach((card) => {
    if (card.dataset.pcReady === '1') return;
    card.dataset.pcReady = '1';
    card.querySelectorAll<HTMLElement>('[data-car]').forEach((car) => initCar(car, card));
    card.querySelectorAll<HTMLElement>('.slots, .dates.scroll').forEach((strip) => dragScroll(strip));
  });
  // Re-date the strip from the live clock. A static build can be hours old by the time someone opens the page.
  refreshDays(true);
}

let clockStarted = false;
export function startPassportClock(): void {
  if (clockStarted) return;
  clockStarted = true;
  setInterval(() => refreshDays(false), 30000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshDays(false);
  });
}
