// Recherche dans mes lieux.
import { distanceM } from './geo.js';

/** Minuscules, sans accents, espaces en trop retirés. */
export function fold(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Lieux dont le nom, la note, l'adresse, l'artiste ou la catégorie contiennent tous les mots cherchés.
 * Triés par distance si `here` est donné, sinon par ordre alphabétique.
 */
export function searchPoints(points, categories, query, here = null) {
  const words = fold(query).split(' ').filter(Boolean);
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const out = [];
  for (const point of points) {
    const hay = fold([point.name, point.note, point.address, point.artist, catName[point.cat]].join(' '));
    if (words.every((w) => hay.includes(w))) out.push({ point, d: here ? distanceM(here, point) : null });
  }
  if (here) out.sort((a, b) => a.d - b.d);
  else out.sort((a, b) => a.point.name.localeCompare(b.point.name, 'fr', { sensitivity: 'base' }));
  return out;
}

/**
 * v372+ (mon choix A du 21 nov.) : les noms de Mes artistes qui contiennent tous les mots tapés dans la loupe
 * (sans accents ni majuscules), dans l'ordre de ma liste. Rien sous 2 lettres : « a » trouverait presque tout.
 */
export function searchArtists(names, query) {
  const words = fold(query).split(' ').filter(Boolean);
  if (words.join('').length < 2) return [];
  return (Array.isArray(names) ? names : []).filter((n) => { const hay = fold(n); return words.every((w) => hay.includes(w)); });
}
