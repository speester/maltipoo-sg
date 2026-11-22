// Sync the real single-breed inventory from the owner's SpreadSimple site
// (availablepuppies.spread.name) into src/data/available-puppies.json and
// src/assets/live/*.webp. Re-runnable: `npm run sync:puppies` (runs first in
// `npm run build:deploy`).
//
// Ported from Curious Tails scripts/sync-puppies.mjs (PLAN-dachshund-live-listings.md):
// - Breed gate: a row is kept when its `Breed-` label (Chinese suffix stripped)
//   is this site's own breed (BREED_LABELS) OR a named crossbreed of it
//   (scripts/lib/cross-breeds.mjs, or an "A x B" label with this breed on one side).
//   Owner decision 2026-10-20: a named mix is listed on the site of BOTH parents
//   — "Malshi" (Maltese x Shih Tzu) appears on maltese.sg and shihtzu.sg. A bare
//   "X" label with an unknown other parent ("Poodle X") stays excluded. Any other
//   label that mentions the breed is reported as unknown and never rendered.
// - Location gate: scripts/puppy-feed.json `locations` (trim + lowercase); owner
//   decision 2026-10-20 = "Balestier Area" + "Choa Chu Kang" on every .sg breed site. Everything
//   else, blank included, is dropped and counted on every run.
// - Available = the top 33 feed rows (page 1 of the spread site) that pass both
//   gates, minus sold: Image1 carries the "found a loving home" overlay, or the id
//   is in src/data/sold-overrides.json.
// - Recently placed = newest historical pups of this breed or its named mixes
//   (same gates) with a clean photo, max 4.
// - Photos are downloaded, resized to 800px WebP into src/assets/live/ and served
//   through Astro <Image>; files no longer referenced are pruned. Never hotlinked.
// - Puppies that leave the available list go to src/data/placed-archive.json.

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  archiveFile,
  archivePhotos,
  classify,
  isExpired,
  needsOverlayCheck,
  recordDepartures,
  sgtDate,
} from './lib/placed-archive.mjs';
import { crossBreedOf, siteBreeds } from './lib/cross-breeds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_DIR = path.join(ROOT, 'src', 'assets', 'live');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'available-puppies.json');
const ARCHIVE_FILE = path.join(ROOT, 'src', 'data', 'placed-archive.json');
const OVERRIDES_FILE = path.join(ROOT, 'src', 'data', 'sold-overrides.json');
const VERDICT_FILE = path.join(ROOT, 'src', 'data', '.puppy-photo-verdicts.json');

const prevFeed = existsSync(DATA_FILE) ? JSON.parse(await readFile(DATA_FILE, 'utf8')) : null;
const archive = existsSync(ARCHIVE_FILE) ? JSON.parse(await readFile(ARCHIVE_FILE, 'utf8')) : { pups: [] };

// Sheet + options as the live availablepuppies.spread.name page uses them (2026-11-18).
const SHEET = 'dlg55NJL1N96882pe1ZISdPxULIp0uQxp0zWdoaf-qstyqVRK-IKhTNhSjTA-HEU0S5w';
const OPTIONS =
  'eyJyb3dzTGltaXQiOjUwMDAsImRlYWxUeXBlIjoiYXBwc3VtbyIsImR5bmFtaWNEYXRhIjp7InNoZWV0SGFzaCI6IjE5MjIyOTYwMTMiLCJTQ1BUYWJsZUxhdGVzdFVwZGF0ZVRpbWVzdGFtcCI6MTc5NDk4ODk5MzMxNH0sInNlYXJjaCI6eyJlbmFibGVkIjp0cnVlLCJjb2x1bW5zIjpbIkJyZWVkLSIsIlByaWNlJC0iLCJDb2xvci0iLCJBZ2UtIiwiR2VuZGVyLSIsIkhEQkFwcHJvdmVkLSIsIlNpemUtIiwiTG9jYXRpb24tIiwiT3JpZ2luLSIsIkltYWdlLSJdfSwic29ydGluZyI6eyJlbmFibGVkIjp0cnVlLCJzaHVmZmxlIjpmYWxzZX0sInBhZ2luYXRpb24iOnsiZW5hYmxlZCI6dHJ1ZSwiaXRlbXNQZXJQYWdlIjoiNjYifSwiZmlsdGVycyI6eyJlbmFibGVkIjp0cnVlLCJ2YWx1ZXMiOlt7ImlkIjoiQnJlZWQtIiwidHlwZSI6Im11bHRpcGxlIn0seyJpZCI6IkdlbmRlci0iLCJ0eXBlIjoibXVsdGlwbGUifSx7ImlkIjoiTG9jYXRpb24tIiwidHlwZSI6Im11bHRpcGxlIn0seyJpZCI6IkhEQkFwcHJvdmVkLSIsInR5cGUiOiJtdWx0aXBsZSJ9XX0sIm1hcFZpZXciOnsiZW5hYmxlZCI6ZmFsc2UsImlkIjpudWxsLCJtYXJrZXJUeXBlIjoicGluIiwiaW1hZ2VDb2xJZCI6IiJ9LCJjYWxlbmRhclZpZXciOnsiZW5hYmxlZCI6ZmFsc2UsInN0YXJ0RGF0ZUNvbElkIjpudWxsLCJ0aXRsZUNvbElkIjoiQnJlZWQtIn19';

