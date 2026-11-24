// Enregistrement des lieux et des catégories dans le téléphone, export et import.
import { normalizeRings, DEFAULT_RINGS, normalizeMinuteRings, DEFAULT_MINUTE_RINGS, distanceM } from './geo.js';
import { cleanPlan, cleanPlans, cleanOutings, isDayList } from './planning.js';
import { cleanArtists, cleanArtist, cleanArtistLinks, cleanVenues } from './art.js';
import { cleanPassages, cleanLog, cleanMoments, SEEN_CAT } from './passage.js';
import { cleanCircuitNotes, cleanHiddenCircuits } from './circuits.js';
import { cleanNotes } from './notes.js';
import { cleanTuning, cleanFicheHidden } from './reglages.js';
import { cleanHome } from './chezmoi.js';
import { cleanWords, wordsAsStart, wordsOf } from './mots.js';
import { cleanRoutes } from './rues.js';
import { cleanMyCircuits } from './mescircuits.js';
import { cleanBusLines } from './buslines.js';

/** Jours pendant lesquels une sortie de l'agenda prévue est gardée : ceux du réglage « Tu y es allée ? » (v214). */
const keepDays = (s) => cleanTuning(s?.tuning).askDays;

export const KEY = 'carte-paris.v1';
export const PALETTE = ['#d9480f', '#1971c2', '#7b2cbf', '#2b8a3e', '#9c6644', '#c2255c', '#0c8599', '#495057'];
export const ICONS = [
  '🍽️', '☕', '🍷', '🍺', '🍸', '🥐', '🍰', '🍦', '🍕', '🍜', '🍣', '🥗',
  '🛍️', '👗', '👟', '📚', '🎁', '💄', '🧀', '🍫', '🏛️', '🖼️', '🎭', '🎬',
  '🎵', '⛪', '🌳', '🌸', '🏊', '🧘', '💈', '💊', '📍', '⭐', '❤️', '🏠',
  '🎞️', // Vu en passant : photos empilées (v344 ; l'appareil photo, v157, veut dire « prendre une photo »)
  '🎨', // Street art (v161)
  '🌅', '🚪', '✨', // Vues, Architecture, Insolite (v344)
];
export const DEFAULT_ICON = '📍';
export const FAV_COLORS = ['#f2a900', ...PALETTE];
export const DEFAULT_FAV = { icon: '⭐', color: '#f2a900' };
/** Icônes proposées pour les favoris : étoile ou cœur seulement (v240 ; avant, toutes celles des catégories). */
export const FAV_ICONS = ['⭐', '❤️'];
/** Catégories proposées en un appui dans « Nouvelle catégorie ». */
export const PRESETS = [
  { name: 'Restos', icon: '🍽️', color: '#d9480f' },
  { name: 'Boulangeries', icon: '🥐', color: '#9c6644' },
  { name: 'Douceurs', icon: '🍰', color: '#c2255c' },
  { name: 'Cafés', icon: '☕', color: '#9c6644' },
  { name: 'Bars', icon: '🍷', color: '#c2255c' },
  { name: 'Boutiques', icon: '🛍️', color: '#1971c2' },
  { name: 'Mode', icon: '👗', color: '#1971c2' },
  { name: 'Librairies', icon: '📚', color: '#0c8599' },
  { name: 'Musées', icon: '🏛️', color: '#7b2cbf' },
  { name: 'Spectacles', icon: '🎭', color: '#7b2cbf' },
  { name: 'Cinémas', icon: '🎬', color: '#7b2cbf' },
  { name: 'Parcs et jardins', icon: '🌳', color: '#2b8a3e' },
  { name: 'Street art', icon: '🎨', color: '#c2255c' },
  { name: 'Bien-être', icon: '🧘', color: '#0c8599' },
  { name: 'Pratique', icon: '💊', color: '#495057' },
];
export const DEFAULT_CATEGORIES = [
  { id: 'resto', name: 'Restos', color: '#d9480f', icon: '🍽️' },
  { id: 'boutique', name: 'Boutiques', color: '#1971c2', icon: '🛍️' },
  { id: 'culture', name: 'Culture', color: '#7b2cbf', icon: '🏛️' },
];
const NAME_MAX = 20;

const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const defaults = () => DEFAULT_CATEGORIES.map((c) => ({ ...c }));
const cleanFav = (f) => ({
  icon: FAV_ICONS.includes(f?.icon) ? f.icon : DEFAULT_FAV.icon,
  color: FAV_COLORS.includes(f?.color) ? f.color : DEFAULT_FAV.color,
});

/** Identifiants de listes : courts, sans doublon, 30 au plus. */
const cleanIds = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)))].slice(0, 30) : []);
const cleanLists = (a) => (Array.isArray(a) ? a.filter((l) => l && typeof l.id === 'string' && /^[\w-]{1,64}$/.test(l.id) && typeof l.name === 'string' && l.name.trim())
  .map((l) => ({ id: l.id, name: l.name.trim().slice(0, 30) })).slice(0, 50) : []);

/** Note d'un lieu : un entier de 0 (pas de note) à 5 étoiles. */
export const cleanStars = (n) => (Number.isInteger(n) && n >= 0 && n <= 5 ? n : 0);

/** Crée un lieu complet à partir des champs saisis. */
export function newPoint({ name, cat, note = '', done = false, fav = false, lat, lng, address = '', hours = '', owner = '', stars = 0, lists = [], covered = false }) {
  return {
    id: makeId(),
    name: String(name ?? '').trim(),
    cat,
    note: String(note ?? ''),
    done: Boolean(done),
    visited: done ? Date.now() : null,
    fav: Boolean(fav),
    lat: Number(lat),
    lng: Number(lng),
    address: String(address ?? ''),
    hours: String(hours ?? '').slice(0, 300),
    ...(String(hours ?? '').trim() ? { hoursAt: Date.now() } : {}), // v200 : le jour où les horaires ont été copiés dans l'appli
    owner: String(owner ?? '').trim().slice(0, 30),
    stars: cleanStars(stars),
    lists: cleanIds(lists),
    covered: Boolean(covered),
    arr: null,
    photos: [],
    created: Date.now(),
  };
}

const okCoords = (p) =>
  typeof p.lat === 'number' && Number.isFinite(p.lat) && p.lat >= -90 && p.lat <= 90 &&
  typeof p.lng === 'number' && Number.isFinite(p.lng) && p.lng >= -180 && p.lng <= 180;

const okShape = (p) => Boolean(p) && typeof p === 'object' &&
  typeof p.id === 'string' && p.id.length > 0 &&
  typeof p.name === 'string' && p.name.trim().length > 0 && okCoords(p);

/** Vérifie qu'un objet est un lieu utilisable, avec une catégorie parmi `catIds`. */
export function validatePoint(p, catIds) {
  return okShape(p) && catIds.includes(p.cat);
}

function validCategory(c) {
  return Boolean(c) && typeof c.id === 'string' && c.id.length > 0 &&
    typeof c.name === 'string' && c.name.trim().length > 0 &&
    typeof c.color === 'string' && /^#[0-9a-f]{6}$/i.test(c.color);
}
// Les catégories enregistrées avant l'arrivée des icônes reçoivent celle d'origine, sinon 📍.
const defaultIcon = (id) => DEFAULT_CATEGORIES.find((d) => d.id === id)?.icon ?? DEFAULT_ICON;
const cleanCategory = (c) => ({
  id: c.id, name: c.name.trim().slice(0, NAME_MAX), color: c.color.toLowerCase(),
  icon: c.icon === '📷' ? '🎞️' : ICONS.includes(c.icon) ? c.icon : defaultIcon(c.id), // v344 : l'ancien appareil photo devient les photos empilées
  ...(cleanLog(c.log) ? { log: cleanLog(c.log) } : {}), // nom de l'historique (« Mes repas »…), v157
  ...(cleanLog(c.did) ? { did: cleanLog(c.did) } : {}), // nom de « Déjà visité » (« Déjà goûté »…), v162
  ...(typeof c.words === 'string' && /^[\w-]{0,64}$/.test(c.words) ? { words: c.words } : {}), // série de Mots tout prêts ('' : aucune), v226
  ...(cleanSubs(c.subs).length ? { subs: cleanSubs(c.subs) } : {}), // sous-catégories de mes photos prises en passant (v305)
  ...(c.photo === true ? { photo: true } : {}), // v344 : une catégorie de photos (proposée après la photo), pas une catégorie de la carte
});
/** v305 : sous-catégories d'une catégorie, { id, name } ; un nom en double (majuscules et accents comptent pour rien) n'est gardé qu'une fois. */
export const SUB_MAX = 30;
export function cleanSubs(list) {
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    const name = typeof x?.name === 'string' ? x.name.replace(/\s+/g, ' ').trim().slice(0, SUB_MAX) : '';
    if (!name || typeof x.id !== 'string' || !/^[\w-]{1,64}$/.test(x.id)) continue;
    if (out.some((y) => y.id === x.id || foldName(y.name) === foldName(name))) continue;
    out.push({ id: x.id, name });
  }
  return out.slice(0, 40);
}

export function cleanCategories(list) {
  const seen = new Set();
  const out = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (!validCategory(c) || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(cleanCategory(c));
  }
  return out;
}

/** Genres d'un resto, repris des rubriques TTB qui sont des restos (v288 ; même liste que RESTO_RUBS de js/ttb.js). */
export const PLACE_RUBS = ['La Table', 'Boui-boui', 'Street-food'];

/** v384 (mes choix 1A et 2A du 24 nov.) : le tracé d'une rue d'intérêt, [[lat, lng], …] le long des rues, de 2 à 400 points,
 *  arrondis à 1 m ; autour de Paris seulement. null sinon (un lieu ordinaire n'en a pas). */
export const LINE_MAX = 400;
export function cleanLine(line) {
  if (!Array.isArray(line) || line.length < 2 || line.length > LINE_MAX) return null;
  const out = [];
  for (const q of line) {
    if (!Array.isArray(q) || q.length !== 2) return null;
    const [la, ln] = q.map(Number);
    if (!(la > 48 && la < 49.5 && ln > 1.5 && ln < 3.5)) return null;
    out.push([Math.round(la * 1e5) / 1e5, Math.round(ln * 1e5) / 1e5]);
  }
  return out;
}

