// Jardins publics (v261) : les contours des squares, jardins, parcs et bois de la Ville de Paris, pour les dessiner sur la carte.
// - data/jardins.json : refait par le robot (tools/maj-jardins.py) à partir du jeu « Îlots de fraîcheur – Espaces verts frais »
//   (Ville de Paris, licence ODbL) : contours simplifiés au mètre, rangés dans l'appli ; aucune position n'est envoyée.
// - Les horaires, eux, viennent de la copie du même jeu que l'appli charge déjà une fois par jour (Fontaine et WC) :
//   ils changent avec les saisons, le robot ne passe qu'une fois par mois. Le lien se fait par l'identifiant du jeu.
import { distanceM } from './geo.js';
import { openState, minutesLeft } from './hours.js';

/** Les jardins se dessinent à partir du niveau quartier, comme les autres calques (LAYER_ZOOM de calques.js). */
export const JARDIN_ZOOM = 15;
/** « Grand jardin » (bandeau « Maintenant », mon choix 3B) : 4 hectares au moins, calculés par le robot sur le contour. */
export const BIG_M2 = 40000;
/** Le bandeau parle d'un grand jardin quand le bord est à moins de 200 m (environ 3 min à pied). */
export const NEAR_M = 200;
/** Rafales (km/h) à partir desquelles aucun jardin n'est dit ouvert : la Ville de Paris a fermé tous ses jardins pour des rafales
 * annoncées de 70 à 80 km/h (22 décembre 2024, 25 mars 2026) ; elle ne publie pas de seuil, on garde une marge. */
export const WIND_GUST = 60;
/** Pas de grand jardin dans le bandeau s'il ferme dans moins de 20 min : le temps d'y entrer et de s'asseoir. */
export const CLOSE_MARGIN = 20;

const KINDS = { j: 'Jardin public', e: 'Jardin public', b: 'Bois' };
const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'à', 'au', 'aux', 'en', 'sur', 'dit', 'dite']);

/** « SQUARE DU TEMPLE » → « Square du Temple » ; « JARDIN DE L'HOTEL SALE - LEONOR FINI » → « Jardin de l'Hotel Sale - Leonor Fini ».
 * Les accents absents de la source ne sont pas devinés. Un nom déjà en minuscules (« Parc de Belleville ») reste tel quel. */
