// Loop strips for the Free Gifts and Happy Families sliders.
// Idle, a strip drifts on its own. When a reader touches, drags or scrolls it, the drift stops and they
// move it left or right by hand. Auto-scroll resumes RESUME_MS after the last touch.
// The track is two identical halves (the second is aria-hidden), so a position past one half is the same
// picture as the position minus that half. Wrapping by one half is therefore seamless, and the loop never runs out.
// Reduced-motion readers get no auto-scroll but can still drag. Plain JS, no dependencies.

export const SPEED_PX_PER_S = 40;
export const RESUME_MS = 3000;

// Wrap a scroll position into [0, half). Pure, so the loop maths can be tested without a browser.
export function wrapPos(pos: number, half: number): number {
  if (half <= 0) return 0;
  const p = pos % half;
  return p < 0 ? p + half : p;
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function initLoopStrips(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-loop]').forEach((strip) => {
    const track = strip.querySelector<HTMLElement>('[data-loop-track]');
    if (!track || strip.dataset.loopReady === '1') return;
    strip.dataset.loopReady = '1';

    // reverse = content drifts right; default = content drifts left.
    const dir = strip.dataset.loopReverse === '1' ? -1 : 1;
    const reduced = reducedMotion();
    const half = () => track.scrollWidth / 2;

    let pos = strip.scrollLeft;
    let last = performance.now();
    let lastTouch = -Infinity;
    let touching = false;
    let drag: { id: number; lastX: number } | null = null;
    const touched = () => {
      lastTouch = performance.now();
    };

    // Touch: the browser pans the strip natively. touchmove keeps auto-scroll off while a finger is moving.
    strip.addEventListener(
      'touchstart',
      () => {
        touching = true;
        touched();
      },
      { passive: true },
    );
    strip.addEventListener('touchmove', touched, { passive: true });
    const touchEnd = () => {
      touching = false;
      touched();
    };
    strip.addEventListener('touchend', touchEnd, { passive: true });
    strip.addEventListener('touchcancel', touchEnd, { passive: true });
    // Trackpad or wheel scrolling counts as the reader moving it.
    strip.addEventListener('wheel', touched, { passive: true });

    // Mouse: pointer drag. Touch is handled above, so these pointer events are mouse only.
    strip.addEventListener('pointerdown', (e) => {
      touched();
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { id: e.pointerId, lastX: e.clientX };
      strip.classList.add('is-dragging');
      try {
        strip.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best effort */
      }
    });
    strip.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const next = strip.scrollLeft - (e.clientX - drag.lastX);
      drag.lastX = e.clientX;
      const h = half();
      strip.scrollLeft = h > 0 ? wrapPos(next, h) : next;
      touched();
    });
    const dragEnd = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      strip.classList.remove('is-dragging');
      touched();
    };
    strip.addEventListener('pointerup', dragEnd);
    strip.addEventListener('pointercancel', dragEnd);
    // The browser's own image drag would cancel the pointer drag, so stop it.
    strip.addEventListener('dragstart', (e) => e.preventDefault());

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const h = half();
      if (h > 0) {
        const idle = !touching && drag === null && now - lastTouch >= RESUME_MS;
        if (idle && !reduced) {
          // Adopt a position set from outside (a resize, a restored scroll) before moving on.
          if (Math.abs(strip.scrollLeft - pos) > 1) pos = strip.scrollLeft;
          pos = wrapPos(pos + dir * SPEED_PX_PER_S * (dt / 1000), h);
          strip.scrollLeft = pos;
        } else {
          // The reader is moving it: follow where they left it and keep it wrapped so they can go on.
          let s = strip.scrollLeft;
          if (s >= h) s -= h;
          else if (s < 1) s += h;
          if (s !== strip.scrollLeft) strip.scrollLeft = s;
          pos = s;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