// Ne garde que les champs connus, avec les bons types.
const clean = (p) => ({
  id: p.id, name: p.name.trim(), cat: p.cat,
  note: typeof p.note === 'string' ? p.note : '',
  done: Boolean(p.done), visited: p.done && Number.isFinite(p.visited) ? p.visited : null,
  fav: Boolean(p.fav), lat: p.lat, lng: p.lng,
  address: typeof p.address === 'string' ? p.address : '',
  hours: typeof p.hours === 'string' ? p.hours.slice(0, 300) : '',
  ...(typeof p.hours === 'string' && p.hours.trim() && Number.isFinite(p.hoursAt) && p.hoursAt > 0 ? { hoursAt: p.hoursAt } : {}), // v200
  owner: typeof p.owner === 'string' ? p.owner.trim().slice(0, 30) : '', // '' = mes lieux
  stars: cleanStars(p.stars),
  ...(cleanPlan(p.ticket) ? { ticket: cleanPlan(p.ticket) } : {}), // sortie prévue (Prévoir) : jour, heure ou moment, et avec qui (facultatif)
  lists: cleanIds(p.lists),
  covered: Boolean(p.covered),
  arr: Number.isInteger(p.arr) && p.arr >= 1 && p.arr <= 20 ? p.arr : null, // arrondissement, trouvé une fois pour toutes
  photos: Array.isArray(p.photos) ? p.photos.filter((x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)).slice(0, 6) : [],
  ...(cleanPassages(p.passages).length ? { passages: cleanPassages(p.passages) } : {}), // Mes passages (v157)
  ...(cleanMoments(p.moments).length ? { moments: cleanMoments(p.moments) } : {}), // Le bon moment (v158)
  ...(cleanArtist(p.artist) ? { artist: cleanArtist(p.artist) } : {}), // l'artiste de l'œuvre (v161)
  ...(Number.isFinite(p.gone) ? { gone: p.gone } : {}), // « Disparue ou recouverte », noté ce jour-là (v161)
  ...(Number.isFinite(p.checked) && p.checked > 0 ? { checked: p.checked } : {}), // « Toujours ouvert », vu sur place ce jour-là (v274)
  ...(PLACE_RUBS.includes(p.rub) || p.rub === '' ? { rub: p.rub } : {}), // genre d'un resto, comme dans TTB (v288) ; '' = « aucun », choisi par moi
  ...(p.pass === true ? { pass: true } : {}), // pris par + Ajouter → Vu en passant, quelle que soit sa catégorie (v305)
  ...(Number.isFinite(p.shot) && p.shot >= 0 ? { shot: p.shot } : {}), // v310 : photo de la galerie, date de la prise de vue (0 : inconnue)
  ...(typeof p.sub === 'string' && /^[\w-]{1,64}$/.test(p.sub) ? { sub: p.sub } : {}), // sa sous-catégorie, dans sa catégorie (v305)
  ...(cleanLine(p.line) ? { line: cleanLine(p.line) } : {}), // v384 : rue d'intérêt, son tracé (sauvegarde et proche le gardent)
  created: Number.isFinite(p.created) ? p.created : Date.now(),
});

/** v308 : Réglages → Vu en passant (mes choix du 20 nov.). Au départ : catégorie gardée, « Vu en passant », photo sur la carte. `seenNear` n'agit plus depuis la v344 (gardé pour les sauvegardes). */
export const SEEN_STARTS = ['vu', 'street', 'last'];
const idList = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)))].slice(0, 80) : []);
// v311 : `seenOff` = catégories décochées (pas proposées après la photo ; au départ, aucune) ; `seenOrder` = leur ordre après la photo
export const seenSettings = (o) => ({ seenKeep: o?.seenKeep !== false, seenStart: SEEN_STARTS.includes(o?.seenStart) ? o.seenStart : 'vu', seenNear: o?.seenNear !== false, seenPhotoMap: o?.seenPhotoMap !== false, seenOff: idList(o?.seenOff), seenOrder: idList(o?.seenOrder) });
/** La dernière catégorie (et sous-catégorie) choisie après une photo, gardée d'un jour à l'autre pour « La dernière ». */
export const cleanSeenLast = (x) => (x && typeof x.cat === 'string' && /^[\w-]{1,64}$/.test(x.cat) ? { cat: x.cat, sub: typeof x.sub === 'string' && /^[\w-]{1,64}$/.test(x.sub) ? x.sub : '' } : null);

/** Boutons masqués de la barre du haut : 'all', 'filters', 'fav' ou 'cat:<id>'. */
export const cleanChips = (list) => [...new Set((Array.isArray(list) ? list : []).filter((x) => typeof x === 'string' && /^(all|filters|fav|street|ttb|lines|buslines|velib|pratique|passages|velo|jardins|artistes|cat:[\w-]{1,40})$/.test(x)))].slice(0, 60);
/** Boutons du haut rangés sous ⋯ Plus (v151). Au départ : Vélib', Mes lignes de bus (v228), Fontaines et toilettes, Passages couverts. Un bouton masqué n'est pas aussi dans Plus. */
export const DEFAULT_MORE_CHIPS = ['velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins', 'artistes'];
export const cleanMoreChips = (list, hidden = []) => (list === undefined ? [...DEFAULT_MORE_CHIPS] : cleanChips(list)).filter((k) => !hidden.includes(k));
/** Un bouton du haut ajouté après coup arrive sous ⋯ Plus, pas dans la barre, une seule fois : par version de la barre
 * (chipsV 2, v168 : Passages couverts ; chipsV 3, v228 : Mes lignes de bus ; chipsV 4 : Pistes à vélo ; chipsV 5, v261 : Jardins publics ; chipsV 6, v372 : Mes artistes). Un bouton déjà rangé ailleurs ne bouge pas. */
export const NEW_MORE_CHIPS = { 2: ['passages'], 3: ['buslines'], 4: ['velo'], 5: ['jardins'], 6: ['artistes'] };
export const CHIPS_V = 6;
export function withNewChips(list, v) {
  if (list === undefined || v >= CHIPS_V) return list;
  const have = cleanChips(list);
  const add = Object.entries(NEW_MORE_CHIPS).filter(([n]) => !(v >= Number(n))).flatMap(([, keys]) => keys).filter((k) => !have.includes(k));
  return [...have, ...add];
}

/** v268 : l'ordre des boutons de l'appli dans la barre du haut, et le même sous ⋯ Plus (mes choix 2A, 4A). Tout et Filtres
 * restent toujours en tête (3A). v304 (mon choix « une seule file » du 20 nov.) : une catégorie (`cat:<id>`) peut aussi s'y
 * ranger, parmi les boutons de l'appli ; une catégorie absente de la liste va au bout, dans l'ordre de mes catégories.
 * null = l'ordre de départ, qu'un bouton ajouté plus tard suit tout seul. */
export const MOVABLE_CHIPS = ['fav', 'street', 'ttb', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins', 'artistes'];
const isCatKey = (k) => typeof k === 'string' && /^cat:[\w-]{1,40}$/.test(k);
export function cleanChipOrder(list) {
  if (!Array.isArray(list)) return null;
  const out = [...new Set(list.filter((k) => MOVABLE_CHIPS.includes(k) || isCatKey(k)))].slice(0, 80);
  if (!out.some((k) => MOVABLE_CHIPS.includes(k))) return null;
  // Un bouton absent (ajouté après coup) reprend sa place de départ : juste après celui qui le précède au départ
  MOVABLE_CHIPS.forEach((k, i) => {
    if (out.includes(k)) return;
    const prev = MOVABLE_CHIPS.slice(0, i).reverse().find((x) => out.includes(x));
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, k);
  });
  return out.every((k, i) => k === MOVABLE_CHIPS[i]) && out.length === MOVABLE_CHIPS.length ? null : out;
}
/** L'ordre en vigueur (celui de départ quand je n'ai rien changé). */
export const chipOrderOf = (list) => cleanChipOrder(list) ?? [...MOVABLE_CHIPS];
/** v304 : toute la file, catégories comprises : celles qui existent, les autres au bout dans l'ordre de `catIds`. */
export function barOrderOf(list, catIds = []) {
  const keys = new Set(catIds.map((id) => `cat:${id}`));
  const base = chipOrderOf(list).filter((k) => !isCatKey(k) || keys.has(k));
  return [...base, ...[...keys].filter((k) => !base.includes(k))];
}
/** Monte (delta -1) ou descend (+1) un bouton d'une place dans la file (v304 : `catIds` = mes catégories, dans leur ordre). */
export function moveChip(state, key, delta, catIds = []) {
  const list = barOrderOf(state.chipOrder, catIds);
  const i = list.indexOf(key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return state;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...state, chipOrder: cleanChipOrder(list) };
}

/** Lignes masquées de la feuille Filtres. */
export const FILTER_KEYS = ['open', 'top', 'lines', 'buslines', 'markets', 'ttb', 'velib', 'pratique', 'passages', 'velo', 'jardins', 'covered', 'lists', 'people', 'arr'];
export const cleanFilterKeys = (list) => FILTER_KEYS.filter((k) => Array.isArray(list) && list.includes(k));

/** v314 (mes choix du 20 nov., d'après ma capture) : le départ d'un nouveau venu, seulement quand la mémoire est vide.
 * Barre du haut : Dans la rue et Lignes ; les catégories et Vu en passant sous ⋯ Plus (2e capture, 18 h 50) ; Favoris masqué,
 * TTB aussi tant qu'aucune liste n'est importée. Colonne : FRESH_TOOLS. Mon téléphone et les « comme au début » ne changent pas. */
export const FRESH_HIDDEN_CHIPS = ['ttb', 'fav'];
/** v323 (mon choix 2a du 20 nov.) : la fiche d'un nouveau venu sans « Uber jusqu'ici » (Réglages → Autres réglages → Fiche d'un lieu pour le remettre). */
export const FRESH_FICHE_HIDDEN = ['uber'];
/** Colonne de la carte d'un nouveau venu (3e capture, 18 h 53) : Ma position en tête, Paris, M, Sorties, Mon planning ;
 * sous ⋯ Plus, dans cet ordre : Rentrer, Circuits, Vélib', Note du jour ; Fontaine et WC masqué. */
export const FRESH_TOOLS = { mapTools: ['vu', 'locate', 'paris', 'pratique', 'metro', 'home', 'circuits', 'velib', 'sorties', 'planning', 'notes'], hiddenTools: ['pratique'], moreTools: ['home', 'circuits', 'velib', 'notes'] };
export function freshStart(st) {
  const categories = st.categories.some((c) => c.id === SEEN_CAT.id) ? st.categories : [...st.categories, { ...SEEN_CAT }];
  const cats = categories.map((c) => `cat:${c.id}`); // Vu en passant compris
  return { ...st, categories, hiddenChips: [...FRESH_HIDDEN_CHIPS], moreChips: [...DEFAULT_MORE_CHIPS, ...cats], mapTools: [...FRESH_TOOLS.mapTools], hiddenTools: [...FRESH_TOOLS.hiddenTools], moreTools: [...FRESH_TOOLS.moreTools], mapStyle: 'eclairci', ficheHidden: [...FRESH_FICHE_HIDDEN] }; // v323 : Uber masqué dans la fiche (mon choix 2a) // v316 : le fond « Éclairci », sans clé
}

/** v328 (mes choix du 20 nov.) : où la carte s'ouvre : 'me' (ma position, sinon tous mes lieux), 'all' (tous mes lieux),
 * 'home' (Chez moi), 'paris' (centre de Paris), 'last' (là où je l'ai laissée). Avant : l'interrupteur `startOnMe`. */
export const START_VIEWS = ['me', 'all', 'home', 'paris', 'last'];
export const startViewOf = (o) => (START_VIEWS.includes(o?.startView) ? o.startView : o?.startOnMe === false ? 'all' : 'me');

