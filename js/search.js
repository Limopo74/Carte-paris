// Recherche dans mes lieux.
import { distanceM } from './geo.js';

/** Minuscules, sans accents, espaces en trop retirés. */
export function fold(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Lieux dont le nom, la note, l'adresse ou la catégorie contiennent tous les mots cherchés.
 * Triés par distance si `here` est donné, sinon par ordre alphabétique.
 */
export function searchPoints(points, categories, query, here = null) {
  const words = fold(query).split(' ').filter(Boolean);
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const out = [];
  for (const point of points) {
    const hay = fold([point.name, point.note, point.address, catName[point.cat]].join(' '));
    if (words.every((w) => hay.includes(w))) out.push({ point, d: here ? distanceM(here, point) : null });
  }
  if (here) out.sort((a, b) => a.d - b.d);
  else out.sort((a, b) => a.point.name.localeCompare(b.point.name, 'fr', { sensitivity: 'base' }));
  return out;
}
