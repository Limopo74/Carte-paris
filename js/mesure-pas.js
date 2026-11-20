// Mesurer mon pas (v320, choix B du 20 nov. 2026) : un chrono qui s'arrête seul au bout de 1 km.
// Le kilomètre est compté comme partout dans l'appli : ligne droite × 1,3 (DETOUR). La vitesse trouvée
// rend donc justes les minutes à pied annoncées ailleurs. Seul le point de départ est gardé, en mémoire,
// le temps de la mesure : aucun tracé, rien d'enregistré, rien d'envoyé. Aucune dépendance au navigateur.
import { distanceM, DETOUR } from './geo.js';

/** Distance à parcourir, comptée comme dans l'appli (1 km de rues = 770 m en ligne droite). */
export const MESURE_M = 1000;
/** Une position n'est sûre qu'à 20 m près : au-delà, ni départ ni arrivée (règle « pas d'information fausse »). */
export const MESURE_ACC = 20;
/** Un point de départ plus vieux que 10 s n'est plus là où l'on est. */
export const MESURE_AGE_MS = 10000;
/** Au-dehors de 1,5 à 8 km/h, la mesure est fausse (saut du GPS, transport, arrêt) : pas de résultat. */
export const MESURE_KMH_MIN = 1.5;
export const MESURE_KMH_MAX = 8;

const ok = (fix) => !!fix && Number.isFinite(fix.lat) && Number.isFinite(fix.lng) && Number.isFinite(fix.acc);

/** Ce point peut-il servir de départ, à l'instant `now` ? */
export function startOk(fix, now) {
  return ok(fix) && fix.acc <= MESURE_ACC && Number.isFinite(fix.time) && now - fix.time <= MESURE_AGE_MS && now >= fix.time - 1000;
}

/** Mètres faits depuis le départ, comptés comme dans l'appli (ligne droite × 1,3). */
export function measuredM(start, fix) {
  if (!ok(start) || !ok(fix)) return 0;
  return distanceM(start, fix) * DETOUR;
}

/**
 * Où en est la mesure ? `{ m, share, done }` : `done` seulement quand 1 km est fait ET que la position est sûre.
 * Une position imprécise après 1 km fait attendre la suivante, sans s'arrêter.
 */
export function progress(start, fix) {
  const m = measuredM(start, fix);
  return { m, share: Math.min(1, m / MESURE_M), done: m >= MESURE_M && ok(fix) && fix.acc <= MESURE_ACC };
}

/** Le cran de Mon pas le plus proche : demi-km/h, de 2 à 7. */
export const nearestStep = (kmh) => Math.min(7, Math.max(2, Math.round(kmh * 2) / 2));

/**
 * Résultat de la mesure : `{ sec, m, kmh, step }`, ou `null` si elle n'est pas sûre (moins de 1 km, durée
 * impossible, vitesse hors de 1,5 à 8 km/h). La vitesse vient de la distance réellement comptée à l'arrivée,
 * même si la dernière position est arrivée un peu après le kilomètre.
 */
export function result(start, fix, t0, t1) {
  const m = measuredM(start, fix);
  const sec = (t1 - t0) / 1000;
  if (!(m >= MESURE_M) || !(sec > 0) || !ok(fix) || fix.acc > MESURE_ACC) return null;
  const kmh = (m / 1000) / (sec / 3600);
  if (!(kmh >= MESURE_KMH_MIN && kmh <= MESURE_KMH_MAX)) return null;
  return { sec: Math.round(sec), m, kmh, step: nearestStep(kmh) };
}

/** « 12 min 40 s », « 45 s », « 1 h 2 min ». */
export function chronoText(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h} h ${mn} min`;
  return mn ? `${mn} min ${String(r).padStart(2, '0')} s` : `${r} s`;
}

/** Temps pour 1 km à cette vitesse : « 12 min 40 s ». */
export const perKmText = (kmh) => chronoText(Math.round(3600 / kmh));