/** Lit l'état enregistré. ok=false si le stockage est indisponible ou illisible. */
export function loadState(storage) {
  const empty = () => ({ points: [], plans: [], rings: [...DEFAULT_RINGS], categories: defaults(), fav: { ...DEFAULT_FAV }, lastExport: null, backup: { saved: null, last: null, n: 0, since: null }, voice: true, ringUnit: 'm', minuteRings: [...DEFAULT_MINUTE_RINGS], me: '', walk: { day: '', m: 0 }, chipIcons: false, mapTools: [...MAP_TOOLS], hiddenTools: [], moreTools: [...DEFAULT_MORE], toolNames: {}, toolLabels: false, startOnMe: true, startView: 'me', vibrateNow: false, jardinsNow: false, evThumbs: false, navigo: true, seenKeep: true, seenStart: 'vu', seenNear: true, seenPhotoMap: true, seenLast: null, masculin: false, showArrNums: true, tuning: cleanTuning(), suggestNow: true, alertNear: true, ficheHidden: [], pace: cleanPace(), textSize: 'normal', essentials: [...DEFAULT_ESSENTIALS], layoutBefore: null, lists: [], mapStyle: 'classic', theme: 'auto', toolsSide: 'right', mySettings: null, myStations: [], home: null, homeOn: false, artists: [], artistLinks: {}, venues: [], outings: [], circuitNotes: [], hiddenCircuits: [], notes: [], showMarkets: false, showLines: false, showTtb: false, ttbOk: false, showPratique: false, showPassages: false, showJardins: false, showVelo: false, busLines: [], showBusLines: false, hiddenChips: [], moreChips: [...DEFAULT_MORE_CHIPS], hiddenFilters: [], routes: [], myCircuits: [] });
  let raw;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { ...empty(), ok: false };
  }
  if (raw == null) return { ...freshStart(empty()), ok: true, fresh: true }; // v314 : mémoire vide = premier lancement
  try {
    const obj = JSON.parse(raw);
    let categories = cleanCategories(obj.categories);
    if (!categories.length) categories = defaults();
    const catIds = categories.map((c) => c.id);
    // Un lieu dont la catégorie n'existe plus est rangé dans la première, pour ne rien perdre.
    const points = (Array.isArray(obj.points) ? obj.points : [])
      .filter(okShape)
      .map((p) => clean({ ...p, cat: catIds.includes(p.cat) ? p.cat : catIds[0] }));
    const lastExport = Number.isFinite(obj.lastExport) ? obj.lastExport : null;
    const st = { points, plans: cleanPlans(obj.plans, Date.now(), keepDays(obj)), rings: normalizeRings(obj.rings ?? []), categories, fav: cleanFav(obj.fav), lastExport, voice: obj.voice !== false, ringUnit: obj.ringUnit === 'min' ? 'min' : 'm', minuteRings: normalizeMinuteRings(obj.minuteRings ?? []), chipIcons: obj.chipIcons === true, mapTools: obj.layoutV >= 3 ? normalizeTools(obj.mapTools) : [...normalizeTools(obj.mapTools).filter((t) => t !== 'locate'), 'locate'], hiddenTools: obj.layoutV >= 2 ? cleanHidden(obj.hiddenTools) : cleanHidden([...(obj.hiddenTools ?? []), ...DEFAULT_HIDDEN]), lists: cleanLists(obj.lists), mapStyle: MAP_STYLES.includes(obj.mapStyle) ? obj.mapStyle : 'classic', theme: ['light', 'dark'].includes(obj.theme) ? obj.theme : 'auto', toolsSide: obj.toolsSide === 'left' ? 'left' : 'right', mySettings: cleanMySettings(obj.mySettings), myStations: cleanMyStations(obj.myStations), artists: cleanArtists(obj.artists), artistLinks: cleanArtistLinks(obj.artistLinks), venues: cleanVenues(obj.venues), outings: cleanOutings(obj.outings), circuitNotes: cleanCircuitNotes(obj.circuitNotes), hiddenCircuits: cleanHiddenCircuits(obj.hiddenCircuits), notes: cleanNotes(obj.notes), showMarkets: obj.showMarkets === true, showLines: obj.showLines === true, showTtb: obj.showTtb === true, ttbOk: obj.ttbOk === true, showPratique: obj.showPratique === true, showPassages: obj.showPassages === true, showJardins: obj.showJardins === true, showVelo: obj.showVelo === true, busLines: cleanBusLines(obj.busLines), showBusLines: obj.showBusLines === true, hiddenChips: cleanChips(obj.hiddenChips), moreChips: cleanMoreChips(withNewChips(obj.moreChips, obj.chipsV), cleanChips(obj.hiddenChips)), chipOrder: cleanChipOrder(obj.chipOrder), hiddenFilters: cleanFilterKeys(obj.hiddenFilters), words: Array.isArray(obj.words) ? cleanWords(obj.words) : undefined, routes: cleanRoutes(obj.routes), myCircuits: cleanMyCircuits(obj.myCircuits),
      me: typeof obj.me === 'string' ? obj.me.trim().slice(0, 30) : '',
      toolNames: cleanToolNames(obj.toolNames), toolLabels: obj.toolLabels === true, startOnMe: startViewOf(obj) === 'me', startView: startViewOf(obj), vibrateNow: obj.vibrateNow === true, jardinsNow: obj.jardinsNow === true, evThumbs: obj.evThumbs === true, navigo: obj.navigo !== false, ...seenSettings(obj), seenLast: cleanSeenLast(obj.seenLast), masculin: obj.masculin === true, showArrNums: obj.showArrNums !== false, tuning: cleanTuning(obj.tuning), suggestNow: obj.suggestNow !== false, alertNear: obj.alertNear !== false, ficheHidden: cleanFicheHidden(obj.ficheHidden), pace: cleanPace(obj.pace), textSize: cleanTextSize(obj.textSize),
      essentials: cleanEssentials(obj.essentials), layoutBefore: cleanLayout(obj.layoutBefore),
      home: cleanHome(obj.home), homeOn: obj.homeOn === true && Boolean(cleanHome(obj.home)), // Chez moi (v222)
      walk: obj.walk && typeof obj.walk.day === 'string' && Number.isFinite(obj.walk.m) ? { day: obj.walk.day, m: obj.walk.m } : { day: '', m: 0 },
      ok: true };
    // v124 : Paris prend la place de Fontaine et WC ; Fontaine, Vélib' et Rentrer passent dans « Plus » (une seule fois)
    if (!(obj.layoutV >= 4)) Object.assign(st, layoutV4(st.mapTools, st.hiddenTools));
    else st.moreTools = cleanMore(withNewInMore(obj.moreTools, obj.mapTools), st.hiddenTools);
    // Avant la v119, seuls les lieux ajoutés étaient comptés : on repart de ce compte, avec l'empreinte actuelle.
    st.backup = cleanBackup(obj.backup) ?? (() => {
      const fresh = st.points.filter((p) => p.created > (lastExport ?? 0));
      return { saved: null, last: backupHash(st), n: fresh.length, since: fresh.length ? Math.min(...fresh.map((p) => p.created)) : null };
    })();
    return st;
  } catch {
    return { ...empty(), ok: false };
  }
}

/** Réglages de l'appli (pas les lieux ni les catégories), nettoyés. Sert pour « mes réglages par défaut ». */
export function cleanSettings(o = {}) {
  return {
    rings: normalizeRings(o.rings ?? []), minuteRings: normalizeMinuteRings(o.minuteRings ?? []), ringUnit: o.ringUnit === 'min' ? 'min' : 'm',
    voice: o.voice !== false, fav: cleanFav(o.fav), chipIcons: o.chipIcons === true,
    mapTools: normalizeTools(o.mapTools), hiddenTools: cleanHidden(o.hiddenTools), moreTools: cleanMore(withNewInMore(o.moreTools ?? DEFAULT_MORE, o.mapTools), cleanHidden(o.hiddenTools)), toolsSide: o.toolsSide === 'left' ? 'left' : 'right',
    toolNames: cleanToolNames(o.toolNames), toolLabels: o.toolLabels === true, startOnMe: startViewOf(o) === 'me', startView: startViewOf(o), vibrateNow: o.vibrateNow === true, jardinsNow: o.jardinsNow === true, evThumbs: o.evThumbs === true, navigo: o.navigo !== false, ...seenSettings(o), masculin: o.masculin === true, showArrNums: o.showArrNums !== false, tuning: cleanTuning(o.tuning), suggestNow: o.suggestNow !== false, alertNear: o.alertNear !== false, ficheHidden: cleanFicheHidden(o.ficheHidden), pace: cleanPace(o.pace), textSize: cleanTextSize(o.textSize), essentials: cleanEssentials(o.essentials),
    mapStyle: MAP_STYLES.includes(o.mapStyle) ? o.mapStyle : 'classic', theme: ['light', 'dark'].includes(o.theme) ? o.theme : 'auto',
    // v294 (mon choix A du 20 nov.) : les boutons du haut (masqués, sous ⋯ Plus, leur ordre), les lignes masquées de Filtres et
    // « Seulement les vérifiées » (TTB). Seulement quand ils y sont : des réglages par défaut enregistrés avant ne les changent pas.
    ...(Array.isArray(o.hiddenChips) ? { hiddenChips: cleanChips(o.hiddenChips), moreChips: cleanMoreChips(withNewChips(o.moreChips, o.chipsV ?? CHIPS_V), cleanChips(o.hiddenChips)), chipOrder: cleanChipOrder(o.chipOrder), chipsV: CHIPS_V } : {}), // l'état du téléphone n'a pas de chipsV : il est à jour
    ...(Array.isArray(o.hiddenFilters) ? { hiddenFilters: cleanFilterKeys(o.hiddenFilters) } : {}),
    ...(typeof o.ttbOk === 'boolean' ? { ttbOk: o.ttbOk } : {}),
  };
}
/** Mes stations (personnelles, comme mes lieux) : { id, station, label, bus?, moreBus? }, 10 au plus. */
export const cleanMyStations = (a) => (Array.isArray(a) ? a.filter((s) => s && typeof s.station === 'string' && s.station.trim() && typeof s.id === 'string' && /^[\w-]{1,64}$/.test(s.id))
  .map((s) => ({ id: s.id, station: s.station.trim().slice(0, 60), label: String(s.label ?? '').trim().slice(0, 20) || 'Ma station', ...busFields([s.bus, ...(Array.isArray(s.moreBus) ? s.moreBus : [])]) })).slice(0, 10) : []);
/** Arrêts de bus d'une station (v263) : 3 au plus. Le premier reste dans `bus` (comme avant : sauvegardes et empreinte
 *  inchangées), les autres dans `moreBus`, sans doublon. */
export const BUS_STOPS_MAX = 3;
function busFields(list) {
  const out = [];
  for (const b of list.map(cleanBusRef)) if (b && !out.some((x) => x.n === b.n && x.c === b.c)) out.push(b);
  const [bus, ...more] = out.slice(0, BUS_STOPS_MAX);
  return bus ? { bus, ...(more.length ? { moreBus: more } : {}) } : {};
}
/** Tous les arrêts de bus d'une de mes stations, dans mon ordre : [{ n, c }]. */
export const stationBusStops = (s) => [s?.bus, ...(s?.moreBus ?? [])].filter(Boolean);
/** Arrêt de bus « maison » d'une de mes stations (v148) : { n: nom, c: code INSEE }, ou null. */
export function cleanBusRef(b) {
  if (!b || typeof b !== 'object' || typeof b.n !== 'string' || !b.n.trim() || !/^\d{5}$/.test(String(b.c ?? ''))) return null;
  return { n: b.n.trim().slice(0, 60), c: String(b.c) };
}
/** Choisit (ou retire, avec null) un arrêt de bus d'une de mes stations : `slot` 0 = le premier, 1 et 2 = les autres (v263) ;
 *  un `slot` au-delà du dernier en ajoute un. Retirer le premier fait monter le suivant. */
export const setMyStationBus = (state, id, bus, slot = 0) => ({ ...state, myStations: cleanMyStations(cleanMyStations(state.myStations).map((s) => {
  if (s.id !== id) return s;
  const { bus: _old, moreBus: _more, ...rest } = s;
  const list = stationBusStops(s);
  const i = Math.max(0, Math.min(Number(slot) || 0, list.length));
  if (cleanBusRef(bus)) list[i] = cleanBusRef(bus); else list.splice(i, 1);
  return { ...rest, ...busFields(list) };
})) });

