// Sync this site's breed from the owner's overseas (Australia) SpreadSimple sheet
// (overseas.spread.name) into src/data/overseas-puppies.json and
// src/assets/overseas/*.webp. Re-runnable: `npm run sync:overseas`.
//
// Ported from Curious Tails scripts/sync-overseas.mjs, narrowed to ONE breed:
// only rows whose Breed- label (parens stripped, lowercased) is in
// scripts/puppy-feed.json `overseasLabels` are kept. Crosses (" x ", "mix", "/")
// are dropped.
//
// These are RESERVATION-ONLY imports: the puppy is in Australia now; the buyer
// pays a 50% deposit to begin the import and the balance before the puppy flies
// to Singapore. MarkUpPrice- is the all-in SGD price; 50%Price- the deposit.
// The site shows them ONLY when no local Balestier puppy of the breed is listed,
// and always in their own section (never mixed into "available").
//
// Photos: source hosts 403 hotlinks, so fetch through the weserv.nl proxy. A pup
// without a fetchable photo is hidden (CT owner decision 2026-09-30). No prune:
// a transient fetch failure must not delete a committed photo.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'assets', 'overseas');
const DATA = path.join(ROOT, 'src', 'data', 'overseas-puppies.json');
const CFG = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'puppy-feed.json'), 'utf8'));
const LABELS = new Set(CFG.overseasLabels.map((l) => l.toLowerCase()));

const SHEET = '9AEgTOyw1JJaYXhf-5QzWUNwSD3qk-Q4X49LSocqhHWPhhEvHD4RS0ukcgrYJm7mXp0z';
const OPTIONS =
  'eyJyb3dzTGltaXQiOjUwMDAsImRlYWxUeXBlIjoiYXBwc3VtbyIsImR5bmFtaWNEYXRhIjp7InNoZWV0SGFzaCI6IjIwOTU3NzEyMDYiLCJTQ1BUYWJsZUxhdGVzdFVwZGF0ZVRpbWVzdGFtcCI6MTc5MDE1MTMwODQ1Mn0sInNlYXJjaCI6eyJlbmFibGVkIjp0cnVlLCJjb2x1bW5zIjpbIkJyZWVkLSIsIkFnZS0iLCJEYXRlb2ZCaXJ0aC0iLCJHZW5kZXItIiwiUHJpY2UtIiwiSW1hZ2VVUkwtIiwiTGlzdGluZ1VSTC0iLCJXZWJzaXRlLSIsIk1hcmtVcFByaWNlLSIsIjUwJVByaWNlLSIsIk5vdGVzLSJdfSwic29ydGluZyI6eyJlbmFibGVkIjpmYWxzZSwic2h1ZmZsZSI6ZmFsc2V9LCJwYWdpbmF0aW9uIjp7ImVuYWJsZWQiOnRydWUsIml0ZW1zUGVyUGFnZSI6NDB9LCJmaWx0ZXJzIjp7ImVuYWJsZWQiOnRydWUsInZhbHVlcyI6W3siaWQiOiJCcmVlZC0iLCJ0eXBlIjoibXVsdGlwbGUifSx7ImlkIjoiUHJpY2UtIiwidHlwZSI6Im11bHRpcGxlIn1dfSwibWFwVmlldyI6eyJlbmFibGVkIjpmYWxzZSwiaWQiOm51bGwsIm1hcmtlclR5cGUiOiJwaW4iLCJpbWFnZUNvbElkIjoiIn0sImNhbGVuZGFyVmlldyI6eyJlbmFibGVkIjpmYWxzZSwic3RhcnREYXRlQ29sSWQiOm51bGwsInRpdGxlQ29sSWQiOiJCcmVlZC0ifX0=';

// Hard word block (CLAUDE.md). A feed string carrying one is withheld.
const BLOCKED = /pedigree|\bdna\b|malay/i;

