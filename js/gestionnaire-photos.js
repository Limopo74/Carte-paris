import { compressImage, getPhoto } from './photos.js';
import { photoFileName, zipStore } from './export-vu.js';

export const TRASH_MS = 30 * 86400000;
const validId = (id) => typeof id === 'string' && /^[\w-]{1,80}$/.test(id);

export function cleanPhotoTrash(value) {
  return (Array.isArray(value) ? value : []).filter((x) => x && validId(x.key) && validId(x.id)
    && ['point', 'venue', 'outing'].includes(x.kind) && typeof x.owner === 'string'
    && typeof x.name === 'string' && Number.isSafeInteger(x.index) && x.index >= 0
    && Number.isFinite(x.at));
}

export function restorePhotoOrder(ids, entries) {
  const next = [...ids];
  for (const { id, index, before, after } of [...entries].sort((a, b) => a.index - b.index)) {
    if (next.includes(id)) continue;
    const right = (Array.isArray(after) ? after : []).find((key) => next.includes(key));
    const left = (Array.isArray(before) ? before : []).findLast((key) => next.includes(key));
    next.splice(right ? next.indexOf(right) : left ? next.indexOf(left) + 1 : index, 0, id);
  }
  return next;
}

export async function photoZip(groups) {
  const files = [];
  const index = [];
  const names = new Map();
  for (const group of groups) {
    for (const id of group.ids) {
      if (!names.has(id)) {
        const source = await getPhoto(id);
        if (!source) throw new Error('Une photo est introuvable. Le ZIP n’a pas été créé.');
        const jpeg = await compressImage(source);
        const name = photoFileName(files.length, group.name);
        names.set(id, name);
        files.push({ name, bytes: new Uint8Array(await jpeg.arrayBuffer()) });
      }
      index.push({ fichier: names.get(id), type: group.kind, nom: group.name });
    }
  }
  if (files.length >= 65535 || files.reduce((n, f) => n + f.bytes.length, 0) >= 0xffffffff) {
    throw new Error('La collection dépasse la capacité du format ZIP.');
  }
  return new Blob([zipStore([...files, { name: 'photos.json', bytes: JSON.stringify(index, null, 2) }])], { type: 'application/zip' });
}

// Réencode une miniature seulement au moment où sa case s'approche de l'écran.
// L'URL locale est libérée dès que le navigateur a décodé l'image.
export function photoThumbnails() {
  const load = async (img) => {
    try {
      const blob = await getPhoto(img.dataset.photo);
      if (!blob || !img.isConnected) return;
      const thumb = await compressImage(blob, 240);
      if (!img.isConnected) return;
      const url = URL.createObjectURL(thumb);
      img.src = url;
      try { await img.decode(); } finally { URL.revokeObjectURL(url); }
    } catch { /* Le nom accessible reste disponible. */ }
  };
  let queue = Promise.resolve();
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      queue = queue.then(() => load(target));
    }
  }, { rootMargin: '120px' });
  return observer;
}