export function addMyStation(state, station, label) {
  const list = cleanMyStations(state.myStations);
  const same = list.find((s) => s.station === station);
  if (same) return { ...state, myStations: list.map((s) => (s === same ? { ...s, label: String(label).trim().slice(0, 20) || s.label } : s)) };
  return { ...state, myStations: cleanMyStations([...list, { id: makeId(), station, label }]) };
}
export const removeMyStation = (state, id) => ({ ...state, myStations: cleanMyStations(state.myStations).filter((s) => s.id !== id) });

const cleanMySettings = (o) => (o && typeof o === 'object' && o.settings ? { at: Number.isFinite(o.at) ? o.at : Date.now(), settings: cleanSettings(o.settings) } : null);

/** Fige les réglages actuels comme « mes réglages par défaut ». Renvoie un nouvel état. */
export const saveMySettings = (state, now = Date.now()) => ({ ...state, mySettings: { at: now, settings: cleanSettings(state) } });
/** Remet « mes réglages par défaut ». Renvoie un nouvel état (inchangé s'il n'y en a pas). */
export const applyMySettings = (state) => (state.mySettings ? { ...state, ...cleanSettings(state.mySettings.settings) } : state);
/** Les réglages actuels sont-ils ceux enregistrés par défaut ? */
/** v294 : seuls les réglages que contiennent mes réglages par défaut comptent (ceux enregistrés avant n'ont pas les boutons du haut). */
export const sameAsMySettings = (state) => {
  if (!state.mySettings) return false;
  const now = cleanSettings(state); const mine = cleanSettings(state.mySettings.settings);
  return Object.keys(mine).every((k) => JSON.stringify(now[k]) === JSON.stringify(mine[k]));
};

/** Enregistre l'état. Renvoie false si l'écriture a échoué. */
export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify({ points: state.points, plans: cleanPlans(state.plans, Date.now(), keepDays(state)), rings: state.rings, categories: state.categories, fav: state.fav, lastExport: state.lastExport ?? null, backup: cleanBackup(state.backup), voice: state.voice !== false, ringUnit: state.ringUnit ?? 'm', minuteRings: state.minuteRings, me: state.me ?? '', walk: state.walk ?? { day: '', m: 0 }, chipIcons: state.chipIcons === true, mapTools: normalizeTools(state.mapTools), hiddenTools: cleanHidden(state.hiddenTools), moreTools: cleanMore(state.moreTools, cleanHidden(state.hiddenTools)), toolNames: cleanToolNames(state.toolNames), toolLabels: state.toolLabels === true, startOnMe: startViewOf(state) === 'me', startView: startViewOf(state), vibrateNow: state.vibrateNow === true, jardinsNow: state.jardinsNow === true, evThumbs: state.evThumbs === true, navigo: state.navigo !== false, ...seenSettings(state), seenLast: cleanSeenLast(state.seenLast), masculin: state.masculin === true, showArrNums: state.showArrNums !== false, tuning: cleanTuning(state.tuning), suggestNow: state.suggestNow !== false, alertNear: state.alertNear !== false, ficheHidden: cleanFicheHidden(state.ficheHidden), pace: cleanPace(state.pace), textSize: cleanTextSize(state.textSize), essentials: cleanEssentials(state.essentials), layoutBefore: cleanLayout(state.layoutBefore), layoutV: 4, lists: cleanLists(state.lists), mapStyle: MAP_STYLES.includes(state.mapStyle) ? state.mapStyle : 'classic', theme: ['light', 'dark'].includes(state.theme) ? state.theme : 'auto', toolsSide: state.toolsSide === 'left' ? 'left' : 'right', mySettings: cleanMySettings(state.mySettings), myStations: cleanMyStations(state.myStations), home: cleanHome(state.home), homeOn: state.homeOn === true && Boolean(cleanHome(state.home)), artists: cleanArtists(state.artists), artistLinks: cleanArtistLinks(state.artistLinks), venues: cleanVenues(state.venues), outings: cleanOutings(state.outings), circuitNotes: cleanCircuitNotes(state.circuitNotes), hiddenCircuits: cleanHiddenCircuits(state.hiddenCircuits), notes: cleanNotes(state.notes), showMarkets: state.showMarkets === true, showLines: state.showLines === true, showTtb: state.showTtb === true, ttbOk: state.ttbOk === true, showPratique: state.showPratique === true, showPassages: state.showPassages === true, showJardins: state.showJardins === true, showVelo: state.showVelo === true, busLines: cleanBusLines(state.busLines), showBusLines: state.showBusLines === true, hiddenChips: cleanChips(state.hiddenChips), moreChips: cleanMoreChips(state.moreChips ?? [], cleanChips(state.hiddenChips)), chipOrder: cleanChipOrder(state.chipOrder), chipsV: CHIPS_V, hiddenFilters: cleanFilterKeys(state.hiddenFilters), ...(Array.isArray(state.words) ? { words: cleanWords(state.words) } : {}), routes: cleanRoutes(state.routes), myCircuits: cleanMyCircuits(state.myCircuits) }));
    return true;
  } catch {
    return false;
  }
}

/** Les réglages d'un fichier de sauvegarde, vérifiés (null s'il n'en a pas). */
export function readSettings(obj) {
  const o = obj?.settings && typeof obj.settings === 'object' ? obj.settings : (obj?.fav || obj?.rings ? { fav: obj.fav, rings: obj.rings } : null);
  if (!o) return null;
  const base = cleanSettings(o);
  if (!obj.settings) return { fav: base.fav, rings: base.rings }; // version 2 sans réglages : seulement ce qu'elle contenait
  return { ...base, showMarkets: o.showMarkets === true, showLines: o.showLines === true, showTtb: o.showTtb === true, ttbOk: o.ttbOk === true, showPratique: o.showPratique === true, showPassages: o.showPassages === true, showJardins: o.showJardins === true, showVelo: o.showVelo === true, showBusLines: o.showBusLines === true, hiddenChips: cleanChips(o.hiddenChips), moreChips: cleanMoreChips(withNewChips(o.moreChips, o.chipsV), cleanChips(o.hiddenChips)), chipOrder: cleanChipOrder(o.chipOrder), hiddenFilters: cleanFilterKeys(o.hiddenFilters) };
}

/** Texte du fichier de sauvegarde. */
export function exportJSON(state) {
  return JSON.stringify({
    app: 'carte-paris', version: 2, exported: new Date().toISOString(), owner: state.me ?? '',
    categories: state.categories, fav: state.fav, rings: state.rings, lists: state.lists ?? [],
    mySettings: cleanMySettings(state.mySettings),
    myStations: cleanMyStations(state.myStations),
    ...(Array.isArray(state.words) ? { words: cleanWords(state.words) } : {}), // Mots tout prêts (v226) ; dans le fichier pour un proche seulement si je les coche (v357)
    ...(cleanHome(state.home) ? { home: cleanHome(state.home) } : {}), // Chez moi (v222) : jamais dans le fichier pour un proche
    ...(cleanBusLines(state.busLines).length ? { busLines: cleanBusLines(state.busLines) } : {}), // Mes lignes de bus (v228), sans leurs tracés : jamais pour un proche
    // Mes réglages du moment (affichage, cercles, favori…), remis tels quels quand je restaure sur une appli vide
    settings: { ...cleanSettings(state), showMarkets: state.showMarkets === true, showLines: state.showLines === true, showTtb: state.showTtb === true, ttbOk: state.ttbOk === true, showPratique: state.showPratique === true, showPassages: state.showPassages === true, showJardins: state.showJardins === true, showVelo: state.showVelo === true, showBusLines: state.showBusLines === true, hiddenChips: cleanChips(state.hiddenChips), moreChips: cleanMoreChips(state.moreChips ?? [], cleanChips(state.hiddenChips)), chipOrder: cleanChipOrder(state.chipOrder), chipsV: CHIPS_V, hiddenFilters: cleanFilterKeys(state.hiddenFilters) },
    // Chaque lieu porte le prénom de qui l'a ajouté, même si le fichier passe ensuite de main en main.
    points: state.points.map((p) => ({ ...p, owner: p.owner || state.me || '' })),
    // Sorties de l'agenda prévues (gardées à part de mes lieux)
    plans: cleanPlans(state.plans, Date.now(), keepDays(state)),
    // Mes artistes (v158) et mon carnet de sorties de l'agenda (v158) : seulement s'il y en a
    ...(cleanArtists(state.artists).length ? { artists: cleanArtists(state.artists) } : {}),
    ...(Object.keys(cleanArtistLinks(state.artistLinks)).length ? { artistLinks: cleanArtistLinks(state.artistLinks) } : {}), // sites des artistes (v161)
    ...(cleanVenues(state.venues).length ? { venues: cleanVenues(state.venues) } : {}), // Mes salles (v166)
    ...(cleanOutings(state.outings).length ? { outings: cleanOutings(state.outings) } : {}),
    ...(cleanCircuitNotes(state.circuitNotes).length ? { circuitNotes: cleanCircuitNotes(state.circuitNotes) } : {}), // problèmes notés sur les circuits (v172)
    ...(cleanHiddenCircuits(state.hiddenCircuits).length ? { hiddenCircuits: cleanHiddenCircuits(state.hiddenCircuits) } : {}),
    ...(cleanNotes(state.notes).length ? { notes: cleanNotes(state.notes) } : {}), // Note du jour (v205) : jamais dans le fichier pour un proche
    ...(cleanRoutes(state.routes).length ? { routes: cleanRoutes(state.routes) } : {}), // Mes parcours (étapes seules) : pas dans le fichier pour un proche
    ...(cleanMyCircuits(state.myCircuits).length ? { myCircuits: cleanMyCircuits(state.myCircuits) } : {}), // Mes circuits (v2) : chez un proche seulement si je les coche
  }, null, 2);
}

/* ---------- Envoyer à un proche (v180, décidé le 18 nov.) ----------
   Un fichier séparé de ma sauvegarde : seulement ce que je coche, seulement mes lieux (pas ceux de mes proches),
   jamais mes billets, mes réglages, mes stations, mon journal ni mes problèmes notés. */
/** En arrivant sur la page : les lieux et les notes sont cochés, le reste non (la liste TTB aussi). */
export const SEND_DEFAULT = Object.freeze({ lieux: true, notes: true, passages: false, photos: false, plans: false, artists: false, venues: false, ttb: false, circuits: false, words: false }); // v357 : mes Mots tout prêts, seulement si je les coche
/** Mes lieux qui partent : `cats` = catégories choisies (null = toutes), `lists` = listes choisies (elles s'ajoutent). */
export function sendPoints(state, cats = null, lists = new Set()) {
  return (state.points ?? []).filter((p) => !p.owner && (cats === null || cats.has(p.cat) || (p.lists ?? []).some((l) => lists.has(l))));
}
/** Mes sorties de l'agenda qui peuvent partir (v207) : à partir d'aujourd'hui, et seulement les miennes. Une sortie passée
 * (« Tu y es allée ? », « Pas allé ») ou encore « Prévu par » un autre proche ne part pas : chez lui, elle porterait mon prénom à tort. */
