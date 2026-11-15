// Enregistrement des lieux et des catégories dans le téléphone, export et import.
import { normalizeRings, DEFAULT_RINGS } from './geo.js';

export const KEY = 'carte-paris.v1';
export const PALETTE = ['#d9480f', '#1971c2', '#7b2cbf', '#2b8a3e', '#e8590c', '#c2255c', '#0c8599', '#495057'];
export const DEFAULT_CATEGORIES = [
  { id: 'resto', name: 'Restos', color: '#d9480f' },
  { id: 'boutique', name: 'Boutiques', color: '#1971c2' },
  { id: 'culture', name: 'Culture', color: '#7b2cbf' },
];
const NAME_MAX = 20;

const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const defaults = () => DEFAULT_CATEGORIES.map((c) => ({ ...c }));

/** Crée un lieu complet à partir des champs saisis. */
export function newPoint({ name, cat, note = '', done = false, fav = false, lat, lng, address = '' }) {
  return {
    id: makeId(),
    name: String(name ?? '').trim(),
    cat,
    note: String(note ?? ''),
    done: Boolean(done),
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
const cleanCategory = (c) => ({ id: c.id, name: c.name.trim().slice(0, NAME_MAX), color: c.color.toLowerCase() });

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
  done: Boolean(p.done), fav: Boolean(p.fav), lat: p.lat, lng: p.lng,
  address: typeof p.address === 'string' ? p.address : '',
  created: Number.isFinite(p.created) ? p.created : Date.now(),
});

/** Lit l'état enregistré. ok=false si le stockage est indisponible ou illisible. */
export function loadState(storage) {
  const empty = () => ({ points: [], rings: [...DEFAULT_RINGS], categories: defaults() });
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
    return { points, rings: normalizeRings(obj.rings ?? []), categories, ok: true };
  } catch {
    return { ...empty(), ok: false };
  }
}

/** Enregistre l'état. Renvoie false si l'écriture a échoué. */
export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify({ points: state.points, rings: state.rings, categories: state.categories }));
    return true;
  } catch {
    return false;
  }
}

/** Texte du fichier de sauvegarde. */
export function exportJSON(state) {
  return JSON.stringify({
    app: 'carte-paris', version: 2, exported: new Date().toISOString(),
    categories: state.categories, rings: state.rings, points: state.points,
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

function checkFields({ name, color }) {
  const n = String(name ?? '').trim();
  if (!n) throw new Error('Donne un nom à la catégorie.');
  if (!PALETTE.includes(color)) throw new Error('Choisis une couleur dans la liste.');
  return { name: n.slice(0, NAME_MAX), color };
}

/** Ajoute une catégorie. Renvoie un nouvel état. */
export function addCategory(state, fields) {
  const f = checkFields(fields);
  return { ...state, categories: [...state.categories, { id: makeId(), ...f }] };
}

/** Renomme ou recolore une catégorie. Renvoie un nouvel état. */
export function updateCategory(state, id, fields) {
  const f = checkFields(fields);
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
