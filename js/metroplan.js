// Quel métro prendre ? Estimation simple à partir des stations et de leurs lignes
// (pas d'horaires ni de sens de circulation : c'est une aide, le trajet exact est dans Google Maps).
import { distanceM, walkMinutes, WALK_LIMIT_M } from './geo.js';

const MAX_WALK_M = 1200; // on ne propose pas une station à plus de 1,2 km
const RIDE_MIN_PER_KM = 2.6; // métro, arrêts compris, à vol d'oiseau
const WAIT_MIN = 3;
const TRANSFER_MIN = 4;

const ride = (a, b) => Math.max(2, Math.round((distanceM(a, b) / 1000) * RIDE_MIN_PER_KM));
/** Lignes d'une station : métro (« 4 ») et RER (« RER A »), le RER seulement là où il croise le métro. */
export const linesOf = (s) => [...(s.l ?? []), ...(s.rer ?? []).map((r) => `RER ${r}`)];
/** « la ligne 4 » ou « le RER A ». */
export const lineName = (l) => (String(l).startsWith('RER') ? `le ${l}` : `la ligne ${l}`);

const near = (stations, p, k) => stations
  .map((s) => ({ s, d: distanceM(p, s) }))
  .filter((x) => x.d <= MAX_WALK_M)
  .sort((a, b) => a.d - b.d)
  .slice(0, k);

/**
 * Meilleure façon d'aller de `from` à `to` : à pied, métro direct, ou métro avec une correspondance.
 * Renvoie { type: 'walk', minutes } | { type: 'direct', start, line, end, minutes, walkIn, walkOut }
 * | { type: 'transfer', start, line1, via, line2, end, minutes, walkIn, walkOut }.
 * v211 : quand aucun métro n'a été trouvé et que le lieu est à 1 km ou plus, la réponse 'walk' porte `noMetro` :
 * 'from' (aucune station près du départ), 'to' (aucune près du lieu) ou 'route' (ni ligne directe ni correspondance unique).
 * La marche n'a alors été comparée à rien : on ne dit pas qu'elle est « le plus simple ».
 */
export function metroPlan(stations, from, to, k = 3, start = null) {
  const walkAll = walkMinutes(distanceM(from, to));
  // `start` : station de départ imposée (choisie par la personne), quelle que soit sa distance
  const A = start ? [{ s: start, d: distanceM(from, start) }] : near(stations, from, k);
  const B = near(stations, to, k);
  let best = null;
  const consider = (plan) => { if (!best || plan.minutes < best.minutes) best = plan; };

  for (const { s: a, d: da } of A) {
    for (const { s: b, d: db } of B) {
      if (a === b) continue;
      const walkIn = walkMinutes(da);
      const walkOut = walkMinutes(db);
      for (const line of linesOf(a)) {
        if (linesOf(b).includes(line)) {
          consider({ type: 'direct', start: a, line, end: b, walkIn, walkOut, minutes: walkIn + WAIT_MIN + ride(a, b) + walkOut });
        }
      }
      for (const l1 of linesOf(a)) {
        for (const l2 of linesOf(b)) {
          if (l1 === l2 || linesOf(b).includes(l1) || linesOf(a).includes(l2)) continue;
          let via = null;
          for (const t of stations) {
            if (t === a || t === b || !linesOf(t).includes(l1) || !linesOf(t).includes(l2)) continue;
            if (!via || distanceM(a, t) + distanceM(t, b) < distanceM(a, via) + distanceM(via, b)) via = t;
          }
          if (via) {
            consider({
              type: 'transfer', start: a, line1: l1, via, line2: l2, end: b, walkIn, walkOut,
              minutes: walkIn + WAIT_MIN + ride(a, via) + TRANSFER_MIN + ride(via, b) + walkOut,
            });
          }
        }
      }
    }
  }
  if (!best) {
    if (distanceM(from, to) < WALK_LIMIT_M) return { type: 'walk', minutes: walkAll };
    return { type: 'walk', minutes: walkAll, noMetro: !A.length ? 'from' : !B.length ? 'to' : 'route' };
  }
  if (!start && walkAll <= best.minutes) return { type: 'walk', minutes: walkAll };
  return best;
}

/**
 * Rentrer (v368) : la station la plus rapide parmi celles proches de moi, sans ma station Maison elle-même
 * (y aller à pied, c'est déjà être arrivé : son « temps en métro » faisait un aller-retour absurde,
 * 28 min au lieu de 15 le 21 nov. 2026). Et seulement si le métro bat la marche quand Maison est dans la liste.
 * `opts` : [{ st, plan }] ; `homeSt` : la station Maison ; `walk` : minutes à pied jusqu'à elle.
 */
export function fastestHomeOption(opts, homeSt, walk) {
  const hasHome = opts.some((o) => o.st === homeSt);
  const best = opts.reduce((a, o) => (o.st === homeSt || o.plan.noMetro || o.plan.type === 'walk' ? a : !a || o.plan.minutes < a.plan.minutes ? o : a), null);
  if (best && hasHome && best.plan.minutes >= walk) return null;
  return best;
}

/** Phrase de la page Métro quand aucun métro n'a été trouvé (`plan.noMetro`) ; '' sinon. `start` : station de départ imposée. */
export function noMetroText(plan, start = null) {
  if (plan?.noMetro === 'from') return 'Aucune station de métro à moins de 1,2 km de toi.';
  if (plan?.noMetro === 'to') return 'Aucune station de métro à moins de 1,2 km de ce lieu.';
  if (plan?.noMetro === 'route') return `${start ? `Depuis Ⓜ ${start.n}, il` : 'Il'} faut sans doute plus d'une correspondance : l'appli ne sait pas le calculer.`;
  return '';
}