export function sendPlans(state, now = new Date()) {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return cleanPlans(state.plans, now.getTime()).filter((x) => !x.by && x.ticket.at >= t0);
}
/** L'objet du fichier pour un proche (sans les photos ni TTB : l'appli les ajoute si la case est cochée). */
export function exportForFriend(state, sel = SEND_DEFAULT, cats = null, lists = new Set()) {
  const pts = sel.lieux ? sendPoints(state, cats, lists) : [];
  const used = new Set(pts.map((p) => p.cat));
  const points = pts.map((p) => {
    const c = { ...p, owner: state.me || '' };
    delete c.ticket; // mes billets restent à moi
    delete c.fav; delete c.done; delete c.visited; // mes favoris et mes « Déjà visité » (avec leur date) restent à moi (audit du 18 nov., choix 2A) ; les étoiles partent
    if (!sel.notes) c.note = '';
    if (!sel.photos) delete c.photos;
    if (!sel.passages) delete c.passages;
    else if (!sel.photos && c.passages) c.passages = c.passages.map(({ photo, ...x }) => x);
    return c;
  });
  const plans = sel.plans ? sendPlans(state) : [];
  const artists = sel.artists ? cleanArtists(state.artists) : [];
  const venues = sel.venues ? cleanVenues(state.venues) : [];
  // Mes circuits (v2) : seulement si je les coche ; mes textes d'étapes suivent la case des commentaires ; ceux reçus d'un proche ne repartent pas
  const myCircuits = sel.circuits ? cleanMyCircuits(state.myCircuits).filter((c) => !c.by).map(({ by: _b, from: _f, base: _x, baseFp: _y, moved: _z, ...c }) => // ma version d'un circuit de Claude part comme un circuit à moi
 (sel.notes ? c : { ...c, etapes: c.etapes.map(({ t: _t, ...e }) => e) })) : [];
  const sent = [points.length ? 'lieux' : '', points.length && sel.notes ? 'notes' : '', points.length && sel.passages ? 'passages' : '',
    plans.length ? 'plans' : '', artists.length ? 'artists' : '', venues.length ? 'venues' : '', myCircuits.length ? 'circuits' : '', sel.words ? 'words' : ''].filter(Boolean);
  return {
    app: 'carte-paris', version: 2, kind: 'proche', exported: new Date().toISOString(), owner: state.me ?? '', sent,
    categories: (state.categories ?? []).filter((c) => used.has(c.id)).map(({ words: w, ...c }) => (sel.words && typeof w === 'string' ? { ...c, words: w } : c)), // mes Mots tout prêts : seulement si je les coche (v357 ; avant, jamais, v226)
    lists: (state.lists ?? []).filter((l) => pts.some((p) => (p.lists ?? []).includes(l.id))),
    points,
    ...(plans.length ? { plans } : {}),
    ...(artists.length ? { artists } : {}),
    ...(venues.length ? { venues } : {}),
    ...(myCircuits.length ? { myCircuits } : {}),
    ...(sel.words ? { words: wordsOf(state) } : {}),
  };
}
/** Nom du fichier pour un proche. */
/** v352 : le fichier de mes seules adresses TTB vérifiées pour un proche. */
export function ttbFileName(date, me, count) {
  const z = (n) => String(n).padStart(2, '0');
  return `Ma carte de Paris - TTB vérifiées${me ? ` de ${String(me).replace(/[\\/:*?"<>|]/g, '').slice(0, 30)}` : ''} du ${z(date.getDate())}-${z(date.getMonth() + 1)}-${date.getFullYear()} (${count} adresse${count > 1 ? 's' : ''}).json`;
}
export function friendFileName(date, me, count) {
  const z = (n) => String(n).padStart(2, '0');
  return `Ma carte de Paris - ${me ? `lieux de ${String(me).replace(/[\\/:*?"<>|]/g, '').slice(0, 30)}` : 'lieux'} du ${z(date.getDate())}-${z(date.getMonth() + 1)}-${date.getFullYear()} (${count} lieu${count > 1 ? 'x' : ''}).json`;
}

/* ---------- Importer les lieux d'un proche, en choisissant (v181) ----------
   `choice` : { lieux, notes, passages, photos, cats (Set ou null = toutes), artists (Set de noms), venues (Set), plans (Set d'id) }.
   Un lieu qu'elle a déjà (même nom à moins de 60 m, ou n'importe quel lieu à moins de 12 m) n'est pas ajouté une seconde fois.
   Un lieu déjà reçu de la même personne (même id) est mis à jour ; rien n'est jamais retiré. */
const sameName = (a, b) => foldName(a) === foldName(b);
export function mergeFriend(state, obj, owner, choice) {
  if (!obj || obj.app !== 'carte-paris' || !Array.isArray(obj.points)) throw new Error('Ce fichier n\'est pas un fichier de Ma carte de Paris.');
  const who = String(owner ?? '').trim().slice(0, 30);
  const fileCats = Array.isArray(obj.categories) ? cleanCategories(obj.categories) : defaults();
  const categories = state.categories.map((c) => ({ ...c }));
  const catIds = new Set(categories.map((c) => c.id));
  const allIds = new Set([...catIds, ...fileCats.map((c) => c.id)]);
  const keep = (p) => choice.lieux && validatePoint(p, [...allIds]) && (choice.cats == null || choice.cats.has(p.cat));
  const kept = obj.points.filter(keep);
  for (const c of fileCats) if (!catIds.has(c.id) && kept.some((p) => p.cat === c.id)) { categories.push(c); catIds.add(c.id); }
  const lists = [...(state.lists ?? [])];
  const listIds = new Set(lists.map((l) => l.id));
  const usedLists = new Set(kept.flatMap((p) => (Array.isArray(p?.lists) ? p.lists : [])));
  for (const l of cleanLists(obj.lists)) if (!listIds.has(l.id) && usedLists.has(l.id)) { lists.push(l); listIds.add(l.id); }
  const points = state.points.map((p) => ({ ...p }));
  let added = 0, updated = 0, dups = 0;
  const skipped = obj.points.length - obj.points.filter((p) => validatePoint(p, [...allIds])).length;
  for (const p of kept) {
    const c = clean(p);
    c.owner = c.owner || who;
    if (state.me && c.owner === state.me) c.owner = '';
    delete c.ticket;
    if (c.owner) { c.fav = false; c.done = false; c.visited = null; } // ses favoris et ses « Déjà visité » restent à lui (audit du 18 nov., choix 1A) ; ses étoiles restent, comme avis
    c.lists = c.lists.filter((x) => listIds.has(x));
    if (!choice.notes) c.note = '';
    if (!choice.photos) { delete c.photos; if (c.passages) c.passages = c.passages.map(({ photo, ...x }) => x); }
    if (!choice.passages) delete c.passages;
    const i = points.findIndex((x) => x.id === c.id);
    if (i >= 0) {
      if (!points[i].owner || points[i].owner !== c.owner) continue; // un de ses lieux à elle : on n'y touche pas
      const old = points[i];
      const next = { ...old, name: c.name, cat: c.cat, lat: c.lat, lng: c.lng, address: c.address, hours: c.hours, ...(Number.isFinite(c.hoursAt) ? { hoursAt: c.hoursAt } : {}), lists: c.lists,
        ...(choice.notes ? { note: c.note } : {}), ...(c.artist ? { artist: c.artist } : {}), ...(c.rub !== undefined ? { rub: c.rub } : {}), ...(c.pass ? { pass: true } : {}), ...(c.sub ? { sub: c.sub } : {}), ...(Number.isFinite(c.shot) ? { shot: c.shot } : {}),
        ...(choice.passages && c.passages ? { passages: c.passages } : {}), ...(choice.photos && c.photos ? { photos: c.photos } : {}) };
      if (c.gone) next.gone = c.gone; else delete next.gone;
      // v291 : la date de ses horaires suit ses horaires (de nouveaux horaires sans date ne gardent pas celle des anciens)
      if (!Number.isFinite(c.hoursAt) && c.hours !== old.hours) delete next.hoursAt;
      // v291 : « Toujours ouvert » (v274) revu par lui depuis : la date la plus récente des deux reste (« a pu fermer » ne revient pas à tort)
      if (Number.isFinite(c.checked) && !(old.checked >= c.checked)) next.checked = c.checked;
      // v292 (mon choix A du 20 nov.) : ses étoiles, « Abrité » et « Le bon moment » suivent aussi, comme son commentaire
      next.stars = c.stars; next.covered = c.covered;
      if (c.line) next.line = c.line; else delete next.line; // v384 : le tracé de sa rue d'intérêt suit
      if (c.moments) next.moments = c.moments; else delete next.moments;
      if (JSON.stringify(next) !== JSON.stringify(old)) { points[i] = next; updated++; }
      continue;
    }
    if (points.some((x) => (sameName(x.name, c.name) && distanceM(x, c) < 60) || distanceM(x, c) < 12)) { dups++; continue; }
    points.push(c); added++;
  }
  const artists = cleanArtists([...(state.artists ?? []), ...cleanArtists(obj.artists).filter((a) => choice.artists?.has(a))]);
  const venues = cleanVenues([...(state.venues ?? []), ...cleanVenues(obj.venues).filter((v) => choice.venues?.has(v))]);
  const theirPlans = cleanPlans(obj.plans).filter((x) => choice.plans?.has(x.id)).map((x) => ({ ...x, by: who || x.by || '' }));
  const plans = cleanPlans([...(state.plans ?? []), ...theirPlans.filter((x) => !(state.plans ?? []).some((y) => y.id === x.id || (y.name === x.name && Math.abs(y.ticket.at - x.ticket.at) < 864e5)))], Date.now(), keepDays(state));
  // v357 : ses Mots tout prêts, seulement si je les coche ; ses séries s'ajoutent aux miennes, une série du même nom ou du même identifiant reste la mienne
  let words = state.words, wordsAdded = 0;
  const theirWords = choice.words && Array.isArray(obj.words) ? cleanWords(obj.words) : [];
  if (theirWords.length) {
    const mineW = wordsOf(state);
    const merged = cleanWords([...mineW, ...theirWords]);
    wordsAdded = merged.length - mineW.length;
    if (wordsAdded) words = merged;
    const fold = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const same = Object.fromEntries(theirWords.map((t) => [t.id, (merged.find((m) => m.id === t.id) ?? merged.find((m) => fold(m.name) === fold(t.name)))?.id ?? '']));
    for (const c of categories) if (!(state.categories ?? []).some((x) => x.id === c.id) && typeof c.words === 'string' && c.words in same) c.words = same[c.words]; // une de ses catégories nouvelle chez moi garde sa série
  }
  for (const c of categories) if (!(state.categories ?? []).some((x) => x.id === c.id) && !choice.words) delete c.words;
  return {
    state: { ...state, points, categories, lists, artists, venues, plans, ...(words !== state.words ? { words } : {}) },
    added, updated, dups, skipped, words: wordsAdded,
    artists: artists.length - cleanArtists(state.artists).length, venues: venues.length - cleanVenues(state.venues).length,
    plans: plans.length - cleanPlans(state.plans, Date.now(), keepDays(state)).length,
  };
}

/**
 * Ajoute les catégories et les lieux d'un fichier de sauvegarde, sans doublon (même id).
 * Ne modifie pas l'état reçu. Lève une erreur si le fichier n'est pas une sauvegarde valide.
 */
/** Prénom indiqué dans un fichier de sauvegarde ('' s'il n'y en a pas ou si le fichier est illisible). */
export function fileOwner(text) {
  try {
    const o = JSON.parse(text)?.owner;
    return typeof o === 'string' ? o.trim().slice(0, 30) : '';
  } catch { return ''; }
}

/**
 * `owner` : à qui appartiennent les lieux du fichier ('' = ce sont les miens, par exemple une sauvegarde).
 * Les lieux qu'un ami avait lui-même reçus d'une autre personne gardent le nom de cette personne,
 * et ceux qui portent mon prénom redeviennent les miens.
 */
export function mergeImport(state, text, owner = '') {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n\'est pas une sauvegarde lisible.');
  }
  if (!obj || obj.app !== 'carte-paris' || !Array.isArray(obj.points)) {
    throw new Error('Ce fichier n\'est pas une sauvegarde de Ma carte de Paris.');
  }
  // Les fichiers de la version 1 n'ont pas de catégories : ils utilisaient celles d'origine.
  const fileCats = Array.isArray(obj.categories) ? cleanCategories(obj.categories) : defaults();
  // Ma sauvegarde remise sur une appli vide : mes catégories et mes listes reviennent telles quelles (noms, couleurs,
  // icônes, « Déjà goûté »…, même celles qui n'ont pas encore de lieu). Avant, une catégorie d'origine gardait son nom d'origine.
  const restore = !owner && !(state.points ?? []).length;
  const categories = restore && fileCats.length ? fileCats.map((c) => ({ ...c })) : state.categories.map((c) => ({ ...c }));
  const catIds = new Set(categories.map((c) => c.id));
  const usedCats = new Set(obj.points.map((p) => p?.cat));
  for (const c of fileCats) {
    if (!catIds.has(c.id) && usedCats.has(c.id)) { categories.push(c); catIds.add(c.id); }
  }

  // Listes du fichier : ajoutées si elles servent et ne sont pas déjà là (même id) ; toutes, pour une restauration
  const lists = [...(state.lists ?? [])];
  const listIds = new Set(lists.map((l) => l.id));
  const usedLists = new Set(obj.points.flatMap((p) => (Array.isArray(p?.lists) ? p.lists : [])));
  for (const l of cleanLists(obj.lists)) if (!listIds.has(l.id) && (restore || usedLists.has(l.id))) { lists.push(l); listIds.add(l.id); }

  // Mon prénom : celui de l'appli, sinon (restauration sur une appli vide) celui du fichier, pour que mes lieux restent les miens
  const fileMe = typeof obj.owner === 'string' ? obj.owner.trim().slice(0, 30) : '';
  const me = state.me || (!owner ? fileMe : '');
  const known = new Set(state.points.map((p) => p.id));
  const points = [...state.points];
  let added = 0;
  let skipped = 0;
  let already = 0; // v293 : lieux déjà sur le téléphone (même id), gardés tels quels : le message le dit
  for (const p of obj.points) {
    if (!validatePoint(p, [...catIds])) { skipped++; continue; }
    if (known.has(p.id)) { already++; continue; }
    known.add(p.id);
    const c = clean(p);
    c.lists = c.lists.filter((x) => listIds.has(x));
    if (owner) { c.owner = c.owner || owner; delete c.ticket; if (c.owner !== me) { c.fav = false; c.done = false; c.visited = null; } } // ses billets, ses favoris et ses « Déjà visité » restent à lui : on ne voit que ses lieux (une sortie à deux passe par une invitation)
    if (me && c.owner === me) c.owner = '';
    points.push(c);
    added++;
  }
  // Ma propre sauvegarde : je retrouve aussi mes réglages par défaut (sans les appliquer d'office)
  const mine = !owner ? cleanMySettings(obj.mySettings) : null;
  // Mes stations aussi, seulement depuis ma propre sauvegarde (celles d'un ami restent les siennes)
  const myStations = !owner ? cleanMyStations([...(state.myStations ?? []), ...cleanMyStations(obj.myStations).filter((s) => !(state.myStations ?? []).some((x) => x.station === s.station))]) : state.myStations;
  // Chez moi (v222) : seulement depuis ma propre sauvegarde ; une adresse déjà enregistrée sur le téléphone reste
  const home = !owner ? cleanHome(state.home) ?? cleanHome(obj.home) : cleanHome(state.home);
  // Mes lignes de bus (v228) : seulement depuis ma propre sauvegarde, ajoutées à celles du téléphone
  const busLines = !owner ? cleanBusLines([...cleanBusLines(state.busLines), ...cleanBusLines(obj.busLines)]) : cleanBusLines(state.busLines);
  // Réglages du fichier (seulement ma propre sauvegarde) : l'appli les remet quand elle était vide. Anciens fichiers : favori et cercles.
  const settings = owner ? null : readSettings(obj);
  // Mes sorties de l'agenda prévues : seulement depuis ma propre sauvegarde (même id = déjà là)
  const keep = Math.max(keepDays(state), keepDays(obj?.settings)); /* v214 : la durée réglée ici ou dans le fichier, la plus longue */
  const plans = !owner ? cleanPlans([...(state.plans ?? []), ...cleanPlans(obj.plans, Date.now(), keep).filter((x) => !(state.plans ?? []).some((y) => y.id === x.id))], Date.now(), keep) : (state.plans ?? []);
  // Mes artistes et mon carnet : seulement depuis ma propre sauvegarde, ajoutés à ce qui est déjà là
  const artists = !owner ? cleanArtists([...(state.artists ?? []), ...cleanArtists(obj.artists)]) : cleanArtists(state.artists);
  const venues = !owner ? cleanVenues([...(state.venues ?? []), ...cleanVenues(obj.venues)]) : cleanVenues(state.venues);
  const artistLinks = !owner ? cleanArtistLinks({ ...cleanArtistLinks(obj.artistLinks), ...cleanArtistLinks(state.artistLinks) }) : cleanArtistLinks(state.artistLinks);
  const outings = !owner ? cleanOutings([...(state.outings ?? []), ...cleanOutings(obj.outings).filter((x) => !(state.outings ?? []).some((y) => y.id === x.id))]) : cleanOutings(state.outings);
  const circuitNotes = !owner ? cleanCircuitNotes([...(state.circuitNotes ?? []), ...cleanCircuitNotes(obj.circuitNotes)]) : cleanCircuitNotes(state.circuitNotes);
  const hiddenCircuits = !owner ? cleanHiddenCircuits([...(state.hiddenCircuits ?? []), ...cleanHiddenCircuits(obj.hiddenCircuits)]) : cleanHiddenCircuits(state.hiddenCircuits);
  // Note du jour (v205) : seulement depuis ma propre sauvegarde ; un jour déjà noté sur le téléphone garde sa note
  const notes = !owner ? cleanNotes([...cleanNotes(state.notes), ...cleanNotes(obj.notes)]) : cleanNotes(state.notes);
  // Mes parcours : seulement depuis ma propre sauvegarde ; un parcours déjà sur le téléphone (même id) garde sa version
  const routes = !owner ? cleanRoutes([...cleanRoutes(state.routes), ...cleanRoutes(obj.routes)]) : cleanRoutes(state.routes);
  // Mes circuits : ceux de ma sauvegarde, et ceux qu'un proche m'envoie (marqués de son prénom) ; même id = déjà là
  const myCircuits = cleanMyCircuits([...cleanMyCircuits(state.myCircuits), ...cleanMyCircuits(obj.myCircuits).map((c) => (owner ? { ...c, by: owner } : c))]);
  // Mots tout prêts (v226) : seulement depuis ma propre sauvegarde ; restaurés tels quels sur une appli vide, sinon les séries manquantes s'ajoutent
  const fileWords = !owner && Array.isArray(obj.words) ? cleanWords(obj.words) : null;
  const words = !fileWords ? state.words : restore ? fileWords : cleanWords([...wordsOf(state), ...fileWords]);
  return { state: { ...state, points, plans, artists, artistLinks, venues, outings, circuitNotes, hiddenCircuits, notes, categories, lists, words, routes, myCircuits, ...(myStations ? { myStations } : {}), ...(home ? { home } : {}), busLines, ...(mine && !state.mySettings ? { mySettings: mine } : {}) }, added, skipped, already, settings };
}

function checkFields({ name, color, icon = DEFAULT_ICON, log = '', did = '', words }, keepColor = null) {
  const n = String(name ?? '').trim();
  if (!n) throw new Error('Donne un nom à la catégorie.');
  if (!PALETTE.includes(color) && color !== keepColor) throw new Error('Choisis une couleur dans la liste.');
  if (!ICONS.includes(icon)) throw new Error('Choisis une icône dans la liste.');
  return { name: n.slice(0, NAME_MAX), color, icon, ...(cleanLog(log) ? { log: cleanLog(log) } : {}), ...(cleanLog(did) ? { did: cleanLog(did) } : {}), ...(typeof words === 'string' && /^[\w-]{0,64}$/.test(words) ? { words } : {}) };
}

/** v209 : deux catégories ne portent pas le même nom (majuscules et accents comptent pour rien), comme les listes. */
function checkUnique(categories, name, id = null) {
  const same = categories.find((c) => c.id !== id && foldName(c.name) === foldName(name));
  if (same) throw new Error(`La catégorie « ${same.name} » existe déjà.`);
}

/** Ajoute une catégorie. Renvoie un nouvel état. */
export function addCategory(state, fields) {
  const f = checkFields(fields);
  checkUnique(state.categories, f.name);
  return { ...state, categories: [...state.categories, { id: makeId(), ...f }] };
}

/** Renomme ou recolore une catégorie. Renvoie un nouvel état. */
export function updateCategory(state, id, fields) {
  // Une couleur déjà utilisée reste acceptée même si elle a quitté la palette.
  const f = checkFields(fields, state.categories.find((c) => c.id === id)?.color);
  // Un nom gardé tel quel passe toujours (un doublon d'avant la v209 se modifie encore) ; un nouveau nom ne doit pas exister
  if (foldName(f.name) !== foldName(state.categories.find((c) => c.id === id)?.name ?? '')) checkUnique(state.categories, f.name, id);
  // Nom d'historique ou de « Déjà visité » effacé (champ vide) : on revient au nom par défaut
  const clear = (c) => { const out = { ...c, ...f }; for (const k of ['log', 'did']) if (k in fields && !f[k]) delete out[k]; return out; };
  return { ...state, categories: state.categories.map((c) => (c.id === id ? clear(c) : c)) };
}

/**
 * Supprime une catégorie. Ses lieux vont dans `moveTo`, obligatoire s'il y en a.
 * Il doit rester au moins une catégorie.
 */
export function deleteCategory(state, id, moveTo) {
  if (state.categories.length <= 1) throw new Error('Il faut garder au moins une catégorie.');
  const hasPoints = state.points.some((p) => p.cat === id);
  const target = state.categories.find((c) => c.id === moveTo && c.id !== id);
  if (hasPoints && !target) throw new Error('Choisis la catégorie où ranger ses lieux.');
  return {
    ...state,
    categories: state.categories.filter((c) => c.id !== id),
    points: state.points.map((p) => { if (p.cat !== id) return p; const { sub, ...q } = p; return { ...q, cat: target.id }; }), // v305 : sa sous-catégorie reste dans l'ancienne
  };
}

/* ---------- Sous-catégories (v305) : seulement pour mes lieux pris en passant ; Street art a l'artiste à la place ---------- */
const subsOf = (state, catId) => state.categories.find((c) => c.id === catId)?.subs ?? [];
const withSubs = (state, catId, subs) => ({ ...state, categories: state.categories.map((c) => { if (c.id !== catId) return c; const { subs: _, ...rest } = c; return subs.length ? { ...rest, subs } : rest; }) });
/** Ajoute une sous-catégorie (ou reprend celle qui a déjà ce nom). Renvoie { state, id }. */
export function addSub(state, catId, name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, SUB_MAX);
  if (!n) throw new Error('Donne un nom à la sous-catégorie.');
  if (!state.categories.some((c) => c.id === catId)) throw new Error('Choisis d\'abord la catégorie.');
  const same = subsOf(state, catId).find((x) => foldName(x.name) === foldName(n));
  if (same) return { state, id: same.id };
  const id = makeId();
  return { state: withSubs(state, catId, [...subsOf(state, catId), { id, name: n }]), id };
}
export function renameSub(state, catId, subId, name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, SUB_MAX);
  if (!n) throw new Error('Donne un nom à la sous-catégorie.');
  const same = subsOf(state, catId).find((x) => x.id !== subId && foldName(x.name) === foldName(n));
  if (same) throw new Error(`La sous-catégorie « ${same.name} » existe déjà.`);
  return withSubs(state, catId, subsOf(state, catId).map((x) => (x.id === subId ? { ...x, name: n } : x)));
}
/** v311 : monte (-1) ou descend (+1) une sous-catégorie : l'ordre où elle est proposée après la photo. */
export function moveSub(state, catId, subId, delta) {
  const list = [...subsOf(state, catId)];
  const i = list.findIndex((x) => x.id === subId); const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return state;
  [list[i], list[j]] = [list[j], list[i]];
  return withSubs(state, catId, list);
}
/** v311 : l'ordre des catégories après la photo : `ids` (toutes, dans l'ordre de départ), rangées selon `order`, les autres au bout. */
export function seenOrderOf(order, ids) {
  const known = (order ?? []).filter((id) => ids.includes(id));
  return [...known, ...ids.filter((id) => !known.includes(id))];
}
/** Supprime une sous-catégorie : ses lieux et leurs photos restent, sans sous-catégorie. */
export function deleteSub(state, catId, subId) {
  const next = withSubs(state, catId, subsOf(state, catId).filter((x) => x.id !== subId));
  return { ...next, points: next.points.map((p) => { if (p.cat !== catId || p.sub !== subId) return p; const { sub, ...q } = p; return q; }) };
}
/** Le nom de la sous-catégorie d'un lieu, ou '' (une sous-catégorie d'une autre catégorie ne compte pas). */
export const subNameOf = (categories, p) => (p?.sub ? (categories ?? []).find((c) => c.id === p.cat)?.subs?.find((x) => x.id === p.sub)?.name ?? '' : '');

/** Styles de carte proposés dans les Réglages. */
export const MAP_STYLES = ['classic', 'clean', 'fr', 'hot', 'pastel', 'night', 'eclairci', 'positron', 'darkmatter', 'ign', 'photo'];

/** Boutons à droite de la carte, dans l'ordre par défaut (de haut en bas). */
// « Ma position et direction » en bas, sous le pouce : c'est le bouton le plus utilisé en marchant.
// v381 (mon choix 9A du 24 nov.) : « Vu en passant » (l'appareil photo en un appui), tout en haut de la colonne
export const MAP_TOOLS = ['vu', 'paris', 'pratique', 'metro', 'velib', 'home', 'sorties', 'planning', 'circuits', 'notes', 'locate'];
/** Boutons rangés au départ dans « Plus » (un appui sur ⋯ les montre, avec leur nom). */
export const DEFAULT_MORE = ['pratique', 'velib', 'home', 'circuits', 'notes'];
/** Boutons arrivés après coup et rangés d'office dans « Plus » chez qui avait déjà ses boutons (v168 : Circuits ; v205 : Note du jour). */
export const NEW_IN_MORE = ['circuits', 'notes'];
/** Ajoute à « Plus » les boutons nouveaux que la disposition gardée ne connaissait pas encore (rien ne s'ajoute sur la carte tout seul). */
export function withNewInMore(more, savedTools) {
  const list = Array.isArray(more) ? [...more] : [];
  if (!Array.isArray(savedTools)) return list;
  for (const t of NEW_IN_MORE) if (!savedTools.includes(t) && !list.includes(t)) list.push(t);
  return list;
}
/** Boutons dans « Plus » : noms connus, sans doublon, jamais un bouton caché. */
export function cleanMore(list, hidden = []) {
  return Array.isArray(list) ? MAP_TOOLS.filter((t) => list.includes(t) && !hidden.includes(t)) : [];
}
/** L'essentiel (v147) : les boutons gardés sur la carte d'un appui ; au départ M, Sorties, Rentrer, Ma position. */
export const DEFAULT_ESSENTIALS = ['metro', 'home', 'sorties', 'locate']; // dans l'ordre de MAP_TOOLS (nettoyage idempotent)
/** Boutons de l'essentiel : connus, sans doublon, au moins un (sinon ceux du départ). */
export function cleanEssentials(list) {
  const l = Array.isArray(list) ? MAP_TOOLS.filter((t) => list.includes(t)) : [];
  return l.length ? l : [...DEFAULT_ESSENTIALS];
}
/** Disposition gardée pour « Remettre mes boutons d'avant » : { mapTools, hiddenTools, moreTools }, ou null. */
export function cleanLayout(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const hiddenTools = cleanHidden(o.hiddenTools);
  return { mapTools: normalizeTools(o.mapTools), hiddenTools, moreTools: cleanMore(withNewInMore(o.moreTools, o.mapTools), hiddenTools) };
}
/** Ne garder que l'essentiel : les boutons choisis sur la carte, tous les autres dans Plus (aucun masqué). L'ordre ne change pas. */
export function essentialLayout(s) {
  const ess = cleanEssentials(s.essentials);
  return { hiddenTools: [], moreTools: MAP_TOOLS.filter((t) => !ess.includes(t)),
    // déjà appliqué : on garde la disposition d'avant la première fois (« Remettre mes boutons d'avant » y revient)
    layoutBefore: cleanLayout(s.layoutBefore) ?? cleanLayout({ mapTools: s.mapTools, hiddenTools: s.hiddenTools, moreTools: s.moreTools }) };
}
/** Taille du texte (v144) : 'normal', 'grand' (×1,15) ou 'tresgrand' (×1,3) ; CSS :root[data-text]. */
export const TEXT_SIZES = ['normal', 'grand', 'tresgrand'];
export const cleanTextSize = (v) => (TEXT_SIZES.includes(v) ? v : 'normal');
/** Mon pas (v142) : trois modes, chacun avec sa vitesse réglable ; « Normal » = 5 km/h, la vitesse d'avant. */
export const PACES = ['rapide', 'normal', 'tranquille'];
export const DEFAULT_PACE_KMH = { rapide: 6, normal: 5, tranquille: 3.5 };
/** { mode, kmh: { rapide, normal, tranquille } } : vitesses de 2 à 7 km/h, par demi-km/h. */
export function cleanPace(o) {
  const src = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  const raw = src.kmh && typeof src.kmh === 'object' && !Array.isArray(src.kmh) ? src.kmh : {};
  const kmh = {};
  for (const m of PACES) {
    const v = Number(Object.hasOwn(raw, m) ? raw[m] : NaN);
    kmh[m] = Number.isFinite(v) && v > 0 ? Math.min(7, Math.max(2, Math.round(v * 2) / 2)) : DEFAULT_PACE_KMH[m];
  }
  return { mode: PACES.includes(src.mode) ? src.mode : 'normal', kmh };
}
/** Vitesse du mode choisi (km/h). */
export const paceKmh = (pace) => { const p = cleanPace(pace); return p.kmh[p.mode]; };
/** Longueur maximale d'un nom de bouton choisi par la personne. */
export const TOOL_NAME_MAX = 16;
/** Un nom de bouton tapé : sans caractères de contrôle ni espaces en trop, TOOL_NAME_MAX caractères au plus. */
export const cleanToolName = (v) => (typeof v === 'string' ? [...v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()].slice(0, TOOL_NAME_MAX).join('').trim() : '');
/** Noms choisis pour les boutons de la carte (v139) : { outil: nom }, seulement des boutons connus et des noms non vides. */
export function cleanToolNames(o) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const t of MAP_TOOLS) { const v = Object.hasOwn(o, t) ? cleanToolName(o[t]) : ''; if (v) out[t] = v; }
  return out;
}
/** Passage à la v124 : Paris prend la place de Fontaine et WC (et se montre), Fontaine, Vélib' et Rentrer vont dans « Plus ». */
export function layoutV4(tools, hidden) {
  const t = normalizeTools(tools);
  const i = t.indexOf('pratique');
  const j = t.indexOf('paris');
  if (i >= 0 && j > i) { t.splice(j, 1); t.splice(i, 0, 'paris'); }
  const h = cleanHidden(hidden).filter((x) => x !== 'paris');
  return { mapTools: t, hiddenTools: h, moreTools: cleanMore(DEFAULT_MORE, h) };
}

