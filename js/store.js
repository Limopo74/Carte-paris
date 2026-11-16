// Enregistrement des lieux et des catégories dans le téléphone, export et import.
import { normalizeRings, DEFAULT_RINGS, normalizeMinuteRings, DEFAULT_MINUTE_RINGS } from './geo.js';

export const KEY = 'carte-paris.v1';
export const PALETTE = ['#d9480f', '#1971c2', '#7b2cbf', '#2b8a3e', '#9c6644', '#c2255c', '#0c8599', '#495057'];
export const ICONS = [
  '🍽️', '☕', '🍷', '🍺', '🍸', '🥐', '🍰', '🍦', '🍕', '🍜', '🍣', '🥗',
  '🛍️', '👗', '👟', '📚', '🎁', '💄', '🧀', '🍫', '🏛️', '🖼️', '🎭', '🎬',
  '🎵', '⛪', '🌳', '🌸', '🏊', '🧘', '💈', '💊', '📍', '⭐', '❤️', '🏠',
];
export const DEFAULT_ICON = '📍';
export const FAV_COLORS = ['#f2a900', ...PALETTE];
export const DEFAULT_FAV = { icon: '⭐', color: '#f2a900' };
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
  icon: ICONS.includes(f?.icon) ? f.icon : DEFAULT_FAV.icon,
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
  icon: ICONS.includes(c.icon) ? c.icon : defaultIcon(c.id),
});

function cleanCategories(list) {
  const seen = new Set();
  const out = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (!validCategory(c) || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(cleanCategory(c));
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
  owner: typeof p.owner === 'string' ? p.owner.trim().slice(0, 30) : '', // '' = mes lieux
  stars: cleanStars(p.stars),
  ...(Number.isFinite(p.ticket?.at) ? { ticket: { at: p.ticket.at, ...(typeof p.ticket.with === 'string' && p.ticket.with.trim() ? { with: p.ticket.with.trim().slice(0, 40) } : {}) } } : {}), // Mon billet : date, heure, et avec qui (facultatif)
  lists: cleanIds(p.lists),
  covered: Boolean(p.covered),
  arr: Number.isInteger(p.arr) && p.arr >= 1 && p.arr <= 20 ? p.arr : null, // arrondissement, trouvé une fois pour toutes
  photos: Array.isArray(p.photos) ? p.photos.filter((x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)).slice(0, 6) : [],
  created: Number.isFinite(p.created) ? p.created : Date.now(),
});

/** Boutons masqués de la barre du haut : 'all', 'filters', 'fav' ou 'cat:<id>'. */
export const cleanChips = (list) => [...new Set((Array.isArray(list) ? list : []).filter((x) => typeof x === 'string' && /^(all|filters|fav|street|ttb|lines|cat:[\w-]{1,40})$/.test(x)))].slice(0, 60);

/** Lignes masquées de la feuille Filtres. */
export const FILTER_KEYS = ['open', 'top', 'lines', 'markets', 'ttb', 'covered', 'lists', 'people'];
export const cleanFilterKeys = (list) => FILTER_KEYS.filter((k) => Array.isArray(list) && list.includes(k));

