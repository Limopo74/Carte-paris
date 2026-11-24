// Mes chiffres : totaux par jour gardés sur le téléphone seulement (jamais le tracé de tes déplacements).
// marche (mètres) par qualité de l'air, fonctions utilisées ; 90 jours au plus.
import { dayKey } from './move.js';

export const KEEP_DAYS = 90;
export const WALK_M_PER_MIN = 80; // allure de marche moyenne
export const AIR_BUCKETS = ['bon', 'moyen', 'mauvais', 'inconnu'];

/** Niveau de l'indice européen -> 3 groupes lisibles (+ inconnu). */
export function airBucket(level) {
  if (level === 'bon' || level === 'correct') return 'bon';
  if (level === 'moyen') return 'moyen';
  if (level === 'mediocre' || level === 'tres-mediocre' || level === 'extreme') return 'mauvais';
  return 'inconnu';
}

const day = (j, key) => (j.days[key] ??= { m: 0, air: {}, use: {} });

/** Journal vide ou relu : on ne garde que ce qui a la bonne forme. */
export function cleanJournal(obj) {
  const days = {};
  for (const [k, v] of Object.entries(obj?.days ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || typeof v !== 'object' || !v) continue;
    const num = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);
    const air = Object.fromEntries(AIR_BUCKETS.map((b) => [b, num(v.air?.[b])]).filter(([, x]) => x));
    const use = Object.fromEntries(Object.entries(v.use ?? {}).filter(([n]) => typeof n === 'string' && n.length <= 40).map(([n, x]) => [n, num(x)]).filter(([, x]) => x));
    days[k] = { m: num(v.m), air, use };
  }
  return { days };
}

/** Ajoute des mètres de marche au jour donné, rangés selon l'air du moment. */
export function addWalk(j, meters, level, date = new Date()) {
  if (!(meters > 0)) return j;
  const d = day(j, dayKey(date));
  const b = airBucket(level);
  d.m += meters;
  d.air[b] = (d.air[b] ?? 0) + meters;
  return j;
}

/** Compte une utilisation d'une fonction (nom lisible, ex. « Rentrer »). */
export function addUse(j, name, date = new Date()) {
  const d = day(j, dayKey(date));
  d.use[name] = (d.use[name] ?? 0) + 1;
  return j;
}

/** Remet à zéro une partie du journal : la marche (avec l'air) et/ou les fonctions utilisées. Les jours vidés disparaissent. */
export function resetJournal(j, { walk = false, use = false } = {}) {
  for (const [k, d] of Object.entries(j.days)) {
    if (walk) { d.m = 0; d.air = {}; }
    if (use) d.use = {};
    if (!d.m && !Object.keys(d.use).length) delete j.days[k];
  }
  return j;
}

/** Supprime les jours de plus de KEEP_DAYS jours. */
export function prune(j, now = new Date()) {
  const limit = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - KEEP_DAYS + 1));
  for (const k of Object.keys(j.days)) if (k < limit) delete j.days[k];
  return j;
}

/** Les n derniers jours, du plus ancien à aujourd'hui (jours vides compris). */
export function lastDays(j, n, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const d = j.days[dayKey(date)] ?? { m: 0, air: {}, use: {} };
    out.push({ date, key: dayKey(date), m: d.m, air: { ...d.air }, use: { ...d.use } });
  }
  return out;
}

/** Totaux d'une période : mètres, mètres par groupe d'air, utilisations triées. */
export function totals(days) {
  const air = Object.fromEntries(AIR_BUCKETS.map((b) => [b, 0]));
  const use = {};
  let m = 0;
  for (const d of days) {
    m += d.m;
    for (const b of AIR_BUCKETS) air[b] += d.air[b] ?? 0;
    for (const [n, x] of Object.entries(d.use)) use[n] = (use[n] ?? 0) + x;
  }
  return { m, air, use: Object.entries(use).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}

/** Mes lieux sur la période [from, now] : ajoutés, visités, favoris, note moyenne, par catégorie. */
export function placesStats(points, from, now = Date.now()) {
  const inP = (t) => Number.isFinite(t) && t >= from && t <= now;
  const rated = points.filter((p) => p.stars > 0);
  const byCat = new Map();
  for (const p of points) byCat.set(p.cat, (byCat.get(p.cat) ?? 0) + 1);
  return {
    total: points.length,
    added: points.filter((p) => inP(p.created)).length,
    visited: points.filter((p) => p.done && inP(p.visited)).length,
    fav: points.filter((p) => p.fav).length,
    stars: rated.length ? Math.round((rated.reduce((s, p) => s + p.stars, 0) / rated.length) * 10) / 10 : null,
    byCat: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Arrondissements explorés (au moins un lieu visité) maintenant et au début de la période. */
export function arrProgress(points, from) {
  const now = new Set(points.filter((p) => p.done && p.arr).map((p) => p.arr));
  const before = new Set(points.filter((p) => p.done && p.arr && Number.isFinite(p.visited) && p.visited < from).map((p) => p.arr));
  // Visités sans date : comptés comme déjà explorés avant la période
  for (const p of points) if (p.done && p.arr && !Number.isFinite(p.visited)) before.add(p.arr);
  return { now: now.size, gained: Math.max(0, now.size - before.size) };
}

/** v378 (mon choix 11A du 24 nov.) : Mes chiffres pour la sauvegarde : la marche et l'air de chaque jour, jamais les fonctions
 *  utilisées (comme « Ce que j'utilise », elles ne quittent pas le téléphone). */
export function journalForBackup(j) {
  const c = cleanJournal(j);
  const days = Object.fromEntries(Object.entries(c.days).filter(([, v]) => v.m > 0).map(([k, v]) => [k, { m: v.m, air: v.air }]));
  return Object.keys(days).length ? { days } : null;
}

/** Restauration : un jour déjà sur le téléphone garde ses chiffres (rien n'est compté deux fois), un jour absent arrive. */
export function mergeJournal(mine, theirs) {
  const a = cleanJournal(mine); const b = cleanJournal(theirs);
  for (const [k, v] of Object.entries(b.days)) if (!a.days[k]) a.days[k] = { m: v.m, air: v.air, use: {} };
  return a;
}
