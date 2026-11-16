// Quel métro prendre ? Estimation simple à partir des stations et de leurs lignes
// (pas d'horaires ni de sens de circulation : c'est une aide, le trajet exact est dans Google Maps).
import { distanceM, walkMinutes } from './geo.js';

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
  if (!best || (!start && walkAll <= best.minutes)) return { type: 'walk', minutes: walkAll };
  return best;
}
