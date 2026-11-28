import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanPhotoTrash, restorePhotoOrder, TRASH_MS } from '../js/gestionnaire-photos.js';
import { photoCrop } from '../js/photo-crop.js';
import { loadState, newPoint, saveState, exportJSON, mergeImport } from '../js/store.js';

const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
const entry = { key: 'suppression-1', kind: 'point', owner: 'lieu', name: 'Mon lieu', id: 'photo-1', at: 1000, index: 0 };

test('un album de plus de six photos survit à un rechargement', () => {
  const local = storage();
  const state = loadState(local);
  const point = newPoint({ name: 'Mon lieu', cat: state.categories[0].id, lat: 48.85, lng: 2.35 });
  point.photos = Array.from({ length: 15 }, (_, i) => `photo-${i}`);
  state.points = [point];
  assert.equal(saveState(local, state), true);
  assert.deepEqual(loadState(local).points[0].photos, point.photos);
});

test('la sauvegarde et la restauration conservent l’ordre d’un album de plus de six photos', () => {
  const state = loadState(storage());
  const point = newPoint({ name: 'Mon lieu', cat: state.categories[0].id, lat: 48.85, lng: 2.35 });
  point.photos = Array.from({ length: 15 }, (_, i) => `photo-${i}`).reverse();
  state.points = [point];
  const restored = mergeImport(loadState(storage()), exportJSON(state));
  assert.deepEqual(restored.state.points[0].photos, point.photos);
});

test('la corbeille écarte les identifiants invalides et garde les références expirées pour le nettoyage', () => {
  assert.equal(TRASH_MS, 30 * 24 * 60 * 60 * 1000);
  assert.deepEqual(cleanPhotoTrash([null, { ...entry, id: '../photo' }, { ...entry, index: -1 }, entry]), [entry]);
});

test('corbeille et photos de salles persistent dans la même écriture que les lieux', () => {
  const local = storage();
  const state = loadState(local);
  state.photoTrash = [entry];
  state.venuePhotos = [{ name: 'Salle test', id: 'photo-salle', at: 2000 }];
  saveState(local, state);
  const loaded = loadState(local);
  assert.deepEqual(loaded.photoTrash, [entry]);
  assert.deepEqual(loaded.venuePhotos, state.venuePhotos);
});

test('restaurer plusieurs photos dans l’ordre inverse conserve leur position d’origine', () => {
  const first = { id: 'a', index: 0, after: ['b', 'c'] };
  const second = { id: 'b', index: 1, before: ['a'], after: ['c'] };
  assert.deepEqual(restorePhotoOrder(restorePhotoOrder(['c'], [second]), [first]), ['a', 'b', 'c']);
  assert.deepEqual(restorePhotoOrder(['a', 'b', 'c'], [first]), ['a', 'b', 'c']);
});

test('recadrage centré en portrait, carré et format original', () => {
  assert.deepEqual(photoCrop(800, 600, 0), { x: 0, y: 0, w: 800, h: 600 });
  assert.deepEqual(photoCrop(800, 600, 1), { x: 100, y: 0, w: 600, h: 600 });
  assert.deepEqual(photoCrop(800, 600, 0.75), { x: 175, y: 0, w: 450, h: 600 });
});

test('une salle garde un album sans limite fixe et une photo principale compatible avec les listes de sorties', async () => {
  const { setVenueAlbum, venuePhotoOf, venuePhotoIds, setVenuePhoto } = await import('../js/venue-photos.js');
  const ids = Array.from({ length: 12 }, (_, i) => `photo-salle-${i}`);
  const list = setVenueAlbum([], 'Salle test', ids, 100);
  assert.equal(venuePhotoOf('Salle test', list).id, ids[0]);
  assert.deepEqual(venuePhotoIds(venuePhotoOf('Salle test', list)), ids);
  const { list: replaced, old } = setVenuePhoto(list, 'Salle test', 'nouvelle-photo', 200);
  assert.equal(old, ids[0]);
  assert.deepEqual(venuePhotoIds(venuePhotoOf('Salle test', replaced)), ['nouvelle-photo', ...ids.slice(1)]);
});
