// Pure pieces of the placed archive (src/data/placed-archive.json), used by
// scripts/sync-puppies.mjs. Ported from Curious Tails scripts/lib/placed-archive.mjs
// for a single-breed site: no per-breed buckets, and a 90-day retention window
// (plan D1, 2026-10-14) instead of CT's 120. The sync owns the network and the
// photos; everything here is plain data in, plain data out.

// A placed puppy's page stays up (noindex) this long after it leaves the list;
// after that its URL 301s to /puppies/ (scripts/lib/puppy-redirects.mjs).
export const RETENTION_DAYS = 90;

// Calendar date in Singapore, where the shop is: a 06:30 UTC sync is 14:30 SGT.
export const sgtDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// What the archive keeps of a listed puppy: never its price or booking link
// (a sold page shows neither).
export const snapshot = (p) => ({
  id: p.id,
  name: p.name ?? null,
  // A named mix keeps its name and parents on the placed page too; null = purebred.
  breed: p.breed ?? null,
  breedNote: p.breedNote ?? null,
  color: p.color ?? null,
  gender: p.gender ?? null,
  age: p.age ?? null,
  image: p.image ?? null,
  images: p.images ?? (p.image ? [p.image] : []),
  location: p.location ?? null,
  origin: p.origin ?? null,
  size: p.size ?? null,
  hdbApproved: p.hdbApproved ?? null,
});

/**
 * Merge this run's listing into the archive. Departures are diffed against BOTH
 * the previous available-puppies.json and the archive's own `lastSync.listed`,
 * so a puppy hand-removed from available-puppies.json between syncs is still
 * seen leaving. A puppy listed again leaves the archive.
 * @returns {{ archived: Map<string, object>, departures: string[] }}
 */
export function recordDepartures({ archive, prevFeed, listedNow, today }) {
  const archived = new Map((archive?.pups ?? []).map((p) => [String(p.id), { ...p }]));
  for (const id of listedNow) archived.delete(id);

  const previouslyListed = [
    ...(archive?.lastSync?.listed ?? []).map((p) => ({ p, at: archive.lastSync.at })),
    ...(prevFeed?.available ?? []).map((p) => ({ p, at: prevFeed.syncedAt })),
  ];
  const departures = [];
  for (const { p, at } of previouslyListed) {
    const id = String(p.id);
    if (listedNow.has(id) || archived.has(id)) continue;
    archived.set(id, {
      ...snapshot(p),
      status: null,
      placedAt: today,
      lastListed: at ? sgtDate(at) : today,
      source: 'sync',
    });
    departures.push(id);
  }
  return { archived, departures };
}

/** True once an entry has outlived the retention window (or already did). */
export const isExpired = (entry, today) =>
  entry.status === 'expired' || daysBetween(entry.placedAt, today) > RETENTION_DAYS;

/**
 * The evidence for one archived puppy, from the sheet as it stands today.
 * `overlaid` is the overlay verdict for the row's current Image1 (true/false),
 * or undefined when the check could not run - then the last verdict stands.
 *   placed    <- sold-override | sold-overlay
 *   withdrawn <- not-in-sheet | out-of-area | no-photo | no-overlay | check-failed
 */
export function classify({ id, row, manualSold, locationAllowed, overlaid, previous }) {
  let evidence;
  if (manualSold.has(Number(id))) evidence = 'sold-override';
  else if (!row) evidence = 'not-in-sheet';
  else if (!locationAllowed(row)) evidence = 'out-of-area';
  else if (!row.images?.[0]) evidence = 'no-photo';
  else if (overlaid === undefined) evidence = previous ?? 'check-failed';
  else evidence = overlaid ? 'sold-overlay' : 'no-overlay';
  const status = evidence === 'sold-override' || evidence === 'sold-overlay' ? 'placed' : 'withdrawn';
  return { evidence, status };
}

/** Whether classify() needs an overlay verdict for this row at all. */
export const needsOverlayCheck = ({ id, row, manualSold, locationAllowed }) =>
  !manualSold.has(Number(id)) && !!row && locationAllowed(row) && !!row.images?.[0];

/** The file the sync writes: newest departures first, plus this run's listing. */
export function archiveFile({ archived, available, now }) {
  return {
    _note:
      'Written by scripts/sync-puppies.mjs, never rebuilt from scratch: puppies that left the available list. status: placed (sold evidence; page stays up, noindex, "Found a loving home"), withdrawn (no evidence; no page, URL 301s to /puppies/), expired (past the 90-day retention; URL 301s). placedAt = the day the sync first saw it gone (SGT); lastListed = the last day it was listed. Do not hand-edit; to mark a sale, add the id to sold-overrides.json and re-run the sync.',
    lastSync: { at: now, listed: available.map((p) => snapshot(p)) },
    pups: [...archived.values()].sort(
      (a, b) => b.placedAt.localeCompare(a.placedAt) || Number(b.id) - Number(a.id),
    ),
  };
}

/** Photos the archive still needs: everything not expired (a withdrawn pup can still turn placed). */
export const archivePhotos = (pups) =>
  pups
    .filter((a) => a.status !== 'expired')
    .flatMap((a) => [a.image, ...(a.images ?? [])])
    .filter(Boolean);
