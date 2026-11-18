// Gares de RER et arrêts de tramway (v200) : « Emplacement des gares IDF », Île-de-France Mobilités, ODbL ; rangés dans
// data/gares.json par le robot (tools/maj-gares.py). Le métro reste dans data/stations.json. Ni horaires ni sens.
import { distanceM } from './geo.js';

/** Le fichier du robot, nettoyé : [{ n, m: 'R' | 'T', l: [lignes], lat, lng }]. */
export function cleanGares(json) {
  return (Array.isArray(json?.stations) ? json.stations : []).filter((s) => s && typeof s.n === 'string' && s.n.trim()
    && (s.m === 'R' || s.m === 'T') && Array.isArray(s.l) && s.l.length && s.l.every((x) => typeof x === 'string' && x)
    && Number.isFinite(s.lat) && Number.isFinite(s.lng)).map((s) => ({ n: s.n.slice(0, 60), m: s.m, l: s.l.slice(0, 6), lat: s.lat, lng: s.lng }));
}

/** « RER B », « Tram T3a, T3b ». */
export const gareLines = (s) => (s.m === 'R' ? `RER ${s.l.join(', ')}` : `Tram ${s.l.map((x) => `T${x}`).join(', ')}`);

/** Les gares à `maxM` mètres au plus de `from`, de la plus proche : [{ station, d }], `max` au plus. */
export function garesNear(list, from, maxM = 1500, max = 3) {
  if (!from || !list?.length) return [];
  return list.map((station) => ({ station, d: distanceM(from, station) })).filter((x) => x.d <= maxM).sort((a, b) => a.d - b.d).slice(0, max);
}
