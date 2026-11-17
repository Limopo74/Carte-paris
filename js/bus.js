// Bus (v148) : arrêts de bus de Paris et de la petite couronne, avec leurs lignes (data/bus.json, refait chaque mois
// par le robot avec tools/maj-bus.py). Tout se calcule sur le téléphone : rien n'est envoyé. Ni horaires ni sens.
import { distanceM } from './geo.js';

/** Un arrêt du fichier : [lat, lng, nom, insee, [indices des lignes]]. Sa clé : « nom|insee ». */
export const busKey = (s) => `${s[2]}|${s[3]}`;
const pos = (s) => ({ lat: s[0], lng: s[1] });
/** Texte sans accents ni majuscules, pour chercher. */
export const fold = (t) => String(t ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
/** Lignes dans l'ordre : 2, 20, 38, puis N01… */
export const lineOrder = (a, b) => {
  const na = /^\d/.test(a); const nb = /^\d/.test(b);
  if (na !== nb) return na ? -1 : 1;
  return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b, 'fr');
};
/** Où se trouve l'arrêt : « 15e » à Paris, sinon le nom de la commune (ou rien). */
export function busPlace(data, s) {
  const insee = s[3];
  if (insee.startsWith('751')) { const n = Number(insee.slice(3)); return n === 1 ? '1er' : `${n}e`; }
  return data?.communes?.[insee] ?? '';
}
/** Les lignes d'un arrêt, en clair. */
export const busLines = (data, s) => s[4].map((i) => data.lines[i]).filter(Boolean).sort(lineOrder);
/** L'arrêt dont la clé est `key`, ou null. */
export const findBusStop = (data, key) => (data?.stops ?? []).find((s) => busKey(s) === key) ?? null;

/** Arrêts à moins de `maxM` mètres de `here`, du plus proche : [{ stop, d }]. */
export function busStopsNear(data, here, maxM = 500, max = 20) {
  const out = [];
  for (const s of data?.stops ?? []) { const d = distanceM(here, pos(s)); if (d <= maxM) out.push({ stop: s, d }); }
  return out.sort((a, b) => a.d - b.d).slice(0, max);
}

/** Chercher un arrêt par son nom (sans accents) ; vide : les plus proches de `near`. Du plus proche au plus loin. */
export function searchBusStops(data, query, near, max = 15) {
  const q = fold(query).trim();
  const list = (data?.stops ?? []).filter((s) => !q || fold(s[2]).includes(q));
  const withD = list.map((s) => ({ stop: s, d: near ? distanceM(near, pos(s)) : 0 }));
  return withD.sort((a, b) => a.d - b.d || a.stop[2].localeCompare(b.stop[2], 'fr')).slice(0, max);
}

/**
 * Rentrer en bus : les arrêts à moins de `maxM` de `here` où passe une ligne qui va jusqu'à l'arrêt maison.
 * Pour chaque ligne, seul l'arrêt le plus proche compte ; les lignes d'un même arrêt sont réunies.
 * [{ stop, d, lines: ['38', …] }], du plus proche, `max` au plus. null si l'arrêt maison n'existe plus.
 */
export function busHome(data, here, homeKey, maxM = 600, max = 3) {
  const home = findBusStop(data, homeKey);
  if (!home) return null;
  const want = new Set(home[4]);
  const best = new Map();
  for (const s of data.stops) {
    if (busKey(s) === homeKey) continue;
    const d = distanceM(here, pos(s));
    if (d > maxM) continue;
    for (const li of s[4]) if (want.has(li) && (!best.has(li) || d < best.get(li).d)) best.set(li, { stop: s, d });
  }
  const byStop = new Map();
  for (const [li, { stop, d }] of best) {
    const k = busKey(stop);
    const g = byStop.get(k) ?? { stop, d, lines: [] };
    g.lines.push(data.lines[li]);
    byStop.set(k, g);
  }
  return [...byStop.values()].map((g) => ({ ...g, lines: g.lines.sort(lineOrder) })).sort((a, b) => a.d - b.d).slice(0, max);
}
