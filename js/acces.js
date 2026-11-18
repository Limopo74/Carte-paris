// La sortie de métro la plus proche d'un lieu (v199) : « Référentiel des arrêts : Accès », Île-de-France Mobilités,
// Licence Ouverte 2.0. Le robot ne garde que les accès RATP (tous ont un nom et un numéro), dans data/acces.json
// (tools/maj-acces.py). Le fichier ne dit pas à quelle station appartient un accès : on prend ceux à moins de
// ACCESS_NEAR_STATION mètres de la station, et le plus proche du lieu. Une sortie fermée pour travaux n'est pas connue.
import { distanceM } from './geo.js';

export const ACCESS_NEAR_STATION = 250;

/** Le fichier du robot, nettoyé : [{ n: nom, s: numéro, lat, lng }]. */
export function cleanAcces(json) {
  return (Array.isArray(json?.items) ? json.items : []).filter((a) => a && typeof a.n === 'string' && a.n.trim()
    && (typeof a.s === 'string' || Number.isFinite(a.s)) && String(a.s).trim() && Number.isFinite(a.lat) && Number.isFinite(a.lng))
    .map((a) => ({ n: a.n.trim().slice(0, 60), s: String(a.s).trim().slice(0, 6), lat: a.lat, lng: a.lng }));
}

/** La sortie de `station` la plus proche de `place` : { label: « Sortie 7, pl. de la Bastille », d: mètres jusqu'au lieu }, ou null. */
export function exitFor(acces, station, place) {
  if (!station || !place || !acces?.length) return null;
  let best = null;
  for (const a of acces) {
    if (distanceM(station, a) > ACCESS_NEAR_STATION) continue;
    const d = distanceM(place, a);
    if (!best || d < best.d) best = { a, d };
  }
  return best ? { label: `Sortie ${best.a.s}, ${best.a.n}`, d: best.d } : null;
}
