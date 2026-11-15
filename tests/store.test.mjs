import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newPoint, validatePoint, loadState, saveState, exportJSON, mergeImport, KEY, CATEGORIES } from '../js/store.js';
import { DEFAULT_RINGS } from '../js/geo.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const brokenStorage = {
  getItem() { throw new Error('bloqué'); },
  setItem() { throw new Error('plein'); },
};

const sample = () => newPoint({ name: 'Café X', cat: 'resto', note: 'le crème', lat: 48.86, lng: 2.35, address: '1 rue X 75001 Paris' });

test('catégories et clé de stockage', () => {
  assert.deepEqual(Object.keys(CATEGORIES), ['resto', 'boutique', 'culture']);
  assert.equal(KEY, 'carte-paris.v1');
});

test('newPoint remplit les champs et produit un point valide', () => {
  const p = sample();
  assert.equal(typeof p.id, 'string');
  assert.equal(p.done, false);
  assert.equal(typeof p.created, 'number');
  assert.ok(validatePoint(p));
});

test('validatePoint refuse coordonnées hors limites, catégorie inconnue, nom vide', () => {
  assert.equal(validatePoint({ ...sample(), lat: 95 }), false);
  assert.equal(validatePoint({ ...sample(), lng: 'abc' }), false);
  assert.equal(validatePoint({ ...sample(), cat: 'sport' }), false);
  assert.equal(validatePoint({ ...sample(), name: '  ' }), false);
});

test('stockage indisponible : pas de plantage, ok=false', () => {
  const s = loadState(brokenStorage);
  assert.equal(s.ok, false);
  assert.deepEqual(s.points, []);
  assert.deepEqual(s.rings, DEFAULT_RINGS);
  assert.equal(saveState(brokenStorage, s), false);
});

test('stockage corrompu : on repart d\'un état vide, ok=false', () => {
  const st = memStorage();
  st.setItem(KEY, '{pas du json');
  const s = loadState(st);
  assert.equal(s.ok, false);
  assert.deepEqual(s.points, []);
});

test('sauvegarde puis rechargement', () => {
  const st = memStorage();
  const state = { points: [sample()], rings: [100, 250] };
  assert.equal(saveState(st, state), true);
  const s = loadState(st);
  assert.equal(s.ok, true);
  assert.deepEqual(s.points, state.points);
  assert.deepEqual(s.rings, [100, 250]);
});

test('export puis import sur un état vide redonne les mêmes points', () => {
  const state = { points: [sample(), newPoint({ name: 'Expo', cat: 'culture', lat: 48.85, lng: 2.33 })], rings: [100, 300] };
  const text = exportJSON(state);
  const obj = JSON.parse(text);
  assert.equal(obj.app, 'carte-paris');
  assert.equal(obj.version, 1);
  const r = mergeImport({ points: [], rings: DEFAULT_RINGS }, text);
  assert.equal(r.added, 2);
  assert.deepEqual(r.state.points, state.points);
});

test('réimporter le même fichier n\'ajoute rien', () => {
  const state = { points: [sample()], rings: DEFAULT_RINGS };
  const r = mergeImport(state, exportJSON(state));
  assert.equal(r.added, 0);
  assert.equal(r.state.points.length, 1);
});

test('fichier invalide : erreur en français, état d\'origine intact', () => {
  const state = { points: [sample()], rings: DEFAULT_RINGS };
  const before = JSON.stringify(state);
  assert.throws(() => mergeImport(state, 'pas du json'), /fichier/i);
  assert.throws(() => mergeImport(state, JSON.stringify({ app: 'autre', points: [] })), /fichier/i);
  assert.throws(() => mergeImport(state, JSON.stringify({ app: 'carte-paris', version: 1 })), /fichier/i);
  assert.equal(JSON.stringify(state), before);
});

test('points invalides ignorés à l\'import', () => {
  const good = sample();
  const text = JSON.stringify({ app: 'carte-paris', version: 1, points: [good, { ...sample(), lat: 200 }, { nimporte: 'quoi' }] });
  const r = mergeImport({ points: [], rings: DEFAULT_RINGS }, text);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 2);
});
