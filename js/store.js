// Enregistrement des lieux et des catégories dans le téléphone, export et import.
import { normalizeRings, DEFAULT_RINGS } from './geo.js';

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

/** Crée un lieu complet à partir des champs saisis. */
export function newPoint({ name, cat, note = '', done = false, fav = false, lat, lng, address = '' }) {
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
  created: Number.isFinite(p.created) ? p.created : Date.now(),
});

/** Lit l'état enregistré. ok=false si le stockage est indisponible ou illisible. */
export function loadState(storage) {
  const empty = () => ({ points: [], rings: [...DEFAULT_RINGS], categories: defaults(), fav: { ...DEFAULT_FAV }, lastExport: null, voice: true });
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
    return { points, rings: normalizeRings(obj.rings ?? []), categories, fav: cleanFav(obj.fav), lastExport, voice: obj.voice !== false, ok: true };
  } catch {
    return { ...empty(), ok: false };
  }
}

/** Enregistre l'état. Renvoie false si l'écriture a échoué. */
export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify({ points: state.points, rings: state.rings, categories: state.categories, fav: state.fav, lastExport: state.lastExport ?? null, voice: state.voice !== false }));
    return true;
  } catch {
    return false;
  }
}

/** Texte du fichier de sauvegarde. */
export function exportJSON(state) {
  return JSON.stringify({
    app: 'carte-paris', version: 2, exported: new Date().toISOString(),
    categories: state.categories, fav: state.fav, rings: state.rings, points: state.points,
  }, null, 2);
}

/**
 * Ajoute les catégories et les lieux d'un fichier de sauvegarde, sans doublon (même id).
 * Ne modifie pas l'état reçu. Lève une erreur si le fichier n'est pas une sauvegarde valide.
 */
export function mergeImport(state, text) {
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

  const known = new Set(state.points.map((p) => p.id));
  const points = [...state.points];
  let added = 0;
  let skipped = 0;
  for (const p of obj.points) {
    if (!validatePoint(p, [...catIds])) { skipped++; continue; }
    if (known.has(p.id)) continue;
    known.add(p.id);
    points.push(clean(p));
    added++;
  }
  return { state: { ...state, points, categories }, added, skipped };
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

/** Nom explicite du fichier de sauvegarde, ex. « Ma carte de Paris - sauvegarde du 15-11-2026 à 22h05 (42 lieux).json ». */
export function exportFileName(date, count) {
  const z = (n) => String(n).padStart(2, '0');
  const day = `${z(date.getDate())}-${z(date.getMonth() + 1)}-${date.getFullYear()}`;
  const time = `${z(date.getHours())}h${z(date.getMinutes())}`;
  return `Ma carte de Paris - sauvegarde du ${day} à ${time} (${count} lieu${count > 1 ? 'x' : ''}).json`;
}

const foldName = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Catégories toutes prêtes que la personne n'a pas encore (même nom, accents et majuscules ignorés). */
export function suggestedPresets(categories) {
  const have = new Set(categories.map((c) => foldName(c.name)));
  return PRESETS.filter((p) => !have.has(foldName(p.name)));
}

const DAY = 86_400_000;
/**
 * Faut-il rappeler de sauvegarder ? Oui si au moins 5 lieux, que le plus ancien a plus de 30 jours
 * et que la dernière sauvegarde date de plus de 30 jours (ou n'a jamais été faite).
 */
export function backupDue(state, now = Date.now()) {
  if (state.points.length < 5) return false;
  const oldest = Math.min(...state.points.map((p) => p.created));
  if (now - oldest < 30 * DAY) return false;
  return !state.lastExport || now - state.lastExport > 30 * DAY;
}