/** Garde un ordre valide : chaque bouton une fois, ceux qui manquent ajoutés à la fin. */
export function normalizeTools(list) {
  const out = Array.isArray(list) ? list.filter((t, i) => MAP_TOOLS.includes(t) && list.indexOf(t) === i) : [];
  // Un bouton nouveau arrive juste avant « Ma position » (le gros bouton du bas reste en bas)
  for (const t of MAP_TOOLS.filter((x) => !out.includes(x))) {
    const i = out.indexOf('locate');
    if (t === 'vu') out.unshift(t); // v381 (mon choix 9A) : tout en haut, les boutons près du pouce ne bougent pas
    else if (i >= 0 && t !== 'locate') out.splice(i, 0, t); else out.push(t);
  }
  return out;
}

/** Boutons de la carte masqués : seulement des noms connus, sans doublon. */
/** Boutons cachés au départ (réactivables dans Réglages → Boutons de la carte) : la colonne reste lisible. */
export const DEFAULT_HIDDEN = ['paris'];

export function cleanHidden(list) {
  return Array.isArray(list) ? MAP_TOOLS.filter((t) => list.includes(t)) : [];
}

/** Déplace un bouton de la carte d'une place. Renvoie la nouvelle liste. */
export function moveTool(list, id, delta) {
  const l = normalizeTools(list);
  const i = l.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= l.length) return l;
  [l[i], l[j]] = [l[j], l[i]];
  return l;
}

