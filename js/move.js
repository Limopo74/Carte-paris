// Aides au déplacement : boussole, « sur mon chemin », parcours du jour, suivi.
import { distanceM } from './geo.js';

const rad = (x) => (x * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;

/** Cap en degrés (0 = nord, 90 = est) pour aller de a vers b. */
export function bearing(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Angle de la flèche à l'écran : cap du lieu moins l'orientation du téléphone. */
export function relativeAngle(target, heading) {
  return ((target - heading) % 360 + 360) % 360;
}

const POINTS = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'];
/** « nord-est », « sud »… (quand la boussole du téléphone n'est pas disponible). */
export function compassLabel(b) {
  return POINTS[Math.round((((b % 360) + 360) % 360) / 45) % 8];
}

/** La position la plus précise parmi plusieurs mesures. */
export function bestFix(samples) {
  return samples.reduce((best, s) => (!best || s.acc < best.acc ? s : best), null);
}

/** Mètres en plus (à vol d'oiseau) pour passer par p en allant de a à b. */
export function detourM(a, p, b) {
  return distanceM(a, p) + distanceM(p, b) - distanceM(a, b);
}

// 5 minutes de marche en plus, avec 12 min/km et des rues 1,3 fois plus longues que la ligne droite.
export const MAX_DETOUR_M = Math.round((5 / 12) * 1000 / 1.3);

/** Lieux à faire qui demandent un petit détour entre a et b, dans l'ordre où on les croise. */
export function onTheWay(points, a, b, maxDetour = MAX_DETOUR_M) {
  return points
    .filter((p) => !p.done)
    .map((point) => {
      const da = distanceM(a, point);
      return { point, detour: Math.max(0, detourM(a, point, b)), along: da / (da + distanceM(point, b) || 1) };
    })
    .filter((x) => x.detour <= maxDetour)
    .sort((x, y) => x.along - y.along);
}

/** Longueur à vol d'oiseau d'un parcours qui part de `start`. */
export function routeLength(start, route) {
  let total = 0;
  let prev = start;
  for (const p of route) { total += distanceM(prev, p); prev = p; }
  return total;
}

/** Ordre le plus court pour visiter des lieux depuis `start` (le plus proche d'abord, puis améliorations 2-opt). */
export function orderRoute(start, points) {
  const left = [...points];
  const route = [];
  let cur = start;
  while (left.length) {
    let bi = 0;
    for (let i = 1; i < left.length; i++) if (distanceM(cur, left[i]) < distanceM(cur, left[bi])) bi = i;
    cur = left.splice(bi, 1)[0];
    route.push(cur);
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const cand = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        if (routeLength(start, cand) + 1e-6 < routeLength(start, route)) { route.splice(0, route.length, ...cand); improved = true; }
      }
    }
  }
  return route;
}

// Sur téléphone, Google Maps accepte 3 étapes en plus de la destination.
export const MAX_ROUTE = 4;

/** Lien Google Maps à pied, depuis la position du téléphone, par les lieux dans l'ordre. */
export function routeUrl(route) {
  const ll = (p) => `${p.lat},${p.lng}`;
  const u = new URL('https://www.google.com/maps/dir/');
  const params = { api: '1', destination: ll(route.at(-1)), travelmode: 'walking' };
  if (route.length > 1) params.waypoints = route.slice(0, -1).map(ll).join('|');
  u.search = new URLSearchParams(params);
  return u.toString();
}

/** Lieux à faire à moins de `radius` m qui n'ont pas encore été signalés. */
export function newlyNear(points, here, alreadySignaled, radius = 100) {
  return points.filter((p) => !p.done && !alreadySignaled.has(p.id) && distanceM(here, p) <= radius);
}

/** Direction à dire à voix haute selon l'angle de la flèche (0 = devant). */
export function directionWord(rel) {
  const a = ((rel % 360) + 360) % 360;
  if (a < 25 || a > 335) return 'tout droit';
  if (a < 70) return 'légèrement à droite';
  if (a < 130) return 'à droite';
  if (a <= 230) return 'derrière toi';
  if (a <= 290) return 'à gauche';
  return 'légèrement à gauche';
}

/** Distance dite à voix haute : « 40 mètres », « 1,2 kilomètre ». */
export function spokenDistance(m) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} mètres`;
  const km = (m / 1000).toFixed(1).replace('.', ',');
  return `${km} kilomètre${m >= 2000 ? 's' : ''}`;
}

// Compteur de balade : on n'ajoute que des pas de marche plausibles entre deux positions GPS.
export const STRIDE_M = 0.7; // longueur moyenne d'un pas

/** Mètres à ajouter entre deux positions : 0 si trop imprécis, immobile, ou si le saut est trop grand. */
export function walkSegment(prev, fix) {
  if (!prev || !fix || prev.acc > 30 || fix.acc > 30) return 0;
  const d = distanceM(prev, fix);
  const dt = (fix.time - prev.time) / 1000;
  if (d < 5 || dt <= 0) return 0; // bruit GPS à l'arrêt
  if (d / dt > 3) return 0; // plus de 3 m/s (11 km/h) : métro, vélo ou saut de GPS
  return d;
}

/** Pas estimés pour une distance. */
export function stepsFor(m) {
  return Math.round(m / STRIDE_M);
}

/** Date du jour au format AAAA-MM-JJ (heure du téléphone). */
export function dayKey(date = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`;
}
