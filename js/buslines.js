// Mes lignes de bus (v228) : le chemin des lignes que j'ai choisies, dessiné sur la carte. Le fichier des tracés
// (data/bus-traces.json, refait chaque mois par le robot avec tools/maj-bus-traces.py) n'est téléchargé que quand
// j'ajoute une ligne ou quand il a changé : le téléphone n'en garde que mes lignes. Ni horaires ni sens.
import { distanceM } from './geo.js';
import { fold, lineOrder } from './bus.js';

/** Nombre de lignes au plus : au-delà, la carte devient illisible. */
export const BUS_LINES_MAX = 8;
/** Une copie des tracés de plus de 32 jours est redemandée (le robot passe le 1er du mois). */
export const BUS_TRACES_EVERY_DAYS = 32;
const HEX = /^#[0-9A-F]{6}$/;

/** Une de mes lignes, vérifiée : { id, ref, op, c, t, v } (sans le tracé, gardé à part), ou null. */
export function cleanBusLine(l) {
  if (!l || typeof l.id !== 'string' || !/^C\d{5}$/.test(l.id) || typeof l.ref !== 'string' || !l.ref.trim()) return null;
  const txt = (x, n) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : '');
  return {
    id: l.id, ref: txt(l.ref, 12), op: txt(l.op, 50),
    c: HEX.test(String(l.c).toUpperCase()) ? String(l.c).toUpperCase() : '#1B56E8',
    t: HEX.test(String(l.t).toUpperCase()) ? String(l.t).toUpperCase() : '#FFFFFF',
    v: Array.isArray(l.v) ? l.v.map((x) => txt(x, 40)).filter(Boolean).slice(0, 3) : [],
  };
}
/** Mes lignes vérifiées, sans doublon, dans l'ordre où je les ai ajoutées, BUS_LINES_MAX au plus. */
export function cleanBusLines(list) {
  const out = [];
  for (const l of Array.isArray(list) ? list : []) {
    const c = cleanBusLine(l);
    if (c && !out.some((x) => x.id === c.id)) out.push(c);
  }
  return out.slice(0, BUS_LINES_MAX);
}
/** Ajouter une ligne du fichier (rien si elle y est déjà ou si la liste est pleine). */
export const addBusLine = (mine, line) => (cleanBusLines(mine).some((x) => x.id === line?.id) ? cleanBusLines(mine) : cleanBusLines([...cleanBusLines(mine), line]));
export const removeBusLine = (mine, id) => cleanBusLines(mine).filter((x) => x.id !== id);

/** Un tracé vérifié : [[[lat, lng]…]…] (morceaux d'au moins 2 points), ou null. */
export function cleanTrace(p) {
  if (!Array.isArray(p)) return null;
  const parts = p.filter(Array.isArray).map((seg) => seg.filter((q) => Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1])
    && Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180).map((q) => [q[0], q[1]])).filter((seg) => seg.length >= 2);
  return parts.length ? parts : null;
}
/** Les tracés gardés sur le téléphone ({ updated, data, lines: { id: tracé }, missing: [ids absents du fichier] }), vérifiés. */
export function cleanTraces(o) {
  const lines = {};
  for (const [id, p] of Object.entries(o?.lines ?? {})) { const t = /^C\d{5}$/.test(id) ? cleanTrace(p) : null; if (t) lines[id] = t; }
  const day = (x) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '');
  const missing = Array.isArray(o?.missing) ? o.missing.filter((id) => typeof id === 'string' && /^C\d{5}$/.test(id)).slice(0, 20) : [];
  return { updated: day(o?.updated), data: day(o?.data), lines, missing };
}
/** Garder, pour mes lignes seulement, les tracés du fichier téléchargé. Une ligne absente du fichier n'a plus de tracé. */
export function keepTraces(file, mine) {
  const ids = new Set(cleanBusLines(mine).map((l) => l.id));
  const lines = {};
  for (const l of file?.lines ?? []) if (ids.has(l.id)) { const t = cleanTrace(l.p); if (t) lines[l.id] = t; }
  return cleanTraces({ updated: file?.updated, data: file?.data, lines, missing: [...ids].filter((id) => !lines[id]) });
}
/** Vrai si la copie gardée est à redemander (absente, incomplète pour mes lignes, ou de plus de BUS_TRACES_EVERY_DAYS jours). */
export function tracesDue(kept, mine, now = Date.now()) {
  const list = cleanBusLines(mine);
  if (!list.length) return false;
  const k = cleanTraces(kept);
  if (!k.updated || list.some((l) => !k.lines[l.id] && !k.missing.includes(l.id))) return true;
  return now - Date.parse(`${k.updated}T12:00:00`) > BUS_TRACES_EVERY_DAYS * 864e5;
}

/** Chercher une ligne par son numéro : d'abord le numéro exact, puis ceux qui commencent pareil. 12 au plus. */
export function searchBusLines(file, query, max = 12) {
  const q = fold(query).replace(/\s+/g, '').trim();
  if (!q) return [];
  const all = (file?.lines ?? []).filter((l) => fold(l.ref).replace(/\s+/g, '').startsWith(q));
  return all.sort((a, b) => (fold(a.ref) === q ? 0 : 1) - (fold(b.ref) === q ? 0 : 1) || lineOrder(a.ref, b.ref)).slice(0, max);
}
/** Les lignes du fichier qui passent à moins de `m` mètres d'un arrêt et portent un des numéros de cet arrêt. */
export function linesAtStop(file, stop, refs, m = 80) {
  if (!stop || !refs?.length) return [];
  const want = new Set(refs);
  return (file?.lines ?? []).filter((l) => want.has(l.ref) && passesNear(l.p, stop, m)).sort((a, b) => lineOrder(a.ref, b.ref));
}
/** Vrai si le tracé passe à moins de `m` mètres du point (sommets du tracé et milieux des morceaux). */
export function passesNear(p, at, m = 80) {
  for (const seg of p ?? []) {
    for (let i = 0; i < seg.length; i++) {
      if (distanceM(at, { lat: seg[i][0], lng: seg[i][1] }) <= m) return true;
      const n = seg[i + 1];
      if (n && distanceM(at, { lat: (seg[i][0] + n[0]) / 2, lng: (seg[i][1] + n[1]) / 2 }) <= m) return true;
    }
  }
  return false;
}
/** Le sous-titre d'une ligne : « RATP · Paris, Montrouge » (ce que le fichier dit, rien d'autre). */
export const busLineSub = (l) => [l.op, (l.v ?? []).join(', ')].filter(Boolean).join(' · ');
/** Les numéros de mes lignes, pour une phrase : « 38 », « 38 et 26 », « 38, 26 et 91 ». */
export function refsText(mine) {
  const r = cleanBusLines(mine).map((l) => l.ref);
  return r.length < 2 ? (r[0] ?? '') : `${r.slice(0, -1).join(', ')} et ${r[r.length - 1]}`;
}
/** Où poser les pastilles du numéro : deux points du plus long morceau (au tiers et aux trois quarts). */
export function labelSpots(p) {
  const longest = (p ?? []).reduce((a, b) => (b.length > a.length ? b : a), []);
  if (longest.length < 2) return [];
  return [0.3, 0.75].map((f) => longest[Math.min(longest.length - 1, Math.floor(longest.length * f))]);
}
/** Date AAAA-MM-JJ en clair : « 7 septembre 2026 ». */
export function dayText(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '');
  if (!m) return '';
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${Number(m[3]) === 1 ? '1er' : Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}
