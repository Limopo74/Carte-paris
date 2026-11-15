// Photos des lieux : réduites sur le téléphone et rangées dans sa base locale (IndexedDB).
// Elles ne partent nulle part. Le réencodage efface les données EXIF, dont la position GPS.

const DB = 'carte-paris-photos';
const STORE = 'photos';
export const MAX_SIDE = 1280;
export const MAX_PHOTOS = 6;

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
    t.onerror = () => reject(t.error ?? new Error('Photo non enregistrée (stockage plein ?).'));
  }));
}

export const putPhoto = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getPhoto = (id) => tx('readonly', (s) => s.get(id));
export const deletePhoto = (id) => tx('readwrite', (s) => s.delete(id));

/** Taille réduite en gardant les proportions (le plus grand côté à `max` px au plus). */
export function fitSize(w, h, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** Réduit et réencode une photo en JPEG (orientation respectée, EXIF effacé). */
export async function compressImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { w, h } = fitSize(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
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

export async function dataUrlToBlob(url) {
  if (typeof url !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(url)) return null;
  return (await fetch(url)).blob();
}
