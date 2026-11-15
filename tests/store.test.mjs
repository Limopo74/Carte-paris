import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPoint, validatePoint, loadState, saveState, exportJSON, mergeImport, KEY,
  DEFAULT_CATEGORIES, PALETTE, addCategory, updateCategory, deleteCategory,
} from '../js/store.js';
import { DEFAULT_RINGS } from '../js/geo.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const brokenStorage = {
  getItem() { throw new Error('bloqué'); },
  setItem() { throw new Error('plein'); },
};
const ids = (cats) => cats.map((c) => c.id);
const base = () => ({ points: [], rings: [...DEFAULT_RINGS], categories: structuredClone(DEFAULT_CATEGORIES) });
const sample = () => newPoint({ name: 'Café X', cat: 'resto', note: 'le crème', lat: 48.86, lng: 2.35, address: '1 rue X 75001 Paris' });

test('catégories par défaut, palette et clé de stockage', () => {
  assert.deepEqual(ids(DEFAULT_CATEGORIES), ['resto', 'boutique', 'culture']);
  assert.equal(PALETTE.length, 8);
  assert.ok(PALETTE.includes('#d9480f'));
  assert.equal(KEY, 'carte-paris.v1');
});

test('newPoint remplit les champs, favori faux par défaut', () => {
  const p = sample();
  assert.equal(typeof p.id, 'string');
  assert.equal(p.done, false);
  assert.equal(p.fav, false);
  assert.ok(validatePoint(p, ['resto']));
  assert.equal(newPoint({ name: 'a', cat: 'resto', lat: 1, lng: 1, fav: true }).fav, true);
});

test('validatePoint refuse coordonnées hors limites, catégorie inconnue, nom vide', () => {
  const cats = ['resto', 'boutique'];
  assert.equal(validatePoint({ ...sample(), lat: 95 }, cats), false);
  assert.equal(validatePoint({ ...sample(), lng: 'abc' }, cats), false);
  assert.equal(validatePoint({ ...sample(), cat: 'sport' }, cats), false);
  assert.equal(validatePoint({ ...sample(), name: '  ' }, cats), false);
});

test('stockage indisponible : pas de plantage, ok=false, catégories par défaut', () => {
  const s = loadState(brokenStorage);
  assert.equal(s.ok, false);
  assert.deepEqual(s.points, []);
  assert.deepEqual(s.rings, DEFAULT_RINGS);
  assert.deepEqual(s.categories, DEFAULT_CATEGORIES);
  assert.equal(saveState(brokenStorage, s), false);
});

test('stockage corrompu : on repart d\'un état vide, ok=false', () => {
  const st = memStorage();
  st.setItem(KEY, '{pas du json');
  const s = loadState(st);
  assert.equal(s.ok, false);
  assert.deepEqual(s.points, []);
});

test('ancien format sans catégories ni favoris : lieux conservés', () => {
  const st = memStorage();
  const old = { id: 'a1', name: 'Vieux café', cat: 'resto', note: '', done: true, lat: 48.86, lng: 2.35, address: '', created: 1 };
  st.setItem(KEY, JSON.stringify({ points: [old], rings: [100, 300] }));
  const s = loadState(st);
  assert.equal(s.ok, true);
  assert.deepEqual(s.categories, DEFAULT_CATEGORIES);
  assert.equal(s.points.length, 1);
  assert.equal(s.points[0].fav, false);
  assert.equal(s.points[0].done, true);
});

test('un lieu dont la catégorie a disparu est rangé dans la première catégorie, pas perdu', () => {
  const st = memStorage();
  const cats = [{ id: 'parcs', name: 'Parcs', color: PALETTE[3] }];
  st.setItem(KEY, JSON.stringify({ points: [{ ...sample(), cat: 'inconnue' }], rings: [100], categories: cats }));
  const s = loadState(st);
  assert.equal(s.points.length, 1);
  assert.equal(s.points[0].cat, 'parcs');
});

test('sauvegarde puis rechargement avec catégories et favoris', () => {
  const st = memStorage();
  const state = { ...base(), points: [{ ...sample(), fav: true }], rings: [100, 250] };
  assert.equal(saveState(st, state), true);
  const s = loadState(st);
  assert.equal(s.ok, true);
  assert.deepEqual(s.points, state.points);
  assert.deepEqual(s.rings, [100, 250]);
  assert.deepEqual(s.categories, state.categories);
});

