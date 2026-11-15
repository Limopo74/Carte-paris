// Petits chiffres utiles et station la plus proche.
import { distanceM } from './geo.js';

const DAY = 86_400_000;

/** « aujourd'hui », « il y a 3 jours », « il y a 8 mois »… */
export function timeAgo(t, now = Date.now()) {
  const days = Math.floor((now - t) / DAY);
  if (days < 1) return 'aujourd\'hui';
  if (days < 2) return 'hier';
  if (days < 14) return `il y a ${days} jours`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} semaines`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const y = Math.floor(days / 365);
  return `il y a ${y} an${y > 1 ? 's' : ''}`;
}

/** « 3 mars 2026 ». */
export function formatDate(t) {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Lieux « à faire » cumulés par cercle : le premier cercle qui en contient
 * et le dernier cercle (tous les lieux à faire visibles).
 */
export function todoSummary(groups) {
  let n = 0;
  let first = null;
  for (const g of groups) {
    n += g.items.filter((i) => !i.point.done).length;
    if (n && !first) first = { ring: g.ring, n };
  }
  return { first, last: { ring: groups.at(-1).ring, n } };
}

/** Nombre de lieux et de lieux à faire dans une catégorie. */
export function categoryCounts(points, catId) {
  const pts = points.filter((p) => p.cat === catId);
  return { total: pts.length, todo: pts.filter((p) => !p.done).length };
}

/** Station la plus proche d'un lieu : { station, d } ou null. */
export function nearestStation(stations, p) {
  let best = null;
  for (const s of stations) {
    const d = distanceM(p, s);
    if (!best || d < best.d) best = { station: s, d };
  }
  return best;
}