// Owner-reported sales the sheet has not marked yet.
const MANUAL_SOLD = new Set(
  existsSync(OVERRIDES_FILE) ? JSON.parse(await readFile(OVERRIDES_FILE, 'utf8')).sold.map(Number) : [],
);

const AVAILABLE_ROWS = 66; // top of the sheet = page 1 of the live spread site (itemsPerPage 66)
const MAX_PLACED = 4;
const IMG_WIDTH = 800;
const UA = { 'User-Agent': 'Mozilla/5.0 (sg-breed-site sync)' };

// Breed + location gates live in scripts/puppy-feed.json so this script is identical
// on every .sg breed site. Owner decision 2026-10-20: Balestier Area + Choa Chu Kang.
const FEED_CFG = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'puppy-feed.json'), 'utf8'));
const ALLOWED_LOCATIONS = new Set(FEED_CFG.locations.map((l) => l.trim().toLowerCase()));
const locationAllowed = (p) => !!p.location && ALLOWED_LOCATIONS.has(p.location.trim().toLowerCase());

// Plan decision 4: feed labels (Chinese suffix stripped, lowercased) that are this
// site's purebred. Phase 1 discovery (logs/feed-discovery-2026-10-14.md) found exactly one.
const BREED_LABELS = new Set(FEED_CFG.labels.map((l) => l.toLowerCase()));
const MENTIONS = new RegExp(FEED_CFG.mentions, 'i');
const isCross = (label) => /\sx\s|\sx$|\bmix/i.test(label);

// This site's breed, as the parent names used by scripts/lib/cross-breeds.mjs.
const SITE_BREEDS = siteBreeds(FEED_CFG);

// Hard word block (CLAUDE.md). A feed string carrying one is withheld, never published.
const BLOCKED = /pedigree|\bdna\b|malay/i;

const cell = (row, key) => {
  const c = row.cells?.[key];
  return c && c.value != null ? String(c.value).trim() : '';
};
const numCell = (row, key) => {
  const c = row.cells?.[key];
  if (c && typeof c.value === 'number') return c.value;
  const n = Number(String(c?.value ?? '').replace(/[^0-9.]/g, ''));
  return c?.value != null && String(c.value).trim() !== '' && Number.isFinite(n) ? n : null;
};

// Live feed = the same sheet availablepuppies.spread.name reads (re-pointed 2026-11-18).
// Read it in 300-row pages (the server honours it): a full sync is ~5 requests, not ~37.
const FETCH_OPTIONS = Buffer.from(
  JSON.stringify({ ...JSON.parse(Buffer.from(OPTIONS, 'base64').toString('utf8')), pagination: { enabled: true, itemsPerPage: 300 } }),
).toString('base64');

