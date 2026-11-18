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
  if (!best) return null;
  const label = exitLabel(best.a);
  return label ? { label, d: best.d } : null;
}

// Noms qui ne disent rien de la rue (« Entrée / Sortie ») et numéro 0 (accès sans numéro sur place, v202) :
// on ne les affiche pas, et sans nom ni numéro la sortie la plus proche n'est pas dite du tout.
const GENERIC = /^(entr[ée]e|sortie|acc[eè]s)(\s*\/\s*(entr[ée]e|sortie))?$/i;

/** « Sortie 7, pl. de la Bastille », « Sortie, place des Abbesses », « Sortie 3 », ou '' si rien d'utile. */
export function exitLabel(a) {
  const num = a.s && a.s !== '0' ? a.s : '';
  const name = GENERIC.test(a.n.trim()) ? '' : a.n;
  if (!num && !name) return '';
  return num ? (name ? `Sortie ${num}, ${name}` : `Sortie ${num}`) : `Sortie, ${name}`;
}