const cell = (r, k) => { const c = r.cells?.[k]; return c && c.value != null ? String(c.value).trim() : ''; };
const num = (r, k) => { const c = r.cells?.[k]; return c && typeof c.value === 'number' ? c.value : (parseFloat(cell(r, k).replace(/[^0-9.]/g, '')) || null); };
const stripParens = (s) => s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
const isCross = (s) => /\sx\s|\bmix|\//i.test(s);

function monthsFromDob(s) {
  const m = /^Date\((\d+),(\d+),(\d+)/.exec(s);
  if (!m) return null;
  const days = (Date.now() - new Date(Number(m[1]), Number(m[2]), Number(m[3])).getTime()) / 86400000;
  return days < 0 || days > 900 ? null : days / 30.44;
}
const ageLabel = (months) =>
  months == null ? null : months < 2 ? `${Math.max(1, Math.round((months * 30.44) / 7))} weeks` : `${Math.floor(months)} months`;

async function fetchImageBytes(url) {
  const proxy = `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=800&output=webp&q=80`;
  for (const u of [proxy, proxy, proxy, url]) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 1500) return buf;
      }
    } catch { /* try next */ }
    await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}
async function savePhoto(id, url) {
  if (!/^https?:\/\//.test(url)) return null;
  const file = `${id}.webp`;
  const dest = path.join(OUT, file);
  if (existsSync(dest)) return file;
  const buf = await fetchImageBytes(url);
  if (!buf) return null;
  try {
    await sharp(buf, { pages: 1 }).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
    return file;
  } catch { return null; }
}

const rows = [];
let total = Infinity;
for (let page = 1; rows.length < total; page++) {
  const q = Buffer.from(JSON.stringify({ paginate: { currentPage: page } })).toString('base64');
  const url = `https://spread.name/sheet/${SHEET}?query=${encodeURIComponent(q)}&options=${encodeURIComponent(OPTIONS)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sg-breed-site sync)' } });
  if (!res.ok) throw new Error('overseas feed HTTP ' + res.status);
  const json = await res.json();
  const batch = json.table?.rows ?? [];
  total = json.totalRows ?? batch.length;
  if (batch.length === 0) break;
  rows.push(...batch);
  if (batch.length < 40) break;
  await new Promise((r) => setTimeout(r, 300));
}

await mkdir(OUT, { recursive: true });
const hash = (u) => createHash('sha1').update(u).digest('hex').slice(0, 8);
const pups = [];
// One listing = one advertisement, even when the sheet lists a whole litter on
// separate rows (the same ListingURL repeated per puppy). Rendering one card per
// row showed the same photo twice under the same id, so keep the first row.
const seenIds = new Set();
for (const r of rows) {
  const label = stripParens(cell(r, 'Breed-'));
  if (!label || isCross(label) || !LABELS.has(label.toLowerCase())) continue;
  if (BLOCKED.test(cell(r, 'Notes-'))) continue;
  const price = num(r, 'MarkUpPrice-');
  const g = cell(r, 'Gender-');
  const id = `os-${hash(cell(r, 'ListingURL-') || label + price)}`;
  if (seenIds.has(id)) continue;
  seenIds.add(id);
  const months = monthsFromDob(cell(r, 'DateofBirth-'));
  const image = await savePhoto(id, cell(r, 'ImageURL-'));
  if (!image) continue;
  pups.push({
    id,
    listingId: cell(r, 'PuppyID-') || cell(r, 'ID-') || null,
    breedLabel: label,
    gender: /female/i.test(g) ? 'Female' : /^male/i.test(g) ? 'Male' : null,
    age: ageLabel(months) || cell(r, 'Age-') || null,
    canFly: months != null ? months >= 3 : null,
    price,
    deposit: num(r, '50%Price-'),
    image,
  });
}

await writeFile(DATA, JSON.stringify({ syncedAt: new Date().toISOString(), pups }, null, 2) + '\n');
console.log(`overseas: ${rows.length} rows, kept ${pups.length} ${CFG.breedName} (with photo)`);
