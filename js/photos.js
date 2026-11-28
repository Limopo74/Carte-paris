import { photoCrop } from './photo-crop.js';

// Photos des lieux : réduites sur le téléphone et rangées dans sa base locale (IndexedDB).
// Elles ne partent nulle part. Le réencodage efface les données EXIF, dont la position GPS.

const DB = 'carte-paris-photos';
const STORE = 'photos';
export const MAX_SIDE = 1280;

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) { reject(new Error('Ce téléphone ne permet pas de garder des photos dans l\'appli.')); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Stockage des photos indisponible.'));
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onabort = () => reject(t.error ?? new Error('Photo non enregistrée (stockage plein ?).'));
  }));
}

export const putPhoto = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getPhoto = (id) => tx('readonly', (s) => s.get(id));
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));

/** Photos en grand (v201) : glissement de côté le plus court qui change de photo, en px. */
export const SWIPE_MIN = 48;
/** 1 = photo suivante (doigt vers la gauche), -1 = photo d'avant, 0 = rien (trop court, ou plutôt de haut en bas). */
export function swipeStep(dx, dy) {
  if (!(Math.abs(dx) >= SWIPE_MIN) || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
/** Rang de la photo après un pas : on s'arrête à la première et à la dernière, sans boucler. */
export const swipeIndex = (i, n, step) => Math.min(Math.max(i + step, 0), Math.max(n - 1, 0));
/** Repère affiché au-dessus de la photo : « 2 / 6 », rien pour une seule photo. */
export const photoCount = (i, n) => (n > 1 ? `${i + 1} / ${n}` : '');

/** Taille réduite en gardant les proportions (le plus grand côté à `max` px au plus). */
export function fitSize(w, h, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** Réduit et réencode une photo en JPEG (orientation respectée, EXIF effacé) ; `max` : côté le plus long (v327 : plus petit pour une salle). */
export async function compressImage(file, max = MAX_SIDE, { angle = 0, ratio = 0 } = {}) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const canvas = document.createElement('canvas');
  const turn = Math.abs(angle % 180) === 90;
  try {
    const { x, y, w, h } = photoCrop(bmp.width, bmp.height, turn && ratio ? 1 / ratio : ratio);
    const size = fitSize(w, h, max);
    canvas.width = Math.max(1, turn ? size.h : size.w);
    canvas.height = Math.max(1, turn ? size.w : size.h);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.drawImage(bmp, x, y, w, h, -size.w / 2, -size.h / 2, size.w, size.h);
  } finally {
    bmp.close?.();
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Photo illisible.'))), 'image/jpeg', 0.8));
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Photo d'un fichier de sauvegarde → Blob. Décodée ici, sans fetch() : la CSP de l'appli (connect-src) refuse les
 * adresses data:, et les photos ne revenaient jamais à la restauration (corrigé en v121). */
export async function dataUrlToBlob(url) {
  const m = typeof url === 'string' ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(url) : null;
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}
