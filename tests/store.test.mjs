import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPoint, validatePoint, loadState, saveState, exportJSON, mergeImport, KEY,
  DEFAULT_CATEGORIES, PALETTE, ICONS, DEFAULT_ICON, DEFAULT_FAV, FAV_COLORS, setFavStyle, setDone, exportFileName, PRESETS, suggestedPresets, backupDue, unsavedCount, addCategory, updateCategory, deleteCategory,
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
const base = () => ({ points: [], rings: [...DEFAULT_RINGS], categories: structuredClone(DEFAULT_CATEGORIES), fav: { ...DEFAULT_FAV } });
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
  assert.deepEqual(s.categories[0], { id: 'resto', name: 'Restos & bars', color: PALETTE[2], icon: DEFAULT_ICON });
  const s2 = updateCategory(base(), 'resto', { name: 'Cafés', color: PALETTE[0], icon: '☕' });
  assert.equal(s2.categories[0].icon, '☕');
  assert.throws(() => updateCategory(base(), 'resto', { name: 'X', color: PALETTE[0], icon: 'abc' }), /icône/i);
  const old = { ...base(), categories: [{ id: 'a', name: 'A', color: '#123456', icon: '📍' }] };
  assert.equal(updateCategory(old, 'a', { name: 'B', color: '#123456', icon: '📍' }).categories[0].name, 'B');
  assert.throws(() => updateCategory(old, 'a', { name: 'B', color: '#654321', icon: '📍' }), /couleur/i);
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

test('icônes : une trentaine, celles d\'origine présentes, migration des anciennes catégories', () => {
  assert.ok(ICONS.length >= 30);
  assert.equal(new Set(ICONS).size, ICONS.length);
  for (const c of DEFAULT_CATEGORIES) assert.ok(ICONS.includes(c.icon));
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], rings: [100], categories: [
    { id: 'resto', name: 'Restos', color: '#d9480f' },
    { id: 'zz', name: 'Parcs', color: PALETTE[3], icon: 'pas une icône' },
  ] }));
  const s = loadState(st);
  assert.equal(s.categories[0].icon, '🍽️');
  assert.equal(s.categories[1].icon, DEFAULT_ICON);
});

test('style des favoris : par défaut, modifiable, conservé, valeurs invalides refusées', () => {
  assert.deepEqual(DEFAULT_FAV, { icon: '⭐', color: '#f2a900' });
  assert.equal(FAV_COLORS[0], '#f2a900');
  assert.deepEqual(loadState(memStorage()).fav, DEFAULT_FAV);
  const s = setFavStyle(base(), { icon: '❤️', color: PALETTE[5] });
  assert.deepEqual(s.fav, { icon: '❤️', color: PALETTE[5] });
  assert.throws(() => setFavStyle(base(), { icon: 'x', color: PALETTE[0] }), /icône/i);
  assert.throws(() => setFavStyle(base(), { icon: '❤️', color: 'red' }), /couleur/i);
  const st = memStorage();
  saveState(st, s);
  assert.deepEqual(loadState(st).fav, { icon: '❤️', color: PALETTE[5] });
  st.setItem(KEY, JSON.stringify({ points: [], fav: { icon: '<b>', color: 'javascript:' } }));
  assert.deepEqual(loadState(st).fav, DEFAULT_FAV);
});

test('date de visite : notée quand on passe à « Déjà visité », effacée sinon, conservée au rechargement', () => {
  const p = sample();
  assert.equal(p.visited, null);
  assert.ok(newPoint({ name: 'a', cat: 'resto', lat: 1, lng: 1, done: true }).visited > 0);
  setDone(p, true, 1000);
  assert.equal(p.visited, 1000);
  setDone(p, true, 2000);
  assert.equal(p.visited, 1000, 'reste la date de la première visite');
  setDone(p, false);
  assert.equal(p.visited, null);
  assert.equal(p.done, false);
  setDone(p, true, 3000);
  const st = memStorage();
  saveState(st, { ...base(), points: [p] });
  assert.equal(loadState(st).points[0].visited, 3000);
  st.setItem(KEY, JSON.stringify({ points: [{ ...sample(), done: true, visited: undefined }] }));
  assert.equal(loadState(st).points[0].visited, null, 'ancien lieu visité sans date');
});