export function jardinName(nom) {
  const s = String(nom ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s !== s.toUpperCase()) return s;
  let first = true;
  return s.toLowerCase().replace(/[\p{L}\p{N}]+/gu, (w, i) => {
    const after = s[i - 1] === "'" || s[i - 1] === '’';
    const keep = !first && (SMALL.has(w) || (after && w.length <= 2));
    first = false;
    if (keep) return w;
    if ((w === 'l' || w === 'd') && /['’]/.test(s[i + 1] ?? '')) return w; // « l' », « d' » restent en minuscules
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
}

const okPt = (p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;

/**
 * data/jardins.json nettoyé : [{ id, name, kind, lat, lng, rings: [[[lat, lng], …], …], big }].
 * Un anneau de moins de 3 points est écarté ; un jardin sans anneau aussi.
 */
export function cleanJardins(json) {
  const out = [];
  for (const x of Array.isArray(json?.items) ? json.items : []) {
    const rings = (Array.isArray(x?.s) ? x.s : []).map((r) => (Array.isArray(r) ? r.filter(okPt) : [])).filter((r) => r.length >= 3);
    if (!rings.length || !okPt(x?.c) || typeof x?.id !== 'string') continue;
    const name = jardinName(x.n);
    if (!name) continue;
    out.push({ id: x.id.slice(0, 20), name, kind: KINDS[x.t] ? x.t : 'j', lat: x.c[0], lng: x.c[1], rings, big: x.big === 1 });
  }
  return out;
}

/** Ce que dit le surtitre de sa page : « Jardin public » ou « Bois ». */
export const jardinKind = (j) => KINDS[j?.kind] ?? KINDS.j;

/** Dans le cadre { s, w, n, e } (au moins un point du contour dedans, ou le cadre dans le jardin). */
export function jardinsInBox(list, box) {
  return (list ?? []).filter((j) => j.rings.some((r) => r.some(([la, ln]) => la >= box.s && la <= box.n && ln >= box.w && ln <= box.e))
    || inRings({ lat: (box.s + box.n) / 2, lng: (box.w + box.e) / 2 }, j.rings));
}

/** Le point est-il dans le jardin ? (règle pair-impair : un trou du contour n'en fait pas partie) */
export function inRings(p, rings) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, k = r.length - 1; i < r.length; k = i++) {
      const [yi, xi] = r[i]; const [yk, xk] = r[k];
      if ((yi > p.lat) !== (yk > p.lat) && p.lng < ((xk - xi) * (p.lat - yi)) / (yk - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Distance en mètres du point au bord du jardin ; 0 dedans. */
export function distanceToJardin(p, j) {
  if (!p || !j) return Infinity;
  if (inRings(p, j.rings)) return 0;
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180); const ky = 110540;
  let best = Infinity;
  for (const r of j.rings) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i]; const b = r[(i + 1) % r.length];
      const ax = (a[1] - p.lng) * kx; const ay = (a[0] - p.lat) * ky;
      const bx = (b[1] - p.lng) * kx; const by = (b[0] - p.lat) * ky;
      const dx = bx - ax; const dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

/** Le point du bord le plus proche (pour « Y aller » depuis un grand parc : on y entre par le côté le plus proche). */
export function nearestEdge(p, j) {
  let best = null;
  for (const r of j?.rings ?? []) for (const [lat, lng] of r) { const d = distanceM(p, { lat, lng }); if (!best || d < best.d) best = { lat, lng, d }; }
  return best;
}

/** Les horaires du jardin (format OpenStreetMap), lus dans la copie du jour du jeu de la Ville, par l'identifiant ; '' si inconnus. */
export const jardinRecord = (j, parks) => (parks ?? []).find((x) => x.id && x.id === j?.id) ?? null;
export const jardinHours = (j, parks) => jardinRecord(j, parks)?.hours ?? '';
/** « 50 RUE BRETAGNE » → « 50 rue Bretagne » (le texte de la Ville, sans rien deviner) ; '' si absente. */
export function jardinAddress(a) {
  const t = jardinName(a);
  return t.replace(/^(\d+\s*(?:bis|ter)?\s+)?(\p{L}+)/u, (m, n, w) => `${n ?? ''}${/^(Rue|Avenue|Boulevard|Place|Pl|Quai|Square|Allée|Passage|Impasse|Villa|Cité|Bd|Av)$/.test(w) ? w.toLowerCase() : w}`);
}

/**
 * Le grand jardin à signaler dans « Maintenant » : bord à moins de `near` m, ouvert maintenant d'après ses horaires connus,
 * et pas sur le point de fermer ; un seul, le plus proche ; jamais un jardin déjà signalé depuis l'ouverture de l'appli (`shown`).
 * Rien sans horaires (pas d'information plutôt qu'une fausse), donc rien non plus loin de Paris.
 */
export function bigJardinNear(list, pos, { parks = [], shown = new Set(), now = new Date(), near = NEAR_M } = {}) {
  if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return null;
  let best = null;
  for (const j of list ?? []) {
    if (!j.big || shown.has(j.id)) continue;
    if (Math.abs(j.lat - pos.lat) > 0.03 || Math.abs(j.lng - pos.lng) > 0.045) continue; // à plus de 3 km : inutile de calculer
    const d = distanceToJardin(pos, j);
    if (d > near) continue;
    const hours = jardinHours(j, parks);
    if (!hours || !openState(hours, now)?.open) continue; // fermé ou horaires inconnus : rien
    const left = minutesLeft(hours, now); // null : ouvert jour et nuit
    if (left != null && left < CLOSE_MARGIN) continue;
    if (!best || d < best.d) best = { j, d, hours };
  }
  return best;
}

/** v273 : la page paris.fr d'un jardin, quand le robot l'a trouvée et ouverte (data/jardins-liens.json,
 * tools/maj-jardins-liens.py) : { id du jardin : "<nom>-<numéro>" } → Map id → adresse complète. Jamais d'adresse devinée ici. */
export const JARDIN_PAGE = 'https://www.paris.fr/lieux/';
export function cleanJardinLinks(json) {
  const out = new Map();
  const items = json && typeof json.items === 'object' && !Array.isArray(json.items) ? json.items : {};
  for (const [id, path] of Object.entries(items)) {
    if (typeof path === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.test(path) && path.length <= 160) out.set(id, JARDIN_PAGE + path);
  }
  return out;
}
