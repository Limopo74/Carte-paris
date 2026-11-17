// « Vu en passant » (v157) : noter d'un geste ce qu'on croise dans la rue, et le retrouver en repassant.
// Fonctions sans interface, testées dans tests/passage.test.mjs.
import { distanceM } from './geo.js';

/** La catégorie des notes prises en passant : créée au premier usage, cachée de la barre du haut (le filtre est dans Filtres). */
export const SEEN_CAT = { id: 'vu', name: 'Vu en passant', color: '#0c8599', icon: '📷' };

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Nom d'une note : sa ligne (40 signes au plus, coupée à un mot), sinon « Vu le 17 nov. ». */
export function seenName(line, date = new Date()) {
  const t = String(line ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return `Vu le ${date.getDate()} ${MOIS[date.getMonth()]}`;
  if (t.length <= 40) return t;
  const cut = t.slice(0, 40);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 20 ? cut.lastIndexOf(' ') : 40).trim()}…`;
}

/** Ajoute la catégorie « Vu en passant » si elle manque (en dernier), et la cache de la barre du haut la première fois. */
export function withSeenCat(state) {
  if (state.categories.some((c) => c.id === SEEN_CAT.id)) return state;
  return { ...state, categories: [...state.categories, { ...SEEN_CAT }], hiddenChips: [...new Set([...(state.hiddenChips ?? []), `cat:${SEEN_CAT.id}`])] };
}

/** « il y a 3 jours », « il y a 2 mois », « il y a plus d'un an » (date d'ajout ou de visite). */
export function agoText(t, now = Date.now()) {
  const days = Math.floor((now - t) / 864e5);
  if (days < 1) return 'aujourd\'hui';
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30.4);
  if (months < 12) return `il y a ${months} mois`;
  return months < 24 ? 'il y a plus d\'un an' : `il y a ${Math.floor(months / 12)} ans`;
}

export const MEMORY_M = 100; // « ici » : à moins de 100 m
export const MEMORY_VISIT_MS = 3600e3; // une même visite : la note reste affichée une heure
export const MEMORY_AGAIN_MS = 7 * 864e5; // puis plus avant 7 jours

/**
 * « Tu es déjà passé ici » : le plus proche de mes lieux à moins de 100 m qui a une note ou une photo,
 * gardé depuis plus d'un jour (pas ce que je viens d'ajouter), et pas déjà rappelé ces 7 derniers jours
 * (sauf pendant la même visite). `shown` : { id: date du premier rappel }. Renvoie { p, d } ou null.
 */
export function memoryHere(points, pos, shown = {}, now = Date.now()) {
  if (!pos) return null;
  let best = null;
  for (const p of points) {
    if (p.owner || !(p.note?.trim() || p.photos?.length || (p.passages ?? []).some((x) => x.text || x.photo))) continue;
    const since = Math.max(p.created ?? 0, p.visited ?? 0, ...(p.passages ?? []).map((x) => x.at ?? 0));
    if (now - since < 864e5) continue;
    const s = shown[p.id];
    if (s && now - s >= MEMORY_VISIT_MS && now - s < MEMORY_AGAIN_MS) continue;
    const d = distanceM(pos, p);
    if (d <= MEMORY_M && (!best || d < best.d)) best = { p, d };
  }
  return best;
}

/** Le carnet des rappels : remis à zéro pour un lieu après 7 jours ; les vieux rappels (plus de 7 jours) sont oubliés. */
export function markShown(shown, id, now = Date.now()) {
  const out = {};
  for (const [k, t] of Object.entries(shown ?? {})) if (Number.isFinite(t) && now - t < MEMORY_AGAIN_MS) out[k] = t;
  out[id] ??= now; // déjà rappelé cette semaine : on garde la date du premier rappel
  return out;
}

/* ---------- Mes passages (v157) : pour chaque adresse, la liste datée de mes passages ---------- */
// Forme : p.passages = [{ at, text?, photo? }], le plus récent d'abord ; 200 au plus par adresse.

export const LOG_DEFAULT = 'Mes passages';
export const LOG_MAX = 24;
/** Le nom de l'historique d'une catégorie (« Mes repas », « Mes visites »…), sinon « Mes passages ». */
export const logName = (cat) => (typeof cat?.log === 'string' && cat.log.trim() ? cat.log.trim().slice(0, LOG_MAX) : LOG_DEFAULT);
/** Nom d'historique saisi : nettoyé, '' = celui par défaut. */
export const cleanLog = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, LOG_MAX) : '');

const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

/** Passages lisibles, du plus récent au plus ancien. */
export function cleanPassages(list) {
  return (Array.isArray(list) ? list : []).filter((x) => Number.isFinite(x?.at)).map((x) => ({
    at: x.at,
    ...(typeof x.text === 'string' && x.text.trim() ? { text: x.text.trim().slice(0, 200) } : {}),
    ...(typeof x.photo === 'string' && /^[\w-]{1,64}$/.test(x.photo) ? { photo: x.photo } : {}),
    ...(Number.isInteger(x.stars) && x.stars >= 1 && x.stars <= 5 ? { stars: x.stars } : {}), // note du passage, facultative
  })).sort((a, b) => b.at - a.at).slice(0, 200);
}

/** Ajoute un passage. Un passage sans texte ni photo n'est pas répété le même jour (Déjà visité coché deux fois). */
export function addPassage(list, entry) {
  const cur = cleanPassages(list);
  const e = cleanPassages([entry])[0];
  if (!e) return cur;
  if (!e.text && !e.photo && !e.stars && cur.some((x) => dayKey(x.at) === dayKey(e.at))) return cur;
  return cleanPassages([...cur, e]);
}

/** « Déjà visité » décoché : retire le passage automatique de ce jour (sans texte ni photo), jamais ce que j'ai écrit. */
export function dropAutoPassage(list, at) {
  return cleanPassages(list).filter((x) => x.text || x.photo || x.stars || dayKey(x.at) !== dayKey(at));
}

/** Toutes les photos d'une adresse : celles de la fiche et celles des passages (sauvegarde, suppression). */
export const photoIds = (p) => [...new Set([...(p?.photos ?? []), ...(p?.passages ?? []).map((x) => x.photo).filter(Boolean)])];

/** Une de mes adresses (pas une note Vu en passant) à moins de `maxM` mètres : { p, d } ou null. */
export function placeNear(points, pos, maxM = 30) {
  let best = null;
  for (const p of points) {
    if (p.owner || p.cat === SEEN_CAT.id) continue;
    const d = distanceM(pos, p);
    if (d <= maxM && (!best || d < best.d)) best = { p, d };
  }
  return best;
}

/** Le journal : tous les passages de mes adresses, du plus récent au plus ancien : [{ p, at, text?, photo? }]. */
export const journal = (points) => points.filter((p) => !p.owner).flatMap((p) => cleanPassages(p.passages).map((x) => ({ p, ...x })))
  .sort((a, b) => b.at - a.at);

/** Ce que « Tu es déjà passé ici » rappelle : le dernier passage écrit ou en photo, sinon le commentaire de la fiche. */
export function memoryOf(p) {
  const last = cleanPassages(p.passages).find((x) => x.text || x.photo);
  return last ? { at: last.at, text: last.text ?? '', photo: last.photo ?? null } : { at: p.visited ?? p.created ?? null, text: p.note?.trim() ?? '', photo: p.photos?.[0] ?? null };
}

/* ---------- Le bon moment (v158) : quand un lieu vaut le détour (puces facultatives du formulaire) ---------- */
export const MOMENTS = [['matin', 'Matin'], ['midi', 'Midi'], ['soir', 'Soir'], ['weekend', 'Week-end'], ['printemps', 'Printemps'], ['ete', 'Été'], ['automne', 'Automne'], ['hiver', 'Hiver']];
const KEYS = MOMENTS.map(([k]) => k);
const GROUP = { matin: 'heure', midi: 'heure', soir: 'heure', weekend: 'jour', printemps: 'saison', ete: 'saison', automne: 'saison', hiver: 'saison' };
const SAYS = { matin: 'le matin', midi: 'à midi', soir: 'le soir', weekend: 'le week-end', printemps: 'au printemps', ete: 'en été', automne: 'en automne', hiver: 'en hiver' };
/** Moments connus, sans doublon, dans l'ordre des puces. */
export const cleanMoments = (a) => (Array.isArray(a) ? KEYS.filter((k) => a.includes(k)) : []);
/** Le moment est-il venu ? Chaque famille choisie (heure, jour, saison) doit être juste ; une famille non choisie ne compte pas. */
export function momentNow(keys, date = new Date()) {
  const ks = cleanMoments(keys);
  if (!ks.length) return false;
  const h = date.getHours() + date.getMinutes() / 60;
  const m = date.getMonth();
  const ok = {
    matin: h >= 7 && h < 11, midi: h >= 11.5 && h < 14.5, soir: h >= 18 && h < 23.5, // mêmes heures que « Maintenant »
    weekend: date.getDay() === 0 || date.getDay() === 6,
    printemps: m >= 2 && m <= 4, ete: m >= 5 && m <= 7, automne: m >= 8 && m <= 10, hiver: m === 11 || m <= 1,
  };
  const groups = [...new Set(ks.map((k) => GROUP[k]))];
  return groups.every((g) => ks.some((k) => GROUP[k] === g && ok[k]));
}
/** « au printemps, le matin » ; « le week-end, le matin ou le soir ». */
export function momentText(keys) {
  const ks = cleanMoments(keys);
  return ['saison', 'jour', 'heure'].map((g) => ks.filter((k) => GROUP[k] === g).map((k) => SAYS[k]).join(' ou ')).filter(Boolean).join(', ');
}
/** « C'est le moment » : le plus proche de mes lieux dont le bon moment est venu, à moins de `maxM` mètres : { p, d } ou null. */
export function momentHere(points, pos, date = new Date(), maxM = 800, isOpen = () => true) {
  if (!pos) return null;
  let best = null;
  for (const p of points) {
    if (p.owner || !p.moments?.length || !momentNow(p.moments, date) || !isOpen(p)) continue;
    const d = distanceM(pos, p);
    if (d <= maxM && (!best || d < best.d)) best = { p, d };
  }
  return best;
}