/** Déplace un bouton de la carte d'une place dans son groupe (Carte, Plus ou Masqué) : il échange sa place avec
 * le voisin du même groupe, les autres ne bougent pas. `groupOf(t)` dit le groupe d'un bouton. Renvoie la nouvelle liste. */
export function moveToolIn(list, id, delta, groupOf) {
  const l = normalizeTools(list);
  const i = l.indexOf(id);
  if (i < 0) return l;
  const g = groupOf(id);
  let j = i + delta;
  while (j >= 0 && j < l.length && groupOf(l[j]) !== g) j += delta;
  if (j < 0 || j >= l.length) return l;
  [l[i], l[j]] = [l[j], l[i]];
  return l;
}

/** Déplace une catégorie d'une place (delta = -1 vers le haut, +1 vers le bas). Renvoie un nouvel état. */
export function moveCategory(state, id, delta) {
  const list = [...state.categories];
  const i = list.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return state;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...state, categories: list };
}

/** Crée une liste (« Pour fêter », « Avec Paul »…), ou reprend celle qui a déjà ce nom. Renvoie { state, id }. */
export function addList(state, name) {
  const n = String(name ?? '').trim().slice(0, 30);
  if (!n) throw new Error('Donne un nom à la liste.');
  const same = (state.lists ?? []).find((l) => l.name.toLowerCase() === n.toLowerCase());
  if (same) return { state, id: same.id };
  const id = makeId();
  return { state: { ...state, lists: [...(state.lists ?? []), { id, name: n }] }, id };
}

