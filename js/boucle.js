/* Boucle à courir (v505, mes choix 1A à 5A du 25 nov. 2026) : une boucle par les rues qui revient au départ, de 3, 5 ou
   10 km, calculée sur le téléphone avec le plan des rues (js/rues.js) : ma position ne part nulle part.
   Méthode : un triangle départ → coin 1 → coin 2 → départ, essayé dans 8 directions ; un coin se pose sur une fontaine
   en service quand il y en a une près de l'endroit visé (choix 2A) ; la taille du triangle est corrigée deux fois d'après
   la vraie longueur par les rues. Une boucle n'est proposée que si sa longueur est à 10 % près de celle choisie (choix 3A)
   et si elle ne revient pas trop sur ses pas ; sinon rien (pas d'information plutôt qu'une information fausse). */
import { snap, route } from './rues.js';

/** Longueurs proposées (choix 5A). */
export const LOOP_KM = [3, 5, 10];
/** Écart permis entre la boucle trouvée et la longueur choisie (choix 3A). */
export const LOOP_TOL = 0.1;
/** Au-delà de 25 % de la longueur parcourue deux fois, ce n'est plus une boucle (un aller-retour). */
export const LOOP_OVERLAP_MAX = 0.25;
/** Jusqu'à 10 % parcourus deux fois (souvent la rue du départ), une boucle est « bonne » : les fontaines passent alors avant. */
export const LOOP_GOOD = 0.1;
/** Les rues font environ 1,3 fois la ligne droite (comme partout dans l'appli). */
const DETOUR = 1.3;
const BEARINGS = 8;
const TRIES = 3;
/** Un coin cherche une fontaine en service à moins de 30 % du côté du triangle (et 400 m au plus). */
const WATER_FRAC = 0.3;
const WATER_MAX_M = 400;
/** Un coin doit tomber à moins de 120 m d'une rue du plan (sinon : Seine, voies ferrées, hors de Paris). */
const CORNER_SNAP_M = 120;

const KY = 111320;
const kx = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const dist = (a, b) => Math.hypot((a.lng - b.lng) * kx(a.lat), (a.lat - b.lat) * KY);
/** Le point à `m` mètres de `p`, dans la direction `deg` (0 = nord, 90 = est). */
export function offset(p, deg, m) {
  const r = (deg * Math.PI) / 180;
  return { lat: p.lat + (m * Math.cos(r)) / KY, lng: p.lng + (m * Math.sin(r)) / kx(p.lat) };
}

/** Mètres parcourus deux fois d'après les tronçons des chemins (segs de route()) : deux chemins différents sur le même tronçon. */
export function overlapM(legs) {
  const byEdge = new Map();
  legs.forEach((l, li) => { for (const [e, a, b] of l?.segs ?? []) { if (!byEdge.has(e)) byEdge.set(e, []); byEdge.get(e).push([li, Math.min(a, b), Math.max(a, b)]); } });
  let m = 0;
  for (const list of byEdge.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (list[i][0] === list[j][0]) continue;
      m += Math.max(0, Math.min(list[i][2], list[j][2]) - Math.max(list[i][1], list[j][1]));
    }
  }
  return m;
}

/** Le coin visé, ou la fontaine en service la plus proche de lui (à moins de 30 % du côté, 400 m au plus). */
function cornerAt(aim, side, waters) {
  const max = Math.min(WATER_MAX_M, side * WATER_FRAC);
  let best = null;
  for (const w of waters) { const d = dist(aim, w); if (d <= max && (!best || d < best.d)) best = { d, w }; }
  return best ? { lat: best.w.lat, lng: best.w.lng, water: true } : { ...aim, water: false };
}

/**
 * La boucle : { m (mètres par les rues), legs (3 chemins de route()), line ([[lat, lng], …] de bout en bout), overlap (m),
 * water (coins posés sur une fontaine), corners (les deux coins, posés sur une rue : pour la garder dans Mes parcours) } ou null si aucune n'est à 10 % près de `targetM` sans trop revenir sur ses pas.
 * `start` : le départ posé sur le plan (snap). `fountains` : [{ lat, lng, ok }] ; seules celles en service comptent.
 */