test('ajouter une catégorie : nom nettoyé et limité à 20 caractères, couleur de la palette', () => {
  const s = addCategory(base(), { name: '  Parcs et jardins de Paris  ', color: PALETTE[4] });
  const c = s.categories.at(-1);
  assert.equal(c.name, 'Parcs et jardins de ');
  assert.equal(c.name.length, 20);
  assert.equal(c.color, PALETTE[4]);
  assert.equal(s.categories.length, 4);
  assert.throws(() => addCategory(base(), { name: '   ', color: PALETTE[0] }), /nom/i);
  assert.throws(() => addCategory(base(), { name: 'X', color: 'red' }), /couleur/i);
});

test('modifier une catégorie', () => {
  const s = updateCategory(base(), 'resto', { name: 'Restos & bars', color: PALETTE[2] });
  assert.deepEqual(s.categories[0], { id: 'resto', name: 'Restos & bars', color: PALETTE[2] });
  assert.throws(() => updateCategory(base(), 'resto', { name: '', color: PALETTE[2] }), /nom/i);
});

test('supprimer une catégorie : les lieux sont déplacés, la dernière ne peut pas partir', () => {
  const st = { ...base(), points: [sample(), newPoint({ name: 'B', cat: 'boutique', lat: 1, lng: 1 })] };
  const s = deleteCategory(st, 'resto', 'culture');
  assert.deepEqual(ids(s.categories), ['boutique', 'culture']);
  assert.equal(s.points[0].cat, 'culture');
  assert.equal(s.points[1].cat, 'boutique');
  assert.equal(st.points[0].cat, 'resto', 'l\'état reçu ne doit pas changer');
  assert.throws(() => deleteCategory(st, 'resto', 'resto'), /catégorie/i);
  assert.throws(() => deleteCategory(st, 'resto', null), /catégorie/i);
  const vide = deleteCategory({ ...base(), points: [] }, 'resto', null);
  assert.equal(vide.categories.length, 2);
  const one = { ...base(), categories: [DEFAULT_CATEGORIES[0]] };
  assert.throws(() => deleteCategory(one, 'resto', null), /au moins une/i);
});

test('export puis import sur un état vide redonne les mêmes lieux et catégories', () => {
  const s0 = addCategory(base(), { name: 'Parcs', color: PALETTE[5] });
  const parcs = s0.categories.at(-1).id;
  const state = { ...s0, points: [sample(), newPoint({ name: 'Buttes', cat: parcs, lat: 48.88, lng: 2.38, fav: true })] };
  const text = exportJSON(state);
  const obj = JSON.parse(text);
  assert.equal(obj.app, 'carte-paris');
  assert.equal(obj.version, 2);
  const r = mergeImport(base(), text);
  assert.equal(r.added, 2);
  assert.deepEqual(r.state.points, state.points);
  assert.ok(ids(r.state.categories).includes(parcs));
});

test('import d\'un ancien fichier (version 1, sans catégories) après suppression de « resto »', () => {
  const cur = deleteCategory(base(), 'resto', null);
  const text = JSON.stringify({ app: 'carte-paris', version: 1, points: [sample()] });
  const r = mergeImport(cur, text);
  assert.equal(r.added, 1);
  assert.ok(ids(r.state.categories).includes('resto'));
});

test('réimporter le même fichier n\'ajoute rien', () => {
  const state = { ...base(), points: [sample()] };
  const r = mergeImport(state, exportJSON(state));
  assert.equal(r.added, 0);
  assert.equal(r.state.points.length, 1);
  assert.equal(r.state.categories.length, 3);
});

test('fichier invalide : erreur en français, état d\'origine intact', () => {
  const state = { ...base(), points: [sample()] };
  const before = JSON.stringify(state);
  assert.throws(() => mergeImport(state, 'pas du json'), /fichier/i);
  assert.throws(() => mergeImport(state, JSON.stringify({ app: 'autre', points: [] })), /fichier/i);
  assert.throws(() => mergeImport(state, JSON.stringify({ app: 'carte-paris', version: 1 })), /fichier/i);
  assert.equal(JSON.stringify(state), before);
});

test('lieux invalides ignorés à l\'import', () => {
  const good = sample();
  const text = JSON.stringify({ app: 'carte-paris', version: 2, categories: DEFAULT_CATEGORIES, points: [good, { ...sample(), lat: 200 }, { ...sample(), cat: 'fantome' }, { nimporte: 'quoi' }] });
  const r = mergeImport(base(), text);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 3);
});
