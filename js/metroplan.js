// Quel métro prendre ? Estimation simple à partir des stations et de leurs lignes
// (pas d'horaires ni de sens de circulation : c'est une aide, le trajet exact est dans Google Maps).
import { distanceM, walkMinutes } from './geo.js';

const MAX_WALK_M = 1200; // on ne propose pas une station à plus de 1,2 km
const RIDE_MIN_PER_KM = 2.6; // métro, arrêts compris, à vol d'oiseau
const WAIT_MIN = 3;
const TRANSFER_MIN = 4;

const ride = (a, b) => Math.max(2, Math.round((distanceM(a, b) / 1000) * RIDE_MIN_PER_KM));
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
export function metroPlan(stations, from, to, k = 3) {
  const walkAll = walkMinutes(distanceM(from, to));
  const A = near(stations, from, k);
  const B = near(stations, to, k);
  let best = null;
  const consider = (plan) => { if (!best || plan.minutes < best.minutes) best = plan; };

  for (const { s: a, d: da } of A) {
    for (const { s: b, d: db } of B) {
      if (a === b) continue;
      const walkIn = walkMinutes(da);
      const walkOut = walkMinutes(db);
      for (const line of a.l ?? []) {
        if ((b.l ?? []).includes(line)) {
          consider({ type: 'direct', start: a, line, end: b, walkIn, walkOut, minutes: walkIn + WAIT_MIN + ride(a, b) + walkOut });
        }
      }
      for (const l1 of a.l ?? []) {
        for (const l2 of b.l ?? []) {
          if (l1 === l2 || (b.l ?? []).includes(l1) || (a.l ?? []).includes(l2)) continue;
          let via = null;
          for (const t of stations) {
            if (t === a || t === b || !(t.l ?? []).includes(l1) || !(t.l ?? []).includes(l2)) continue;
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
  if (!best || walkAll <= best.minutes) return { type: 'walk', minutes: walkAll };
  return best;
}