/** Lit l'état enregistré. ok=false si le stockage est indisponible ou illisible. */
export function loadState(storage) {
  const empty = () => ({ points: [], rings: [...DEFAULT_RINGS], categories: defaults(), fav: { ...DEFAULT_FAV }, lastExport: null, backup: { saved: null, last: null, n: 0, since: null }, voice: true, ringUnit: 'm', minuteRings: [...DEFAULT_MINUTE_RINGS], me: '', walk: { day: '', m: 0 }, chipIcons: false, mapTools: [...MAP_TOOLS], hiddenTools: [...DEFAULT_HIDDEN], lists: [], mapStyle: 'classic', theme: 'auto', toolsSide: 'right', mySettings: null, myStations: [], showMarkets: false, showLines: false, showTtb: false, hiddenChips: [], hiddenFilters: [] });
  let raw;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { ...empty(), ok: false };
  }
  if (raw == null) return { ...empty(), ok: true };
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
    const st = { points, rings: normalizeRings(obj.rings ?? []), categories, fav: cleanFav(obj.fav), lastExport, voice: obj.voice !== false, ringUnit: obj.ringUnit === 'min' ? 'min' : 'm', minuteRings: normalizeMinuteRings(obj.minuteRings ?? []), chipIcons: obj.chipIcons === true, mapTools: obj.layoutV >= 3 ? normalizeTools(obj.mapTools) : [...normalizeTools(obj.mapTools).filter((t) => t !== 'locate'), 'locate'], hiddenTools: obj.layoutV >= 2 ? cleanHidden(obj.hiddenTools) : cleanHidden([...(obj.hiddenTools ?? []), ...DEFAULT_HIDDEN]), lists: cleanLists(obj.lists), mapStyle: MAP_STYLES.includes(obj.mapStyle) ? obj.mapStyle : 'classic', theme: ['light', 'dark'].includes(obj.theme) ? obj.theme : 'auto', toolsSide: obj.toolsSide === 'left' ? 'left' : 'right', mySettings: cleanMySettings(obj.mySettings), myStations: cleanMyStations(obj.myStations), showMarkets: obj.showMarkets === true, showLines: obj.showLines === true, showTtb: obj.showTtb === true, hiddenChips: cleanChips(obj.hiddenChips), hiddenFilters: cleanFilterKeys(obj.hiddenFilters),
      me: typeof obj.me === 'string' ? obj.me.trim().slice(0, 30) : '',
      walk: obj.walk && typeof obj.walk.day === 'string' && Number.isFinite(obj.walk.m) ? { day: obj.walk.day, m: obj.walk.m } : { day: '', m: 0 },
      ok: true };
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
    mapTools: normalizeTools(o.mapTools), hiddenTools: cleanHidden(o.hiddenTools), toolsSide: o.toolsSide === 'left' ? 'left' : 'right',
    mapStyle: MAP_STYLES.includes(o.mapStyle) ? o.mapStyle : 'classic', theme: ['light', 'dark'].includes(o.theme) ? o.theme : 'auto',
  };
}
/** Mes stations (personnelles, comme mes lieux) : { id, station, label }, 10 au plus. */
export const cleanMyStations = (a) => (Array.isArray(a) ? a.filter((s) => s && typeof s.station === 'string' && s.station.trim() && typeof s.id === 'string' && /^[\w-]{1,64}$/.test(s.id))
  .map((s) => ({ id: s.id, station: s.station.trim().slice(0, 60), label: String(s.label ?? '').trim().slice(0, 20) || 'Ma station' })).slice(0, 10) : []);

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
export const sameAsMySettings = (state) => Boolean(state.mySettings) && JSON.stringify(cleanSettings(state)) === JSON.stringify(cleanSettings(state.mySettings.settings));

/** Enregistre l'état. Renvoie false si l'écriture a échoué. */
export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify({ points: state.points, rings: state.rings, categories: state.categories, fav: state.fav, lastExport: state.lastExport ?? null, backup: cleanBackup(state.backup), voice: state.voice !== false, ringUnit: state.ringUnit ?? 'm', minuteRings: state.minuteRings, me: state.me ?? '', walk: state.walk ?? { day: '', m: 0 }, chipIcons: state.chipIcons === true, mapTools: normalizeTools(state.mapTools), hiddenTools: cleanHidden(state.hiddenTools), layoutV: 3, lists: cleanLists(state.lists), mapStyle: MAP_STYLES.includes(state.mapStyle) ? state.mapStyle : 'classic', theme: ['light', 'dark'].includes(state.theme) ? state.theme : 'auto', toolsSide: state.toolsSide === 'left' ? 'left' : 'right', mySettings: cleanMySettings(state.mySettings), myStations: cleanMyStations(state.myStations), showMarkets: state.showMarkets === true, showLines: state.showLines === true, showTtb: state.showTtb === true, hiddenChips: cleanChips(state.hiddenChips), hiddenFilters: cleanFilterKeys(state.hiddenFilters) }));
    return true;
  } catch {
    return false;
  }
}

/** Texte du fichier de sauvegarde. */
export function exportJSON(state) {
  return JSON.stringify({
    app: 'carte-paris', version: 2, exported: new Date().toISOString(), owner: state.me ?? '',
    categories: state.categories, fav: state.fav, rings: state.rings, lists: state.lists ?? [],
    mySettings: cleanMySettings(state.mySettings),
    myStations: cleanMyStations(state.myStations),
    // Chaque lieu porte le prénom de qui l'a ajouté, même si le fichier passe ensuite de main en main.
    points: state.points.map((p) => ({ ...p, owner: p.owner || state.me || '' })),
  }, null, 2);
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
  const categories = state.categories.map((c) => ({ ...c }));
  const catIds = new Set(categories.map((c) => c.id));
  const usedCats = new Set(obj.points.map((p) => p?.cat));
  for (const c of fileCats) {
    if (!catIds.has(c.id) && usedCats.has(c.id)) { categories.push(c); catIds.add(c.id); }
  }

  // Listes du fichier : ajoutées si elles servent et ne sont pas déjà là (même id)
  const lists = [...(state.lists ?? [])];
  const listIds = new Set(lists.map((l) => l.id));
  const usedLists = new Set(obj.points.flatMap((p) => (Array.isArray(p?.lists) ? p.lists : [])));
  for (const l of cleanLists(obj.lists)) if (!listIds.has(l.id) && usedLists.has(l.id)) { lists.push(l); listIds.add(l.id); }

  const known = new Set(state.points.map((p) => p.id));
  const points = [...state.points];
  let added = 0;
  let skipped = 0;
  for (const p of obj.points) {
    if (!validatePoint(p, [...catIds])) { skipped++; continue; }
    if (known.has(p.id)) continue;
    known.add(p.id);
    const c = clean(p);
    c.lists = c.lists.filter((x) => listIds.has(x));
    if (owner) { c.owner = c.owner || owner; delete c.ticket; } // ses billets restent à lui : on ne voit que ses lieux (une sortie à deux passe par une invitation)
    if (state.me && c.owner === state.me) c.owner = '';
    points.push(c);
    added++;
  }
  // Ma propre sauvegarde : je retrouve aussi mes réglages par défaut (sans les appliquer d'office)
  const mine = !owner ? cleanMySettings(obj.mySettings) : null;
  // Mes stations aussi, seulement depuis ma propre sauvegarde (celles d'un ami restent les siennes)
  const myStations = !owner ? cleanMyStations([...(state.myStations ?? []), ...cleanMyStations(obj.myStations).filter((s) => !(state.myStations ?? []).some((x) => x.station === s.station))]) : state.myStations;
  return { state: { ...state, points, categories, lists, ...(myStations ? { myStations } : {}), ...(mine && !state.mySettings ? { mySettings: mine } : {}) }, added, skipped };
}

