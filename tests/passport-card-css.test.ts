import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// `.sheet-open` is set on the card root (article.pc.phone), so a descendant selector
// like `.pc .sheet-open .sheet` can never match. The perks sheet then stays hidden.
// Regression for the owner's "slider strip pop-up not working" report.
const css = readFileSync(new URL('../src/components/passport-card.css', import.meta.url), 'utf8');

test('no CSS rule uses .pc as an ancestor of .sheet-open (the class sits on the card itself)', () => {
  assert.doesNotMatch(css, /\.pc\s+\.sheet-open\b/);
});

test('the perks sheet is shown by the card-level selector .pc.sheet-open .sheet', () => {
  assert.match(css, /\.pc\.sheet-open\s+\.sheet\s*\{[^}]*visibility:\s*visible/);
  assert.match(css, /\.pc\.sheet-open\s+\.sheet\s*\{[^}]*translate\(-50%,\s*0\)/);
});

// On phones the Book label is 2px smaller than desktop (14.5px to 12.5px), so "Book tomorrow, 11am" keeps its "am".
test('phones shrink the Book label to 12.5px and let it wrap instead of cutting "am"', () => {
  assert.match(css, /@media \(max-width:\s*639px\)\s*\{[^}]*\.pc \.book\{font-size:12\.5px/);
  assert.match(css, /\.pc \.book \.bk-lbl\{white-space:normal/);
});

// The passport card has no paw prints: no paw shapes in the wallpaper, no paw tile on the puppy details block.
test('the passport card has no paw prints', () => {
  assert.doesNotMatch(css, /cx='24' cy='30'/);
  assert.doesNotMatch(css, /var\(--pawtile\)/);
});

// The site's sticky header and mobile CTA sit at z-index 40 (--z-sticky). An open card must sit above them,
// or the sheet's Back to booking button and the scrim are covered on phones.
test('an open card lifts above the site sticky layer (z-sticky 40)', () => {
  const m = css.match(/\.pc\.sheet-open\s*\{[^}]*z-index:\s*(\d+)/);
  assert.ok(m, 'expected a .pc.sheet-open rule with a z-index');
  assert.ok(Number(m[1]) > 40, `z-index ${m[1]} must exceed 40`);
});
