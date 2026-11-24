// Mon journal en calendrier (v426, mes choix 1A 2A 3A du 25 nov.) : un mois à la fois, de lundi à dimanche.
// Rien de nouveau n'est gardé : le calendrier range à leur jour ce que Mon journal a déjà (passages, sorties, notes du jour).
import { dayKey } from './move.js';

/** Le jour d'une entrée de Mon journal : la note du jour garde son jour, le reste celui de son heure. */
export const itemDay = (x) => (x?.n?.day ?? dayKey(new Date(x.at)));

/** Les entrées rangées par jour (« AAAA-MM-JJ » → liste, dans l'ordre reçu). */
export function byDay(items) {
  const m = new Map();
  for (const x of items ?? []) {
    if (!x || (!x.n && !Number.isFinite(x.at))) continue;
    const k = itemDay(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/** Les cases d'un mois (month de 0 à 11), lundi en premier : null avant le 1er et après le dernier jour, par semaines entières. */
export function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // lundi = 0
  const n = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= n; d++) cells.push({ d, day: dayKey(new Date(year, month, d)) });
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Mois suivant ou précédent ({ y, m }). */
export const addMonth = ({ y, m }, delta) => { const t = new Date(y, m + delta, 1); return { y: t.getFullYear(), m: t.getMonth() }; };
const rank = ({ y, m }) => y * 12 + m;

/** Les bornes : du mois de la plus ancienne entrée (sinon le mois en cours) au mois en cours. */
export function monthRange(days, now = new Date()) {
  const max = { y: now.getFullYear(), m: now.getMonth() };
  let min = max;
  for (const k of days) {
    const [y, mo] = k.split('-').map(Number);
    if (rank({ y, m: mo - 1 }) < rank(min)) min = { y, m: mo - 1 };
  }
  return { min, max };
}
/** Un mois ramené entre les bornes. */
export const clampMonth = (cur, { min, max }) => (rank(cur) < rank(min) ? min : rank(cur) > rank(max) ? max : cur);
export const sameMonth = (a, b) => rank(a) === rank(b);

/** « Novembre 2026 ». */
export function monthLabel({ y, m }) {
  const s = new Date(y, m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** « Mercredi 25 novembre » (l'année si ce n'est pas l'année en cours). */
export function dayLabel(day, now = new Date()) {
  const [y, mo, d] = day.split('-').map(Number);
  const s = new Date(y, mo - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: y === now.getFullYear() ? undefined : 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