function checkFields({ name, color, icon = DEFAULT_ICON }, keepColor = null) {
  const n = String(name ?? '').trim();
  if (!n) throw new Error('Donne un nom à la catégorie.');
  if (!PALETTE.includes(color) && color !== keepColor) throw new Error('Choisis une couleur dans la liste.');
  if (!ICONS.includes(icon)) throw new Error('Choisis une icône dans la liste.');
  return { name: n.slice(0, NAME_MAX), color, icon };
}

/** Ajoute une catégorie. Renvoie un nouvel état. */
export function addCategory(state, fields) {
  const f = checkFields(fields);
  return { ...state, categories: [...state.categories, { id: makeId(), ...f }] };
}

/** Renomme ou recolore une catégorie. Renvoie un nouvel état. */
export function updateCategory(state, id, fields) {
  // Une couleur déjà utilisée reste acceptée même si elle a quitté la palette.
  const f = checkFields(fields, state.categories.find((c) => c.id === id)?.color);
  return { ...state, categories: state.categories.map((c) => (c.id === id ? { ...c, ...f } : c)) };
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
    points: state.points.map((p) => (p.cat === id ? { ...p, cat: target.id } : p)),
  };
}

/** Styles de carte proposés dans les Réglages. */
export const MAP_STYLES = ['classic', 'clean', 'fr', 'hot', 'pastel', 'night'];

/** Boutons à droite de la carte, dans l'ordre par défaut (de haut en bas). */
// « Ma position et direction » en bas, sous le pouce : c'est le bouton le plus utilisé en marchant.
export const MAP_TOOLS = ['pratique', 'metro', 'velib', 'home', 'paris', 'sorties', 'planning', 'locate'];

/** Garde un ordre valide : chaque bouton une fois, ceux qui manquent ajoutés à la fin. */
export function normalizeTools(list) {
  const out = Array.isArray(list) ? list.filter((t, i) => MAP_TOOLS.includes(t) && list.indexOf(t) === i) : [];
  // Un bouton nouveau arrive juste avant « Ma position » (le gros bouton du bas reste en bas)
  for (const t of MAP_TOOLS.filter((x) => !out.includes(x))) {
    const i = out.indexOf('locate');
    if (i >= 0 && t !== 'locate') out.splice(i, 0, t); else out.push(t);
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

/** Déplace une catégorie d'une place (delta = -1 vers le haut, +1 vers le bas). Renvoie un nouvel état. */
export function moveCategory(state, id, delta) {
  const list = [...state.categories];
  const i = list.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return state;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...state, categories: list };
}

/** Crée une liste (« Sous la pluie », « Avec Paul »…), ou reprend celle qui a déjà ce nom. Renvoie { state, id }. */
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
  if (!ICONS.includes(icon)) throw new Error('Choisis une icône dans la liste.');
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

const foldName = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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

/** Empreinte de ce que contient une sauvegarde (lieux, photos rattachées, catégories, listes, favoris, mes stations). */
export function backupHash(state) {
  const text = JSON.stringify([state.points, state.categories, state.lists ?? [], state.fav, state.myStations ?? []]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/**
 * Suivi des changements non sauvegardés : { saved (empreinte à la dernière sauvegarde), last (dernière empreinte vue),
 * n (changements depuis), since (heure du premier) }. Tout changement compte : lieu ajouté, modifié ou supprimé, note,
 * étoiles, favori, déjà visité, billet, photo, catégorie, liste. Revenir exactement à l'état sauvegardé remet à zéro.
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
