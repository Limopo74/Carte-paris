// Avantages culture Navigo : lieux partenaires (fichier fixe data/navigo.json, refait par tools/maj-navigo.py).
// Tout est trié sur le téléphone : la position n'est envoyée à personne.

export const NAVIGO_SOURCE = 'https://data.iledefrance-mobilites.fr/explore/dataset/lieux-avantages-cultures-navigo/export/'; // même jeu que sur PRIM, sans la vérification Cloudflare

/** Genre des cartes de Sorties pour une discipline du fichier. */
const GENRES = { 'Cinéma': 'cine', 'Musique': 'musique', 'Théâtre': 'scene', 'Danse': 'scene', 'Cirque': 'scene', 'Musée': 'musee', "Centre d'art": 'expo', 'Patrimoine': 'balade', 'Jardin': 'balade', 'Royauté': 'balade', 'Expérience': 'atelier' };
export const navigoGenre = (k) => GENRES[k] ?? 'scene';

/** Filtres de la liste : les grandes disciplines, les toutes petites (Danse, Cirque, Expérience…) réunies dans « Autres ». */
export const NAVIGO_GROUPS = ['Cinéma', 'Théâtre', 'Musée', 'Musique', "Centre d'art", 'Patrimoine', 'Autres'];
export const navigoGroup = (k) => (NAVIGO_GROUPS.includes(k) && k !== 'Autres' ? k : 'Autres');
/** Garde les lieux des disciplines choisies (aucune choisie : tout). */
export const navigoPass = (x, groups) => !groups?.size || groups.has(navigoGroup(x.kind));

/** Lit data/navigo.json ; ignore toute ligne incomplète. Le texte reste du texte brut (jamais du HTML). */
export function parseNavigo(json) {
  const items = Array.isArray(json?.items) ? json.items : [];
  return items.filter((x) => typeof x?.n === 'string' && x.n && typeof x.o === 'string' && x.o && Number.isFinite(x.lat) && Number.isFinite(x.lng))
    .map((x) => ({ name: x.n, kind: String(x.k ?? ''), offer: x.o, address: String(x.a ?? ''), lat: x.lat, lng: x.lng, url: /^https?:\/\//.test(x.url ?? '') ? x.url : '' }));
}

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function dist(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Les lieux partenaires du plus proche au plus loin, à moins de `max` mètres (au moins les `min` plus proches). */
export function navigoNear(items, from, max = 2000, min = 5) {
  const all = items.map((x) => ({ ...x, d: dist(from, x) })).sort((a, b) => a.d - b.d);
  const inside = all.filter((x) => x.d <= max);
  return inside.length >= min ? inside : all.slice(0, min);
}

const STOP = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'l', 'd', 'et', 'a', 'au', 'aux', 'en', 'cinema', 'cinemas', 'theatre', 'musee', 'salle', 'centre', 'paris', 'maison', 'espace', 'the']);
/** Mots significatifs d'un nom, sans accents ni mots courants. */
export function nameWords(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));
}

/** Le lieu partenaire qui correspond à un de mes lieux : à moins de 30 m, ou à moins de 150 m avec un mot du nom en commun. */
export function navigoFor(place, items) {
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
  const mine = new Set(nameWords(place.name ?? place.title));
  let best = null;
  for (const x of items) {
    const d = dist(place, x);
    if (d > 150) continue;
    const common = nameWords(x.name).some((w) => mine.has(w));
    if (d <= 30 || common) {
      const score = d - (common ? 1000 : 0);
      if (!best || score < best.score) best = { item: x, score };
    }
  }
  return best?.item ?? null;
}
