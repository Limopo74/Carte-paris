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
    /^pd-[a-f0-9]{16}$/.test(id) && ['open', 'closed', 'cleared'].includes(mark?.status)
      && Number.isFinite(mark.at) && mark.at > 0));
}

export function coffeeByStatus(items, marks, scope = 'current') {
  if (scope === 'all') return items;
  return items.filter((place) => (marks[place.id]?.status === 'closed') === (scope === 'closed'));
}

export function readCoffeePrefs(value) {
  return {
    on: value?.on === true,
    arr: /^(?:[1-9]|1[0-9]|20)$/.test(value?.arr) ? String(value.arr) : '',
    quarter: typeof value?.quarter === 'string' && /^751\d{4}$/.test(value.quarter) ? value.quarter : '',
  };
}

export function readCoffeeBackup(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  let catalogue = null;
  if (value.catalogue != null) {
    const places = readCoffeeShops(value.catalogue);
    if (!places.length || places.length !== value.catalogue.places.length) throw new Error('Référentiel Coffee shops invalide.');
    const { version, date } = value.catalogue;
    catalogue = { version: Number.isSafeInteger(version) && version >= 0 ? version : 0,
      date: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '', places };
  }
  const marks = readCoffeeMarks(value.marks);
  const prefs = readCoffeePrefs(value.prefs);
  return catalogue || Object.keys(marks).length || prefs.on || prefs.arr || prefs.quarter ? { catalogue, marks, prefs } : null;
}

export function mergeCoffeeBackups(local, incoming) {
  const marks = { ...local?.marks };
  for (const [id, mark] of Object.entries(incoming.marks)) {
    if (!marks[id] || marks[id].at < mark.at) marks[id] = mark;
  }
  const old = local?.catalogue;
  const next = incoming.catalogue;
  const replace = next && (!old || next.version > old.version || (next.version === old.version && next.date > old.date));
  return { catalogue: replace ? next : old ?? null, marks, prefs: incoming.prefs };
}