export function planLoop(P, start, targetM, { fountains = [], bearings = BEARINGS, tries = TRIES } = {}) {
  if (!P || !start || !(targetM > 0)) return null;
  const waters = fountains.filter((f) => f && f.ok !== false && Number.isFinite(f.lat) && Number.isFinite(f.lng) && dist(start, f) < targetM);
  const found = [];
  for (let k = 0; k < bearings; k++) {
    const deg = (360 / bearings) * k;
    let side = targetM / (3 * DETOUR);
    for (let t = 0; t < tries; t++) {
      const c1 = cornerAt(offset(start, deg, side), side, waters);
      const c2 = cornerAt(offset(start, deg + 60, side), side, waters);
      const s1 = snap(P, c1, CORNER_SNAP_M); const s2 = snap(P, c2, CORNER_SNAP_M);
      if (!s1 || !s2) break;
      const legs = [route(P, start, s1), route(P, s1, s2), route(P, s2, start)];
      if (legs.some((l) => !l)) break;
      const m = legs.reduce((s, l) => s + l.m, 0);
      if (!(m > 0)) break;
      if (Math.abs(m - targetM) <= targetM * LOOP_TOL) {
        const overlap = overlapM(legs);
        if (overlap <= m * LOOP_OVERLAP_MAX) found.push({ m, legs, overlap, water: Number(c1.water) + Number(c2.water), corners: [{ lat: s1.lat, lng: s1.lng, water: c1.water }, { lat: s2.lat, lng: s2.lng, water: c2.water }] });
        break;
      }
      side *= targetM / m;
    }
  }
  if (!found.length) return null;
  // La meilleure : d'abord celles qui reviennent peu sur leurs pas (10 % au plus) ; parmi elles, celle qui passe par le plus de
  // fontaines (choix 2A), puis celle qui revient le moins sur ses pas, puis la plus juste
  const tier = (x) => (x.overlap <= x.m * LOOP_GOOD ? 0 : 1);
  found.sort((a, b) => tier(a) - tier(b) || b.water - a.water || a.overlap - b.overlap || Math.abs(a.m - targetM) - Math.abs(b.m - targetM));
  const best = found[0];
  const line = best.legs.flatMap((l, i) => (i ? l.line.slice(1) : l.line));
  return { ...best, line };
}

/**
 * Ce qui est le long de la boucle (fontaines, toilettes) : [{ point, at (mètres depuis le départ), off (mètres jusqu'au
 * tracé) }], dans l'ordre de la course, à `maxOff` mètres au plus du tracé.
 */
export function alongLine(line, points, maxOff) {
  if (!Array.isArray(line) || line.length < 2) return [];
  const cum = [0];
  for (let k = 1; k < line.length; k++) cum.push(cum[k - 1] + dist({ lat: line[k - 1][0], lng: line[k - 1][1] }, { lat: line[k][0], lng: line[k][1] }));
  const lats = line.map((p) => p[0]); const lngs = line.map((p) => p[1]);
  const pad = maxOff / KY * 1.5;
  const box = [Math.min(...lats) - pad, Math.max(...lats) + pad, Math.min(...lngs) - pad * 1.6, Math.max(...lngs) + pad * 1.6];
  const out = [];
  for (const pt of points) {
    if (!pt || !(pt.lat >= box[0] && pt.lat <= box[1] && pt.lng >= box[2] && pt.lng <= box[3])) continue;
    let best = null;
    const KX = kx(pt.lat);
    for (let k = 0; k < line.length - 1; k++) {
      const ax = (line[k][1] - pt.lng) * KX; const ay = (line[k][0] - pt.lat) * KY;
      const bx = (line[k + 1][1] - pt.lng) * KX; const by = (line[k + 1][0] - pt.lat) * KY;
      const dx = bx - ax; const dy = by - ay; const L2 = dx * dx + dy * dy;
      const u = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
      const d = Math.hypot(ax + u * dx, ay + u * dy);
      if (!best || d < best.off) best = { off: d, at: cum[k] + u * Math.sqrt(L2) };
    }
    if (best && best.off <= maxOff) out.push({ point: pt, at: best.at, off: best.off });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* ---------- Mon allure en courant (choix 1A) : de 4 à 10 min par km, de 15 s en 15 s ; absente = rien en courant ---------- */
export const RUN_MIN_S = 240;
export const RUN_MAX_S = 600;
export const RUN_STEP_S = 15;
export const RUN_START_S = 390; // la première fois qu'on touche − ou + : 6 min 30 par km

/** Une allure lisible (secondes par km, sur un cran de 15 s), ou null (pas réglée). */
export function cleanRunPace(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(RUN_MAX_S, Math.max(RUN_MIN_S, Math.round(n / RUN_STEP_S) * RUN_STEP_S));
}
/** L'allure après un appui sur − (plus lent, d = +1) ou + (plus vite, d = −1) ; la première fois : 6 min 30. */
export function stepRunPace(v, d) {
  const p = cleanRunPace(v);
  if (p === null) return RUN_START_S;
  return Math.min(RUN_MAX_S, Math.max(RUN_MIN_S, p + d * RUN_STEP_S));
}
/** « 6 min 30 par km », « 5 min par km ». */
export function runPaceText(s) {
  const p = cleanRunPace(s);
  if (p === null) return '';
  const mn = Math.floor(p / 60); const r = p % 60; // une allure (10 min au plus), pas une durée : jamais en heures
  return `${mn} min${r ? ` ${String(r).padStart(2, '0')}` : ''} par km`;
}
/** « 9,2 km/h ». */
export const runKmhText = (s) => { const p = cleanRunPace(s); return p === null ? '' : `${String(Math.round(36000 / p) / 10).replace('.', ',')} km/h`; };
/** Minutes en courant pour `m` mètres à l'allure `s` (arrondies à la minute), ou null sans allure. */
export function runMinutes(m, s) {
  const p = cleanRunPace(s);
  if (p === null || !(m >= 0)) return null;
  return Math.max(1, Math.round((m / 1000) * p / 60));
}