// The feed rate-limits bursts with 403s. Retry 403/429/5xx with a growing pause instead of failing the site.
async function feedGet(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res;
    const retryable = res.status === 403 || res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 6) throw new Error(`feed HTTP ${res.status}`);
    const wait = 20000 * attempt;
    process.stdout.write(`\nfeed HTTP ${res.status}; retry ${attempt} in ${wait / 1000}s\n`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

async function fetchAllRows() {
  const rows = [];
  for (let page = 1; ; page++) {
    const query = Buffer.from(
      JSON.stringify({ paginate: { currentPage: page }, sortBy: { id: 'INDEX', direction: 'asc' } }),
    ).toString('base64');
    const url = `https://spread.name/sheet/${SHEET}?query=${encodeURIComponent(query)}&options=${encodeURIComponent(FETCH_OPTIONS)}`;
    const res = await feedGet(url);
    const json = await res.json();
    const batch = json.table?.rows ?? [];
    if (batch.length === 0) break;
    rows.push(...batch);
    process.stdout.write(`\rfeed: ${rows.length}/${json.totalRows} rows`);
    if (rows.length >= json.totalRows) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  process.stdout.write('\n');
  return rows;
}

// ---- overlay detection (verbatim from Curious Tails, calibrated 13/13 on 2026-07-30) ----
// The "FOUND A LOVING HOME" sold overlay comes in two styles:
//  1. dark: photo multiplied dark + white text mid-frame
//  2. bright: photo untouched, white text flanked by thin ruled lines
async function isOverlaid(buffer) {
  const { data, info } = await sharp(buffer, { pages: 1 }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const rowFrac = (y, x0, x1, thr) => {
    if (y < 0 || y >= h) return 0;
    let n = 0;
    const base = y * w;
    for (let x = x0; x < x1; x++) if (data[base + x] > thr) n++;
    return n / (x1 - x0);
  };

  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  let acc = 0;
  let p95 = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= data.length * 0.95) { p95 = v; break; }
  }
  let centerWhite = 0;
  const cy0 = Math.floor(h * 0.42), cy1 = Math.floor(h * 0.58);
  for (let y = cy0; y < cy1; y++) centerWhite += rowFrac(y, 0, w, 240);
  centerWhite /= Math.max(1, cy1 - cy0);
  if (p95 < 140 && centerWhite > 0.005) return true;

  const L = [Math.floor(w * 0.05), Math.floor(w * 0.25)];
  const R = [Math.floor(w * 0.75), Math.floor(w * 0.95)];
  const edgeWhite = (y, thr) => Math.min(rowFrac(y, L[0], L[1], thr), rowFrac(y, R[0], R[1], thr));
  const y0 = Math.floor(h * 0.35), y1 = Math.floor(h * 0.65);
  const marked = [];
  for (let y = y0; y < y1; y++) marked.push(edgeWhite(y, 240) > 0.65 ? 1 : 0);
  const maxRun = Math.max(4, Math.round(h * 0.02));
  let s = -1;
  for (let i = 0; i <= marked.length; i++) {
    if (i < marked.length && marked[i]) { if (s < 0) s = i; continue; }
    if (s >= 0) {
      const len = i - s;
      const yStart = y0 + s, yEnd = y0 + i - 1;
      let above = 0, below = 0;
      for (let k = 2; k <= 8; k++) { above += edgeWhite(yStart - k, 235); below += edgeWhite(yEnd + k, 235); }
      above /= 7; below /= 7;
      if (len >= 2 && len <= maxRun && above < 0.35 && below < 0.35) return true;
      s = -1;
    }
  }
  return false;
}

// ---- photo pipeline ---------------------------------------------------------
const urlHash = (url) => createHash('sha1').update(url).digest('hex').slice(0, 8);

// Overlay verdicts are stable per URL (the shop uploads a NEW image when it
// stamps the overlay), so they are cached across runs.
const verdicts = existsSync(VERDICT_FILE) ? JSON.parse(await readFile(VERDICT_FILE, 'utf8')) : {};
async function checkOverlaid(url) {
  const key = urlHash(url);
  if (!(key in verdicts)) verdicts[key] = await isOverlaid(await fetchImage(url));
  return verdicts[key];
}

const downloadCache = new Map();
function fetchImage(url) {
  if (!downloadCache.has(url)) {
    downloadCache.set(
      url,
      fetch(url, { headers: UA }).then(async (res) => {
        if (!res.ok) throw new Error(`image HTTP ${res.status}: ${url}`);
        return Buffer.from(await res.arrayBuffer());
      }),
    );
  }
  return downloadCache.get(url);
}

async function savePhoto(id, imgIndex, url) {
  const file = `${id}-${imgIndex}-${urlHash(url)}.webp`;
  const dest = path.join(ASSET_DIR, file);
  if (!existsSync(dest)) {
    const buf = await fetchImage(url);
    await sharp(buf, { pages: 1 })
      .rotate() // respect EXIF orientation
      .resize({ width: IMG_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(dest);
  }
  return file;
}

// ---- row normalization ------------------------------------------------------
const stripLabel = (s) => s.replace(/\s*\(.*?\)\s*/g, '').trim();

function parseGvizDate(s) {
  const m = /^Date\((\d+),(\d+),(\d+)/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]), Number(m[3])) : null; // month is 0-based
}

const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
function ageLabel(row, { live }) {
  const ageText = cell(row, 'Age-');
  const dob = parseGvizDate(cell(row, 'DOB-')) ?? (Number.isNaN(Date.parse(ageText)) ? null : new Date(ageText));
  if (dob && live) {
    const days = (Date.now() - dob.getTime()) / 86400000;
    if (days < 0 || days > 730) return null; // implausible -> omit
    const months = Math.floor(days / 30.44);
    if (months < 2) return plural(Math.max(1, Math.round(days / 7)), 'week');
    return plural(months, 'month');
  }
  // Placed pups: only text like "2 Months" carries an honest age.
  if (/month|week/i.test(ageText)) return ageText.toLowerCase();
  if (live && ageText && !dob) return ageText.toLowerCase();
  return null;
}

const warnings = [];
function clean(field, value, id) {
  if (value && BLOCKED.test(value)) {
    warnings.push(`${id}: ${field} "${value}" contains a blocked word; withheld`);
    return null;
  }
  return value || null;
}

function normalize(row) {
  const label = stripLabel(cell(row, 'Breed-'));
  const key = label.toLowerCase();
  const g = cell(row, 'Gender-');
  // "Male and Female" (a litter row) is no single gender.
  const gender = /^female$/i.test(g) ? 'Female' : /^male$/i.test(g) ? 'Male' : null;
  const id = numCell(row, 'ID-') ?? (cell(row, 'ID-') || String(row.rowIndex));
  const sizeNote = cell(row, 'Size-');
  // A named mix of this breed is listed exactly like the purebred; `breedName`
  // and `breedNote` travel to the card and the puppy page so neither ever calls a
  // Malshi a "Maltese".
  const cross = crossBreedOf(label, SITE_BREEDS);
  const isPure = BREED_LABELS.has(key) && !isCross(label);
  return {
    id,
    breedLabel: label,
    isPure,
    isCrossBreed: !!cross,
    isBreed: isPure || !!cross,
    breedName: cross?.name ?? null,
    breedNote: cross?.note ?? null,
    mentionsBreed: MENTIONS.test(label),
    name: clean('name', cell(row, 'Name-'), id),
    color: clean('colour', cell(row, 'Color-'), id),
    gender,
    price: numCell(row, 'Price$-'),
    location: cell(row, 'Location-') || null,
    origin: clean('origin', cell(row, 'Origin-'), id),
    // Miniature-only positioning: blank Size- is Miniature; a Standard is rendered
    // truthfully as Standard (and warned about below).
    size: /standard/i.test(sizeNote) ? 'Standard' : 'Miniature',
    video: /^https?:\/\//.test(cell(row, 'Video-')) ? cell(row, 'Video-') : null,
    calLink: /^https?:\/\//.test(cell(row, 'CalLink-')) ? cell(row, 'CalLink-') : null,
    // Only a tick counts as yes; a blank or a cross is "do not claim".
    hdbApproved: /✔|✓|^yes$/i.test(cell(row, 'HDBApproved-')) ? true : null,
    images: ['Image-', 'Image2-', 'Image3-', 'Image4-', 'Image5-']
      .map((k) => cell(row, k))
      .filter((u) => /^https?:\/\//.test(u)),
    row,
  };
}

// ---- main -------------------------------------------------------------------
const rows = await fetchAllRows();
await mkdir(ASSET_DIR, { recursive: true });

const allPups = rows.map(normalize);
const page1Ids = new Set(allPups.slice(0, AVAILABLE_ROWS).map((p) => String(p.id)));

const unknownLabels = new Map();
for (const p of allPups) {
  if (p.mentionsBreed && !p.isBreed) unknownLabels.set(p.breedLabel, (unknownLabels.get(p.breedLabel) ?? 0) + 1);
}

const breedPups = allPups.filter((p) => p.isBreed);
const crossCount = breedPups.filter((p) => p.isCrossBreed).length;
const pups = breedPups.filter(locationAllowed);
const droppedByLocation = breedPups.length - pups.length;
const page1Breed = breedPups.filter((p) => page1Ids.has(String(p.id)));
const page1Kept = page1Breed.filter(locationAllowed);

const summary = { sold: [], imageErrors: [] };

const toJson = (p, images, { live }) => ({
  id: p.id,
  name: p.name,
  // null on a purebred: the site then uses its own breed name. A mix carries the
  // designer name ("Malshi") and its parents ("Maltese × Shih Tzu").
  breed: p.breedName,
  breedNote: p.breedNote,
  color: p.color,
  gender: p.gender,
  age: ageLabel(p.row, { live }),
  price: p.price,
  image: images[0] ?? null,
  images,
  location: p.location,
  origin: p.origin,
  size: p.size,
  hdbApproved: p.hdbApproved,
  video: p.video,
  bookHref: p.calLink,
});

// Available: page-1 pups of this breed (and its named mixes) in the two locations, minus sold.
const available = [];
const soldTop = [];
for (const p of page1Kept) {
  if (MANUAL_SOLD.has(Number(p.id))) {
    summary.sold.push(`${p.id} (owner-reported)`);
    soldTop.push(p);
    continue;
  }
  const images = [];
  try {
    if (p.images[0] && (await checkOverlaid(p.images[0]))) {
      summary.sold.push(`${p.id} (sold overlay)`);
      soldTop.push(p);
      continue;
    }
    for (const [i, url] of p.images.entries()) images.push(await savePhoto(p.id, i + 1, url));
  } catch (e) {
    summary.imageErrors.push(`${p.id}: ${e.message}`);
  }
  if (p.size === 'Standard') warnings.push(`${p.id}: feed marks this pup Standard; rendered as Standard`);
  available.push(toJson(p, images, { live: true }));
}

// Recently placed: the sold rows still on page 1, then rows below the fold, newest
// first, until MAX_PLACED pups with a clean photo (Image2 preferred: Image1 usually
// carries the overlay; every candidate photo must pass the overlay check).
// Stricter than Curious Tails, which counts every row below the fold: "placed"
// is a claim, so a row needs sold evidence (override, or an overlaid Image1).
// A same-litter sibling that merely sank off page 1 is not shown as placed.
const recentlyPlaced = [];
for (const p of [...soldTop, ...pups.filter((x) => !page1Ids.has(String(x.id)))]) {
  if (recentlyPlaced.length >= MAX_PLACED) break;
  try {
    const sold = MANUAL_SOLD.has(Number(p.id)) || (!!p.images[0] && (await checkOverlaid(p.images[0])));
    if (!sold) continue;
    let chosen = null;
    for (const n of [2, 3, 4, 5, 1]) {
      const url = p.images[n - 1];
      if (url && !(await checkOverlaid(url))) { chosen = [n, url]; break; }
    }
    if (!chosen) continue;
    recentlyPlaced.push(toJson(p, [await savePhoto(p.id, chosen[0], chosen[1])], { live: false }));
  } catch (e) {
    summary.imageErrors.push(`${p.id}: ${e.message}`);
  }
}

// ---- placed archive (plan D1) -------------------------------------------------
// A puppy that leaves the available list is kept: dated the day this sync first
// saw it gone, with the photos it was listed with. Its status is re-read from the
// sheet's own sold evidence on every run:
//   placed    - sold override or sold overlay. Page stays up, noindex, "Found a loving home".
//   withdrawn - no sold evidence. No page; its URL 301s to /puppies/.
//   expired   - left more than 90 days ago. URL 301s, photos pruned.
const today = sgtDate(Date.now());
const listedNow = new Set(available.map((p) => String(p.id)));
const { archived, departures } = recordDepartures({ archive, prevFeed, listedNow, today });

const rowById = new Map(allPups.map((p) => [String(p.id), p]));
const archiveCounts = { placed: 0, withdrawn: 0, expired: 0 };
for (const [id, a] of archived) {
  if (isExpired(a, today)) {
    a.status = 'expired';
    a.image = null;
    a.images = [];
    archiveCounts.expired++;
    continue;
  }
  const row = rowById.get(id);
  const facts = { id, row, manualSold: MANUAL_SOLD, locationAllowed };
  let overlaid;
  if (needsOverlayCheck(facts)) {
    try {
      overlaid = await checkOverlaid(row.images[0]);
    } catch (e) {
      summary.imageErrors.push(`${id} (archive): ${e.message}`);
    }
  }
  const { evidence, status } = classify({ ...facts, overlaid, previous: a.evidence });
  a.evidence = evidence;
  a.status = status;
  // A placed page needs a clean photo: keep the listed ones that still exist,
  // else take a clean one from the row (never the overlay itself).
  if (a.status === 'placed') {
    a.images = (a.images ?? []).filter((f) => existsSync(path.join(ASSET_DIR, f)));
    if (!a.images.length && row) {
      for (const n of [2, 3, 4, 5, 1]) {
        const url = row.images[n - 1];
        if (!url) continue;
        try {
          if (await checkOverlaid(url)) continue;
          a.images = [await savePhoto(row.id, n, url)];
          break;
        } catch (e) {
          summary.imageErrors.push(`${id} (archive photo): ${e.message}`);
        }
      }
    }
    a.image = a.images[0] ?? null;
  }
  archiveCounts[a.status]++;
}

const archiveOut = archiveFile({ archived, available, now: new Date().toISOString() });

// Prune photos no longer referenced. Withdrawn pups keep theirs while in
// retention: a late overlay stamp turns them into placed.
const referenced = new Set([
  ...[...available, ...recentlyPlaced].flatMap((p) => p.images),
  ...archivePhotos(archiveOut.pups),
]);
let pruned = 0;
for (const f of await readdir(ASSET_DIR)) {
  if (f.endsWith('.webp') && !referenced.has(f)) {
    await unlink(path.join(ASSET_DIR, f));
    pruned++;
  }
}

const out = { syncedAt: new Date().toISOString(), available, recentlyPlaced };
await writeFile(DATA_FILE, JSON.stringify(out, null, 2) + '\n');
await writeFile(ARCHIVE_FILE, JSON.stringify(archiveOut, null, 2) + '\n');
await writeFile(VERDICT_FILE, JSON.stringify(verdicts) + '\n');

// ---- report -----------------------------------------------------------------
console.log('\n=== sync summary ===');
console.log(`feed: ${rows.length} rows, ${breedPups.length} ${FEED_CFG.breedName} (${crossCount} of them named mixes)`);
console.log(
  `location filter: kept ${pups.length}, dropped ${droppedByLocation} (${FEED_CFG.locations.join(' / ')} only)` +
    ` | page 1: kept ${page1Kept.length}, dropped ${page1Breed.length - page1Kept.length}`,
);
console.log(`available: ${available.length} (${available.map((p) => `${p.id}${p.name ? ` ${p.name}` : ''}`).join(', ') || 'none'})`);
console.log(`recently placed: ${recentlyPlaced.length}`);
if (summary.sold.length) console.log(`dropped from available (sold): ${summary.sold.join(', ')}`);
if (unknownLabels.size)
  console.log(`unknown breed labels (never rendered): ${[...unknownLabels].map(([l, n]) => `${l} (${n})`).join(', ')}`);
console.log(
  `placed archive: ${archiveCounts.placed} placed, ${archiveCounts.withdrawn} withdrawn, ${archiveCounts.expired} expired` +
    (departures.length ? ` (left the list today: ${departures.join(', ')})` : ''),
);
for (const w of warnings) console.log(`WARNING ${w}`);
if (summary.imageErrors.length) console.log(`image errors:\n  ${summary.imageErrors.join('\n  ')}`);
console.log(`photos pruned: ${pruned}`);
console.log(`wrote ${path.relative(ROOT, DATA_FILE)}`);
