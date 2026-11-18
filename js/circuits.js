// Circuits de visite (v168) : balades à pied d'un métro à l'autre, étapes vérifiées, tracé calculé une fois et rangé dans l'appli.
// Aucune dépendance au navigateur : testé par tests/circuits.test.mjs.
import { distanceM, routeMinutes } from './geo.js';

/** Thèmes (choisis par l'utilisatrice le 18 nov. 2026), dans l'ordre des puces. */
export const CIRCUIT_THEMES = [['histoire', 'Histoire'], ['art', 'Art'], ['nature', 'Jardins et eau'], ['passages', 'Passages couverts']];
/** Durées de balade (marche + arrêts), dans l'ordre des puces. */
export const CIRCUIT_DURATIONS = [['court', 'Moins de 45 min'], ['heure', 'Environ 1 h'], ['long', 'Environ 1 h 30']];
/** Minutes comptées pour regarder chaque étape (pas les stations de métro, ni les visites de musée). */
export const STOP_MIN = 4;
/** « Mes lieux près du tracé » : à 2 minutes de marche au plus. */
export const NEAR_TRACE_MIN = 2;

const QUARTIERS = new Set(['centre', 'rive-gauche', 'nord', 'est', 'ouest', 'sud']);
const THEME_IDS = new Set(CIRCUIT_THEMES.map(([k]) => k));
const inParis = (lat, lng) => lat > 48.7 && lat < 49 && lng > 2.1 && lng < 2.6;
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Décode un tracé au format « polyline » (précision 5) en [[lat, lng], …]. Texte illisible : []. */
export function decodeTrace(s) {
  const pts = [];
  if (typeof s !== 'string') return pts;
  let i = 0; let lat = 0; let lng = 0;
  try {
    while (i < s.length) {
      for (const k of [0, 1]) {
        let r = 0; let sh = 0; let b;
        do {
          if (i >= s.length) throw new Error('coupé');
          b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5;
        } while (b >= 0x20);
        const d = r & 1 ? ~(r >> 1) : r >> 1;
        if (k === 0) lat += d; else lng += d;
      }
      pts.push([lat / 1e5, lng / 1e5]);
    }
  } catch { return []; }
  return pts.every(([a, g]) => inParis(a, g)) ? pts : [];
}

