// Enregistrement des points dans le téléphone, export et import.
import { normalizeRings, DEFAULT_RINGS } from './geo.js';

export const KEY = 'carte-paris.v1';
export const CATEGORIES = {
  resto: { label: 'Restos, cafés, bars', short: 'Restos', color: '#d9480f' },
  boutique: { label: 'Boutiques, commerces', short: 'Boutiques', color: '#1971c2' },
  culture: { label: 'Culture, visites', short: 'Culture', color: '#7b2cbf' },
};

const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/** Crée un point complet à partir des champs saisis. */
export function newPoint({ name, cat, note = '', done = false, lat, lng, address = '' }) {
  return {
    id: makeId(),
    name: String(name ?? '').trim(),
    cat,
    note: String(note ?? ''),
    done: Boolean(done),
    lat: Number(lat),
    lng: Number(lng),
    address: String(address ?? ''),
    created: Date.now(),
  };
}

/** Vérifie qu'un objet est un point utilisable. */
export function validatePoint(p) {
  return Boolean(p) && typeof p === 'object' &&
    typeof p.id === 'string' && p.id.length > 0 &&
    typeof p.name === 'string' && p.name.trim().length > 0 &&
    Object.hasOwn(CATEGORIES, p.cat) &&
    typeof p.lat === 'number' && Number.isFinite(p.lat) && p.lat >= -90 && p.lat <= 90 &&
    typeof p.lng === 'number' && Number.isFinite(p.lng) && p.lng >= -180 && p.lng <= 180;
}

// Ne garde que les champs connus, avec les bons types.
const clean = (p) => ({
  id: p.id, name: p.name.trim(), cat: p.cat,
  note: typeof p.note === 'string' ? p.note : '',
  done: Boolean(p.done), lat: p.lat, lng: p.lng,
  address: typeof p.address === 'string' ? p.address : '',
  created: Number.isFinite(p.created) ? p.created : Date.now(),
});

/** Lit l'état enregistré. ok=false si le stockage est indisponible ou illisible. */
export function loadState(storage) {
  const empty = { points: [], rings: [...DEFAULT_RINGS] };
  let raw;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { ...empty, ok: false };
  }
  if (raw == null) return { ...empty, ok: true };
  try {
    const obj = JSON.parse(raw);
    const points = Array.isArray(obj.points) ? obj.points.filter(validatePoint).map(clean) : [];
    return { points, rings: normalizeRings(obj.rings ?? []), ok: true };
  } catch {
    return { ...empty, ok: false };
  }
}

/** Enregistre l'état. Renvoie false si l'écriture a échoué. */
export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify({ points: state.points, rings: state.rings }));
    return true;
  } catch {
    return false;
  }
}

/** Texte du fichier de sauvegarde. */
export function exportJSON(state) {
  return JSON.stringify({
    app: 'carte-paris', version: 1, exported: new Date().toISOString(),
    points: state.points, rings: state.rings,
  }, null, 2);
}

/**
 * Ajoute les points d'un fichier de sauvegarde à l'état, sans doublon (même id).
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
  const known = new Set(state.points.map((p) => p.id));
  const points = [...state.points];
  let added = 0;
  let skipped = 0;
  for (const p of obj.points) {
    if (!validatePoint(p)) { skipped++; continue; }
    if (known.has(p.id)) continue;
    known.add(p.id);
    points.push(clean(p));
    added++;
  }
  return { state: { ...state, points }, added, skipped };
}