/** Met exactement les lieux `ids` dans la liste (ajoute ceux qui manquent, retire les autres). Renvoie un nouvel état. */
export function setListMembers(state, listId, ids) {
  const keep = new Set(ids);
  return { ...state, points: state.points.map((p) => {
    const has = (p.lists ?? []).includes(listId);
    if (keep.has(p.id) === has) return p;
    return { ...p, lists: keep.has(p.id) ? [...(p.lists ?? []), listId] : (p.lists ?? []).filter((x) => x !== listId) };
  }) };
}

export function renameList(state, id, name) {
  const n = String(name ?? '').trim().slice(0, 30);
  if (!n) throw new Error('Donne un nom à la liste.');
  return { ...state, lists: (state.lists ?? []).map((l) => (l.id === id ? { ...l, name: n } : l)) };
}

/** Supprime une liste ; les lieux restent, ils sortent seulement de la liste. */
export function deleteList(state, id) {
  return {
    ...state,
    lists: (state.lists ?? []).filter((l) => l.id !== id),
    points: state.points.map((p) => (p.lists?.includes(id) ? { ...p, lists: p.lists.filter((x) => x !== id) } : p)),
  };
}

/** Change l'icône et la couleur des favoris. Renvoie un nouvel état. */
export function setFavStyle(state, { icon, color }) {
  if (!FAV_ICONS.includes(icon)) throw new Error('Choisis une icône : l\'étoile ou le cœur.');
  if (!FAV_COLORS.includes(color)) throw new Error('Choisis une couleur dans la liste.');
  return { ...state, fav: { icon, color } };
}

/** Marque un lieu visité ou non, en notant la date de visite. Modifie le lieu reçu. */
export function setDone(p, done, now = Date.now()) {
  if (done && !p.done) p.visited = now;
  if (!done) p.visited = null;
  p.done = Boolean(done);
  return p;
}

/** Nom explicite du fichier de sauvegarde, ex. « Ma carte de Paris - sauvegarde du 15-11-2026 22h05 (42 lieux).json ».
 * Sans accent : un « à » dans le nom fait perdre le nom du fichier à certains navigateurs (« download »). */
export function exportFileName(date, count) {
  const z = (n) => String(n).padStart(2, '0');
  const day = `${z(date.getDate())}-${z(date.getMonth() + 1)}-${date.getFullYear()}`;
  const time = `${z(date.getHours())}h${z(date.getMinutes())}`;
  return `Ma carte de Paris - sauvegarde du ${day} ${time} (${count} lieu${count > 1 ? 'x' : ''}).json`;
}

export const foldName = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Catégories toutes prêtes que la personne n'a pas encore (même nom, accents et majuscules ignorés). */
export function suggestedPresets(categories) {
  const have = new Set(categories.map((c) => foldName(c.name)));
  return PRESETS.filter((p) => !have.has(foldName(p.name)));
}

const DAY = 86_400_000;

/** Lieux ajoutés depuis la dernière sauvegarde (tous si jamais sauvegardé). Sert seulement à reprendre l'ancien compteur. */
export function unsavedCount(state) {
  const since = state.lastExport ?? 0;
  return state.points.filter((p) => p.created > since).length;
}

/** Empreinte de ce que contient une sauvegarde (lieux, photos rattachées, catégories, listes, favoris, mes stations ; v295 : mes marques TTB, dans `ttbMarks`). */
export function backupHash(state) {
  // v207 : la liste du jour (billet sans heure, effacé à minuit) ne compte pas comme un changement à sauvegarder ;
  // « Fait » (Déjà visité) compte toujours. Sans liste du jour, l'empreinte est exactement celle d'avant.
  const points = (state.points ?? []).map((p) => { if (!isDayList(p.ticket)) return p; const { ticket: _t, ...rest } = p; return rest; });
  // v226 : le choix des Mots tout prêts n'entre dans l'empreinte que s'il a changé : celle des sauvegardes d'avant reste la même
  const categories = (state.categories ?? []).map(({ words: _w, ...c }) => c);
  const text = JSON.stringify([points, categories, state.lists ?? [], state.fav, state.myStations ?? [], ...(state.plans?.length ? [state.plans] : []), ...(state.artists?.length ? [state.artists] : []), ...(state.outings?.length ? [state.outings] : []), ...(Object.keys(state.artistLinks ?? {}).length ? [state.artistLinks] : []), ...(state.venues?.length ? [state.venues] : []), ...(state.circuitNotes?.length ? [state.circuitNotes] : []), ...(state.hiddenCircuits?.length ? [state.hiddenCircuits] : []), ...(state.notes?.length ? [state.notes] : []), ...(cleanHome(state.home) ? [cleanHome(state.home)] : []), ...(wordsAsStart(state) ? [] : [[state.words ?? null, (state.categories ?? []).map((c) => c.words ?? null)]]), ...(cleanBusLines(state.busLines).length ? [cleanBusLines(state.busLines)] : []), ...(cleanRoutes(state.routes).length ? [cleanRoutes(state.routes)] : []), ...(cleanMyCircuits(state.myCircuits).length ? [cleanMyCircuits(state.myCircuits)] : []), ...(state.ttbMarks && Object.keys(state.ttbMarks).length ? [state.ttbMarks] : [])]); // v295 : mes marques TTB (gardées à part, passées par l'appli) ; les sorties prévues seulement s'il y en a : l'empreinte des sauvegardes d'avant ne change pas
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/**
 * Suivi des changements non sauvegardés : { saved (empreinte à la dernière sauvegarde), last (dernière empreinte vue),
 * n (changements depuis), since (heure du premier) }. Tout changement compte : lieu ajouté, modifié ou supprimé, note,
 * étoiles, favori, déjà visité, billet (sauf la liste du jour, v207), photo, catégorie, liste. Revenir exactement à l'état sauvegardé remet à zéro.
 */
export function trackChange(state, now = Date.now()) {
  const b = state.backup ?? { saved: null, last: null, n: 0, since: null };
  const h = backupHash(state);
  if (h === b.saved) return { ...b, last: h, n: 0, since: null };
  if (h === b.last) return b;
  return { ...b, last: h, n: b.n + 1, since: b.since ?? now };
}
/** Après une sauvegarde (ou la restauration complète d'une sauvegarde) : plus rien en attente. */
export const savedBackup = (state) => { const h = backupHash(state); return { saved: h, last: h, n: 0, since: null }; };

const cleanBackup = (b) => (b && typeof b === 'object' && Number.isFinite(b.n) && b.n >= 0
  ? { saved: typeof b.saved === 'string' ? b.saved : null, last: typeof b.last === 'string' ? b.last : null, n: Math.floor(b.n), since: Number.isFinite(b.since) ? b.since : null }
  : null);

/**
 * Faut-il rappeler de sauvegarder (à l'ouverture, au plus une fois par jour) ? Oui dès 5 changements non sauvegardés,
 * ou dès qu'un changement attend depuis plus de 3 jours.
 */
export function backupDue(state, now = Date.now()) {
  const b = state.backup;
  if (!b || !b.n) return false;
  return b.n >= 5 || (Number.isFinite(b.since) && now - b.since > 3 * DAY);
}

/** Les personnes dont j'ai des lieux (sans moi), avec leur nombre de lieux. */
export function owners(points) {
  const m = new Map();
  for (const p of points) if (p.owner) m.set(p.owner, (m.get(p.owner) ?? 0) + 1);
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/* ---------- Mes réglages pour un autre téléphone (v318, mes choix 1a 2b 3a 4a du 20 nov.) ----------
   Un fichier à part de la sauvegarde : l'affichage (boutons, filtres masqués, cercles, style, thème, voix, favoris…),
   mes catégories et mes listes, sans aucun lieu, ni Chez moi, ni stations, ni carnet. La clé CARTO seulement si je coche.
   Restent propres à chaque téléphone : Écrire au masculin, la taille du texte, le passe Navigo, la vitesse de marche. */
export const SETTINGS_OWN = ['masculin', 'textSize', 'navigo', 'pace'];
const withoutOwn = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !SETTINGS_OWN.includes(k)));
/** Clé CARTO acceptée : la même règle que la saisie (validCartoKey d'app.js). */
export const cleanCartoKey = (k) => (typeof k === 'string' && /^[A-Za-z0-9_.-]{8,200}$/.test(k.trim()) ? k.trim() : '');

export function exportSettingsJSON(state, carto = '') {
  const key = cleanCartoKey(carto);
  return JSON.stringify({
    app: 'carte-paris', kind: 'reglages', version: 1, exported: new Date().toISOString(), owner: state.me ?? '',
    settings: withoutOwn(cleanSettings(state)),
    categories: cleanCategories(state.categories), lists: cleanLists(state.lists),
    ...(key ? { carto: key } : {}),
  }, null, 2);
}

/** Nom du fichier de réglages, sans accent (comme la sauvegarde). */
export function settingsFileName(date, me = '') {
  const z = (n) => String(n).padStart(2, '0');
  const who = foldName(me).replace(/[^a-z0-9 -]/g, '').trim().slice(0, 20);
  return `Ma carte de Paris - reglages${who ? ` de ${who}` : ''} du ${z(date.getDate())}-${z(date.getMonth() + 1)}-${date.getFullYear()}.json`;
}

/** Lit un fichier de réglages. Renvoie null si ce n'en est pas un (une sauvegarde, par exemple). */
export function readSettingsFile(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || obj.app !== 'carte-paris' || obj.kind !== 'reglages' || !obj.settings || typeof obj.settings !== 'object') return null;
  const at = Date.parse(obj.exported);
  return {
    owner: typeof obj.owner === 'string' ? obj.owner.trim().slice(0, 30) : '',
    at: Number.isFinite(at) ? at : null,
    settings: withoutOwn(cleanSettings(obj.settings)),
    categories: cleanCategories(obj.categories), lists: cleanLists(obj.lists),
    carto: cleanCartoKey(obj.carto),
  };
}

/** Ce que le fichier ajouterait : catégories et listes qui manquent (ni même id, ni même nom, accents ignorés). */
export function settingsAdds(state, file) {
  const cats = state.categories ?? []; const lists = state.lists ?? [];
  const catIds = new Set(cats.map((c) => c.id)); const catNames = new Set(cats.map((c) => foldName(c.name)));
  const listIds = new Set(lists.map((l) => l.id)); const listNames = new Set(lists.map((l) => foldName(l.name)));
  const newCats = []; const newLists = [];
  for (const c of file.categories) if (!catIds.has(c.id) && !catNames.has(foldName(c.name))) { newCats.push(c); catIds.add(c.id); catNames.add(foldName(c.name)); }
  for (const l of file.lists) if (!listIds.has(l.id) && !listNames.has(foldName(l.name))) { newLists.push(l); listIds.add(l.id); listNames.add(foldName(l.name)); }
  return { categories: newCats, lists: newLists.slice(0, Math.max(0, 50 - lists.length)) };
}

/** Remplace mes réglages par ceux du fichier. Les miens d'avant deviennent « mes réglages par défaut » (« Revenir aux miens »).
 *  Mes catégories et listes ne changent pas : celles qui manquent s'ajoutent. Aucun lieu n'est touché. */
export function applySettingsFile(state, file, now = Date.now()) {
  const adds = settingsAdds(state, file);
  const mine = { at: now, settings: cleanSettings(state) };
  const next = {
    ...state, ...file.settings, mySettings: mine,
    categories: [...(state.categories ?? []), ...adds.categories.map((c) => ({ ...c }))],
    lists: [...(state.lists ?? []), ...adds.lists.map((l) => ({ ...l }))],
  };
  return { state: next, addedCats: adds.categories.length, addedLists: adds.lists.length };
}