/** Liste des circuits du fichier, nettoyée : chaque circuit a un nom, des étapes dans Paris (une station au début et à la fin) et un tracé lisible. */
export function cleanCircuits(json) {
  const seen = new Set();
  return (Array.isArray(json?.items) ? json.items : []).map((c) => {
    const id = text(c?.id, 40);
    if (!/^[a-z0-9-]+$/.test(id) || seen.has(id)) return null;
    const etapes = (Array.isArray(c.etapes) ? c.etapes : []).map((e) => {
      const lat = Number(e?.lat); const lng = Number(e?.lng); const n = text(e?.n, 80);
      if (!n || !inParis(lat, lng)) return null;
      return { n, lat, lng, t: text(e.t, 260), ...(typeof e.s === 'string' && /^https:\/\/[^\s"<>]+$/.test(e.s) ? { s: e.s } : {}), ...(e.m === true ? { m: true } : {}) };
    }).filter(Boolean);
    const trace = decodeTrace(c.trace);
    const m = Number(c.m);
    if (!text(c.titre, 80) || etapes.length < 3 || !etapes[0].m || !etapes.at(-1).m || trace.length < 2 || !(m > 0)) return null;
    seen.add(id);
    return {
      id, titre: text(c.titre, 80), quartier: QUARTIERS.has(c.quartier) ? c.quartier : 'centre',
      themes: (Array.isArray(c.themes) ? c.themes : []).filter((t) => THEME_IDS.has(t)),
      depart: text(c.depart, 60), arrivee: text(c.arrivee, 60), m, confort: text(c.confort, 200), note: text(c.note, 200),
      etapes, trace,
    };
  }).filter(Boolean);
}

/** Temps d'un circuit selon mon pas : { walk } minutes de marche, { total } avec STOP_MIN par étape à regarder. */
export function circuitTimes(c) {
  const walk = routeMinutes(c.m);
  const stops = c.etapes.filter((e) => !e.m).length;
  return { walk, total: walk + stops * STOP_MIN };
}
/** Classe de durée d'une balade : 'court' (45 min au plus), 'heure' (jusqu'à 1 h 15), 'long' (au-delà). */
export const durationClass = (total) => (total <= 45 ? 'court' : total <= 75 ? 'heure' : 'long');
/** « 35 min », « 1 h », « 1 h 05 » (arrondi à 5 min). */
export function minText(min) {
  const r = Math.max(5, Math.round(min / 5) * 5);
  const h = Math.floor(r / 60); const mn = r % 60;
  return h ? `${h} h${mn ? ` ${String(mn).padStart(2, '0')}` : ''}` : `${mn} min`;
}
/** « 2,9 km » ou « 800 m ». */
export const kmText = (m) => (m < 1000 ? `${Math.round(m / 100) * 100} m` : `${(Math.round(m / 100) / 10).toString().replace('.', ',')} km`);

/** Les circuits gardés par les puces (un thème, une durée ; vides = tous), le départ le plus proche de `from` d'abord. */
export function circuitsFor(list, { theme = '', dur = '' } = {}, from = null) {
  const out = list.filter((c) => (!theme || c.themes.includes(theme)) && (!dur || durationClass(circuitTimes(c).total) === dur));
  return from ? out.map((c) => ({ c, d: distanceM(from, c.etapes[0]) })).sort((a, b) => a.d - b.d).map((x) => x.c) : out;
}

/** Distance (m) d'un point au tracé : au plus près de chaque segment (projection à plat, juste à l'échelle de Paris). */
export function distanceToTrace(p, trace) {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180); const ky = 110540;
  let best = Infinity;
  for (let i = 0; i < trace.length - 1; i++) {
    const ax = (trace[i][1] - p.lng) * kx; const ay = (trace[i][0] - p.lat) * ky;
    const bx = (trace[i + 1][1] - p.lng) * kx; const by = (trace[i + 1][0] - p.lat) * ky;
    const dx = bx - ax; const dy = by - ay; const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return trace.length === 1 ? distanceM(p, { lat: trace[0][0], lng: trace[0][1] }) : best;
}
/** Mes lieux à `maxM` mètres du tracé au plus, du plus proche au plus loin : [{ p, d }]. */
export const pointsNearTrace = (points, trace, maxM) => points.map((p) => ({ p, d: distanceToTrace(p, trace) })).filter((x) => x.d <= maxM).sort((a, b) => a.d - b.d);

/** Le circuit fait : une ligne de Mon journal (carnet des sorties), id « circuit-<id>-<base 36 de l'heure> ». */
export const circuitOutingId = (id, now = Date.now()) => `circuit-${id}-${now.toString(36)}`.slice(0, 64);
/** Les fois où j'ai fait ce circuit (lignes de Mon journal), la plus récente d'abord. */
export const circuitDone = (outings, id) => (Array.isArray(outings) ? outings : []).filter((o) => typeof o?.id === 'string' && o.id.startsWith(`circuit-${id}-`)).sort((a, b) => b.at - a.at);

/* ---------- Signaler un problème, masquer un circuit (v172) ----------
   Gardé sur le téléphone, jamais envoyé : « Copier pour Claude » met le texte dans le presse-papier. Aucune position notée. */
export const STEP_PROBLEMS = [['ferme', 'Fermé ou inaccessible'], ['introuvable', 'Introuvable à cet endroit'], ['texte', 'Texte faux ou à revoir'], ['autre', 'Autre chose']];
export const ROUTE_PROBLEMS = [['chemin', 'Chemin impossible (grille, travaux)'], ['escalier', 'Escalier ou pente non signalés'], ['duree', 'Durée très différente'], ['autre', 'Autre chose']];
const PROBLEM_LABEL = new Map([...STEP_PROBLEMS, ...ROUTE_PROBLEMS]);
export const problemLabel = (k) => PROBLEM_LABEL.get(k) ?? 'Autre chose';
export const NOTES_MAX = 100;
export const NOTE_TEXT_MAX = 300;
const CID = /^[a-z0-9-]{1,40}$/;

/** Signalements bien formés : { id, c (circuit), e (n° d'étape ou null pour le chemin), n (nom de l'étape), k, t, at }, du plus récent. */
export function cleanCircuitNotes(list) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (typeof x?.id !== 'string' || !/^[\w-]{1,64}$/.test(x.id) || seen.has(x.id)) continue;
    if (typeof x.c !== 'string' || !CID.test(x.c) || !PROBLEM_LABEL.has(x.k) || !Number.isFinite(x.at)) continue;
    const step = Number.isInteger(x.e) && x.e >= 0 && x.e < 100;
    seen.add(x.id);
    out.push({ id: x.id, c: x.c, e: step ? x.e : null, n: step ? text(x.n, 80) : '', k: x.k, t: text(x.t, NOTE_TEXT_MAX), at: x.at });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, NOTES_MAX);
}
export const cleanHiddenCircuits = (list) => [...new Set((Array.isArray(list) ? list : []).filter((x) => typeof x === 'string' && CID.test(x)))].slice(0, 50);
export const circuitNoteId = (cid, now = Date.now()) => `pb-${cid}-${now.toString(36)}`.slice(0, 64);
export const notesOf = (notes, cid) => cleanCircuitNotes(notes).filter((x) => x.c === cid);

/** Le texte à coller dans une conversation : un signalement par ligne, du plus ancien au plus récent. */
export function notesText(notes, circuits) {
  const titles = new Map((circuits ?? []).map((c) => [c.id, c.titre]));
  const day = (at) => new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = cleanCircuitNotes(notes).reverse().map((x) => {
    const where = x.e === null ? 'le chemin' : `étape ${x.e + 1}${x.n ? ` « ${x.n} »` : ''}`;
    return `- ${titles.get(x.c) ?? x.c}, ${where} : ${problemLabel(x.k)}.${x.t ? ` « ${x.t} »` : ''} (${day(x.at)})`;
  });
  return lines.length ? ['Problèmes notés sur les circuits de « Ma carte de Paris » :', ...lines].join('\n') : '';
}
