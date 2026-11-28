import { distanceM } from './geo.js';
import { foldName } from './store.js';
import { safeLink } from './events.js';

export function readCoffeeShops(data) {
  if (!Array.isArray(data?.places)) throw new Error('Référentiel Coffee shops invalide.');
  const seen = new Set();
  return data.places.flatMap((p) => {
    if (!p || typeof p.id !== 'string' || !/^pd-[a-f0-9]{16}$/.test(p.id) || seen.has(p.id)
      || typeof p.name !== 'string' || !p.name.trim() || typeof p.address !== 'string' || !p.address.trim()
      || !Number.isInteger(p.arr) || p.arr < 1 || p.arr > 20 || typeof p.quarter !== 'string'
      || !/^751\d{4}$/.test(p.quarterId) || !(p.lat > 48.80 && p.lat < 48.92)
      || !(p.lng > 2.22 && p.lng < 2.48) || p.closed === true || p.uncertain === true) return [];
    seen.add(p.id);
    return [{ id: p.id, name: p.name, address: p.address, arr: p.arr, quarter: p.quarter, quarterId: p.quarterId,
      lat: p.lat, lng: p.lng, openingVerified: p.openingVerified === true,
      hours: typeof p.hours === 'string' && safeLink(p.hoursSource) ? p.hours : '',
      url: safeLink(p.url), hoursSource: safeLink(p.hoursSource) }];
  });
}

export function filterCoffeeShops(items, { arr = '', quarter = '', query = '', from = null } = {}) {
  const words = foldName(query).trim().split(/\s+/).filter(Boolean);
  const hits = items.filter((p) => (!arr || String(p.arr) === String(arr)) && (!quarter || p.quarterId === quarter)
    && (words.length === 0 || words.every((w) => foldName(p.name + ' ' + p.address).includes(w))));
  return from ? hits.map((p) => ({ ...p, d: distanceM(from, p) })).sort((a, b) => a.d - b.d || a.id.localeCompare(b.id)) : hits;
}

export function coffeeQuarters(items, arr) {
  const districts = new Map(filterCoffeeShops(items, { arr }).map((p) => [p.quarterId, p.quarter]));
  return [...districts].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
}

export function readCoffeeMarks(value) {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([id, mark]) =>
    /^pd-[a-f0-9]{16}$/.test(id) && ['open', 'closed'].includes(mark?.status)
      && Number.isFinite(mark.at) && mark.at > 0));
}

export function coffeeByStatus(items, marks, scope = 'current') {
  if (scope === 'all') return items;
  return items.filter((place) => (marks[place.id]?.status === 'closed') === (scope === 'closed'));
}
