// Passages couverts (v168) : une liste fixe, vérifiée, dans l'appli (data/passages.json). Tri sur le téléphone, rien n'est envoyé.
import { decodeTrace, distanceToTrace } from './circuits.js';
import { distanceM, minutesToMeters } from './geo.js';
import { fold } from './search.js';
import { inBox } from './calques.js';

/** Zoom à partir duquel le trait d'une entrée à l'autre remplace le pictogramme. */
export const ARCADE_LINE_ZOOM = 16;
/** Curiosités : passages à moins de 15 min. Pluie : à moins de 10 min. */
export const ARCADE_NEAR_MIN = 15;
export const ARCADE_RAIN_MIN = 10;
/** Message commun : aucun horaire précis n'est donné, ils changent d'un passage à l'autre. */
export const ARCADE_HOURS = 'Les passages ferment en général la nuit, parfois aussi le dimanche : les horaires varient d\'un passage à l\'autre.';

const inParis = (lat, lng) => lat > 48.80 && lat < 48.92 && lng > 2.22 && lng < 2.48;
const txt = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

/** Ne garde que les passages bien formés ; un trait illisible est retiré (le passage garde son pictogramme). */
export function cleanArcades(json) {
  const items = Array.isArray(json?.items) ? json.items : [];
  const seen = new Set();
  const out = [];
  for (const x of items) {
    const id = txt(x?.id, 40);
    if (!/^[a-z0-9-]+$/.test(id) || seen.has(id)) continue;
    if (!Number.isFinite(x.lat) || !Number.isFinite(x.lng) || !inParis(x.lat, x.lng)) continue;
    const nom = txt(x.nom, 80);
    if (!nom) continue;
    const s = /^https:\/\/[\w.-]+\//.test(x.s ?? '') ? x.s : '';
    const trace = typeof x.trace === 'string' ? decodeTrace(x.trace) : null;
    seen.add(id);
    out.push({ id, nom, lat: x.lat, lng: x.lng, rues: txt(x.rues, 160), t: txt(x.t, 400), s, ...(trace && trace.length >= 2 ? { trace } : {}) });
  }
  return out;
}

/** Les passages à moins de max minutes à pied, du plus proche : [{ a, d }]. La distance va jusqu'au trait quand il existe. */
export function arcadesNear(list, from, maxMin) {
  if (!from || !Array.isArray(list)) return [];
  const max = minutesToMeters(maxMin);
  return list.map((a) => ({ a, d: a.trace ? distanceToTrace(from, a.trace) : distanceM(from, a) }))
    .filter((x) => x.d <= max).sort((x, y) => x.d - y.d);
}

/** Page d'un circuit : les passages à moins de 5 min de son tracé. */
export const ARCADE_TRACE_MIN = 5;
/** Les passages à moins de maxM du tracé d'un circuit, du plus proche : [{ a, d }]. */
export const arcadesNearTrace = (list, trace, maxM) => (Array.isArray(list) && Array.isArray(trace) && trace.length
  ? list.map((a) => ({ a, d: distanceToTrace(a, trace) })).filter((x) => x.d <= maxM).sort((x, y) => x.d - y.d) : []);

/** v237 : à quelle distance un de mes lieux peut être « ce passage » (même seuil que l'alerte de doublon du formulaire). */
export const ARCADE_MINE_M = 60;
/** v237 : le passage est-il dans mes lieux ? Un de MES lieux (pas celui d'un proche) dont le nom contient celui du passage,
 * ou l'inverse (« Choiseul » pour « Passage Choiseul »), à moins de 60 m ; le plus proche. Aucune donnée en plus : un lieu
 * renommé autrement n'est plus reconnu, et la page garde alors « Ajouter » (pas d'info plutôt qu'une info fausse). */
const core = (s) => s.split(' ').filter((w) => !/^(passage|galerie|du|des|de|la|le|l|d)$/.test(w)).join(' ');
export function myArcadePlace(points, a) {
  const n = fold(a?.nom);
  if (!n || !Array.isArray(points)) return null;
  let best = null;
  for (const p of points) {
    if (!p || p.owner || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const pn = fold(p.name);
    if (!core(pn) || !(pn === n || pn.includes(n) || n.includes(pn))) continue; // « Passage » seul ne suffit pas
    const d = distanceM(p, a);
    if (d <= ARCADE_MINE_M && (!best || d < best.d)) best = { p, d };
  }
  return best?.p ?? null;
}

/** v275 (mon choix 1A du 20 nov.) : les 12 passages tiennent dans un petit coin de Paris. Allumés alors qu'aucun n'est dans
 * le cadre de la carte, l'étiquette sous la barre du haut le dit, et un appui les montre tous ; la carte ne bouge pas seule. */
export function arcadeNote(list, box) {
  if (!Array.isArray(list) || !list.length || !box || inBox(list, box, 1).length) return null;
  return { text: `Aucun passage ici · Voir les ${list.length}`, act: 'arcades' };
}