test('nom du fichier de sauvegarde : date, heure et nombre de lieux', () => {
  const d = new Date(2026, 10, 5, 9, 7);
  assert.equal(exportFileName(d, 42), 'Ma carte de Paris - sauvegarde du 05-11-2026 à 09h07 (42 lieux).json');
  assert.equal(exportFileName(d, 1), 'Ma carte de Paris - sauvegarde du 05-11-2026 à 09h07 (1 lieu).json');
  assert.doesNotMatch(exportFileName(d, 3), /[\/:*?"<>|]/);
});

test('catégories toutes prêtes : valides, sans doublon, et celles déjà présentes ne sont pas reproposées', () => {
  assert.ok(PRESETS.length >= 12);
  for (const p of PRESETS) {
    assert.ok(ICONS.includes(p.icon), p.name);
    assert.ok(PALETTE.includes(p.color), p.name);
    assert.ok(p.name.length <= 20, p.name);
    assert.doesNotThrow(() => addCategory(base(), p));
  }
  assert.equal(new Set(PRESETS.map((p) => p.name)).size, PRESETS.length);
  const names = suggestedPresets([{ id: 'x', name: 'cafes', color: PALETTE[0], icon: '☕' }, ...DEFAULT_CATEGORIES]).map((p) => p.name);
  assert.ok(!names.includes('Cafés') && !names.includes('Restos') && !names.includes('Boutiques'));
  assert.ok(names.includes('Bars'));
});

test('rappel de sauvegarde : souvent', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 10, 15);
  const pts = (n, age) => Array.from({ length: n }, () => ({ ...sample(), created: now - age * DAY }));
  assert.equal(backupDue({ points: pts(2, 1), lastExport: null }, now), false, 'moins de 3 lieux, jamais sauvegardé');
  assert.equal(backupDue({ points: pts(3, 1), lastExport: null }, now), true, '3 lieux jamais sauvegardés');
  assert.equal(backupDue({ points: pts(5, 20), lastExport: now - 10 * DAY }, now), false, 'rien de nouveau depuis');
  assert.equal(backupDue({ points: [...pts(5, 20), ...pts(1, 2)], lastExport: now - 10 * DAY }, now), true, 'un lieu nouveau, sauvegarde de plus de 7 jours');
  assert.equal(backupDue({ points: [...pts(5, 20), ...pts(1, 1)], lastExport: now - 3 * DAY }, now), false, 'sauvegarde récente');
  assert.equal(backupDue({ points: [...pts(5, 20), ...pts(10, 1)], lastExport: now - 2 * DAY }, now), true, '10 lieux nouveaux');
  assert.equal(unsavedCount({ points: [...pts(5, 20), ...pts(4, 1)], lastExport: now - 2 * DAY }), 4);
  const st = memStorage();
  saveState(st, { ...base(), lastExport: 1234 });
  assert.equal(loadState(st).lastExport, 1234);
});

test('voix activée par défaut, réglage conservé', () => {
  assert.equal(loadState(memStorage()).voice, true);
  const st = memStorage();
  saveState(st, { ...base(), voice: false });
  assert.equal(loadState(st).voice, false);
});

test('unité des cercles : mètres par défaut, minutes conservées', () => {
  const s0 = loadState(memStorage());
  assert.equal(s0.ringUnit, 'm');
  assert.deepEqual(s0.minuteRings, [5, 10, 15, 20]);
  const st = memStorage();
  saveState(st, { ...base(), ringUnit: 'min', minuteRings: [3, 8] });
  const s1 = loadState(st);
  assert.equal(s1.ringUnit, 'min');
  assert.deepEqual(s1.minuteRings, [3, 8]);
});
