// La sortie de métro la plus proche d'un lieu (v199) : « Référentiel des arrêts : Accès », Île-de-France Mobilités,
// Licence Ouverte 2.0. Le robot ne garde que les accès RATP (tous ont un nom et un numéro), dans data/acces.json
// (tools/maj-acces.py). Le fichier ne dit pas à quelle station appartient un accès : on prend ceux à moins de
// ACCESS_NEAR_STATION mètres de la station et plus près d'elle que de toute autre (v210), et le plus proche du lieu. Une sortie fermée pour travaux n'est pas connue.
// v395 : chaque accès dit s'il est une entrée (e) et une sortie (x). Une entrée seule n'est jamais annoncée comme sortie,
// une sortie seule jamais comme entrée ; un fichier d'avant la v395 (sans e ni x) ne donne aucune entrée (137 sorties seules).
import { distanceM } from './geo.js';

export const ACCESS_NEAR_STATION = 250;

const bit = (v) => (v === 1 || v === true ? true : v === 0 || v === false ? false : undefined);

/** Le fichier du robot, nettoyé : [{ n: nom, s: numéro, lat, lng, e?: entrée, x?: sortie }] (e et x absents dans un fichier d'avant la v395). */
export function cleanAcces(json) {
  return (Array.isArray(json?.items) ? json.items : []).filter((a) => a && typeof a.n === 'string' && a.n.trim()
    && (typeof a.s === 'string' || Number.isFinite(a.s)) && String(a.s).trim() && Number.isFinite(a.lat) && Number.isFinite(a.lng))
    .map((a) => {
      const o = { n: a.n.trim().slice(0, 60), s: String(a.s).trim().slice(0, 6), lat: a.lat, lng: a.lng };
      const e = bit(a.e); const x = bit(a.x);
      if (e !== undefined) o.e = e;
      if (x !== undefined) o.x = x;
      return o;
    });
}

/** L'accès de `station` le plus proche de `pt`, parmi ceux que `keep` garde : { a, d } ou null (v210 : jamais l'accès d'une autre station). */
function nearestAccess(acces, station, pt, stations, keep) {
  if (!station || !pt || !acces?.length) return null;
  let best = null;
  for (const a of acces) {
    if (!keep(a)) continue;
    const ds = distanceM(station, a);
    if (ds > ACCESS_NEAR_STATION) continue;
    // v210 : une sortie plus près d'une autre station est sans doute la sienne (même numéro, autre rue) : on ne la compte pas
    if (stations.some((o) => o !== station && distanceM(o, a) < ds)) continue;
    const d = distanceM(pt, a);
    if (!best || d < best.d) best = { a, d };
  }
  return best;
}

/** La sortie de `station` la plus proche de `place` : { label: « Sortie 7, pl. de la Bastille », d: mètres jusqu'au lieu }, ou null. */
export function exitFor(acces, station, place, stations = []) {
  const best = nearestAccess(acces, station, place, stations, (a) => a.x !== false); // v395 : jamais une entrée seule
  if (!best) return null;
  const label = exitLabel(best.a);
  return label ? { label, d: best.d } : null;
}

/** v395 : l'entrée de `station` la plus proche de `from` (ma position) : { label: « Entrée 5, r. de la Roquette », d, lat, lng }, ou null.
 * Seulement un accès que le fichier dit « entrée » : sans cette marque (fichier d'avant la v395), rien. */
export function entryFor(acces, station, from, stations = []) {
  const best = nearestAccess(acces, station, from, stations, (a) => a.e === true);
  if (!best) return null;
  const label = exitLabel(best.a).replace(/^Sortie/, 'Entrée');
  return label ? { label, d: best.d, lat: best.a.lat, lng: best.a.lng } : null;
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
