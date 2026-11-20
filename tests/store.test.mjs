import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newPoint, validatePoint, loadState, saveState, exportJSON, mergeImport, KEY,
  DEFAULT_CATEGORIES, PALETTE, ICONS, DEFAULT_ICON, DEFAULT_FAV, FAV_COLORS, setFavStyle, setDone, exportFileName, trackChange, savedBackup, PRESETS, suggestedPresets, backupDue, unsavedCount, fileOwner, owners, addCategory, updateCategory, deleteCategory,
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

test('horaires gardés, coupés à 300 caractères', () => {
  assert.equal(newPoint({ name: 'a', cat: 'resto', lat: 1, lng: 1, hours: 'Mo-Fr 09:00-18:00' }).hours, 'Mo-Fr 09:00-18:00');
  assert.equal(newPoint({ name: 'a', cat: 'resto', lat: 1, lng: 1, hours: 'x'.repeat(400) }).hours.length, 300);
  assert.equal(newPoint({ name: 'a', cat: 'resto', lat: 1, lng: 1 }).hours, '');
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
  assert.equal(exportFileName(d, 42), 'Ma carte de Paris - sauvegarde du 05-11-2026 09h07 (42 lieux).json');
  assert.match(exportFileName(d, 42), /^[\x20-\x7e]+$/, 'nom sans accent');
  assert.equal(exportFileName(d, 1), 'Ma carte de Paris - sauvegarde du 05-11-2026 09h07 (1 lieu).json');
  assert.doesNotMatch(exportFileName(d, 3), /[\/:*?"<>|]/);
});

test('catégories toutes prêtes : valides, sans doublon, et celles déjà présentes ne sont pas reproposées', () => {
  assert.ok(PRESETS.length >= 12);
  for (const p of PRESETS) {
    assert.ok(ICONS.includes(p.icon), p.name);
    assert.ok(PALETTE.includes(p.color), p.name);
    assert.ok(p.name.length <= 20, p.name);
    assert.doesNotThrow(() => addCategory({ ...base(), categories: [] }, p)); // v209 : sur une appli sans catégorie (Restos et Boutiques sont aussi celles du départ)
  }
  assert.equal(new Set(PRESETS.map((p) => p.name)).size, PRESETS.length);
  const names = suggestedPresets([{ id: 'x', name: 'cafes', color: PALETTE[0], icon: '☕' }, ...DEFAULT_CATEGORIES]).map((p) => p.name);
  assert.ok(!names.includes('Cafés') && !names.includes('Restos') && !names.includes('Boutiques'));
  assert.ok(names.includes('Bars'));
});

test('sauvegarde : tout changement compte, revenir à l\'état sauvegardé remet à zéro', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 10, 16);
  let st = { ...base(), points: [sample()] };
  st.backup = savedBackup(st);
  assert.equal(trackChange(st, now).n, 0, 'rien n\'a changé');
  const step = (s, change) => { const next = { ...s, ...change(s) }; next.backup = trackChange(next, now); return next; };
  st = step(st, (s) => ({ points: s.points.map((p) => ({ ...p, note: 'Le jardin' })) }));
  assert.equal(st.backup.n, 1, 'une note');
  st = step(st, (s) => ({ points: s.points.map((p) => ({ ...p, stars: 4 })) }));
  st = step(st, (s) => ({ points: s.points.map((p) => ({ ...p, done: true })) }));
  assert.equal(st.backup.n, 3, 'étoiles et déjà visité comptent aussi');
  assert.equal(trackChange(st, now).n, 3, 'enregistrer deux fois le même état ne compte qu\'une fois');
  assert.equal(st.backup.since, now);
  const saved = { ...st, backup: savedBackup(st) };
  const back = step(step(saved, (s) => ({ points: s.points.map((p) => ({ ...p, fav: !p.fav })) })), (s) => ({ points: s.points.map((p) => ({ ...p, fav: !p.fav })) }));
  assert.equal(back.backup.n, 0, 'favori allumé puis éteint : rien à sauvegarder');
  assert.equal(step(saved, () => ({ points: [] })).backup.n, 1, 'une suppression compte');
});

test('rappel de sauvegarde : dès 5 changements, ou un changement de plus de 3 jours', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 10, 16);
  const b = (n, age) => ({ backup: { saved: 'x', last: 'y', n, since: n ? now - age * DAY : null } });
  assert.equal(backupDue(b(0, 0), now), false, 'rien en attente');
  assert.equal(backupDue(b(4, 1), now), false, '4 changements récents');
  assert.equal(backupDue(b(5, 0), now), true, '5 changements');
  assert.equal(backupDue(b(1, 4), now), true, 'un changement de plus de 3 jours');
  assert.equal(backupDue({}, now), false);
});

test('sauvegarde : reprise de l\'ancien compteur (lieux ajoutés) et état gardé', () => {
  const DAY = 86_400_000;
  const now = Date.UTC(2026, 10, 16);
  const pts = (n, age) => Array.from({ length: n }, () => ({ ...sample(), created: now - age * DAY }));
  const old = memStorage();
  old.setItem('carte-paris.v1', JSON.stringify({ points: [...pts(2, 20), ...pts(3, 4)], lastExport: now - 10 * DAY }));
  const st = loadState(old);
  assert.equal(st.backup.n, 3, 'les 3 lieux ajoutés depuis la dernière sauvegarde');
  assert.equal(st.backup.since, now - 4 * DAY);
  assert.equal(trackChange(st, now).n, 3, 'au chargement, rien de nouveau');
  const mem = memStorage();
  saveState(mem, { ...base(), lastExport: 1234, backup: { saved: 'a', last: 'b', n: 2, since: 99 } });
  assert.equal(loadState(mem).lastExport, 1234);
  assert.deepEqual(loadState(mem).backup, { saved: 'a', last: 'b', n: 2, since: 99 });
  assert.equal(unsavedCount({ points: [...pts(5, 20), ...pts(4, 1)], lastExport: now - 2 * DAY }), 4);
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

test('plusieurs personnes : les lieux d\'un ami gardent son prénom', () => {
  const paul = { ...base(), me: 'Paul', points: [sample(), { ...sample(), id: 'lea1', owner: 'Léa' }, { ...sample(), id: 'moi1', owner: 'Marie' }] };
  const text = exportJSON(paul);
  assert.equal(fileOwner(text), 'Paul');
  assert.equal(fileOwner('pas du json'), '');
  const moi = { ...base(), me: 'Marie', points: [] };
  const r = mergeImport(moi, text, 'Paul');
  const by = Object.fromEntries(r.state.points.map((p) => [p.id, p.owner]));
  assert.equal(by[paul.points[0].id], 'Paul');
  assert.equal(by.lea1, 'Léa');
  assert.equal(by.moi1, '', 'un lieu à mon prénom redevient le mien');
  assert.deepEqual(owners(r.state.points), [{ name: 'Léa', n: 1 }, { name: 'Paul', n: 1 }]);
});

test('ma propre sauvegarde : les lieux restent les miens', () => {
  const moi = { ...base(), me: 'Marie', points: [sample()] };
  const r = mergeImport({ ...base(), me: 'Marie' }, exportJSON(moi), '');
  assert.equal(r.state.points[0].owner, '');
});

test('prénom et compteur de marche conservés', () => {
  const st = memStorage();
  saveState(st, { ...base(), me: '  Marie  ', walk: { day: '2026-11-15', m: 1234 } });
  const s = loadState(st);
  assert.equal(s.me, 'Marie');
  assert.deepEqual(s.walk, { day: '2026-11-15', m: 1234 });
  assert.deepEqual(loadState(memStorage()).walk, { day: '', m: 0 });
});

test('export : chaque lieu porte le prénom de qui l\'a ajouté', () => {
  const marie = { ...base(), me: 'Marie', points: [sample(), { ...sample(), id: 'x', owner: 'Paul' }] };
  const pts = JSON.parse(exportJSON(marie)).points;
  assert.deepEqual(pts.map((p) => p.owner), ['Marie', 'Paul']);
  // réimporté chez Marie : ses lieux redeviennent les siens
  const r = mergeImport({ ...base(), me: 'Marie' }, exportJSON(marie), '');
  assert.deepEqual(r.state.points.map((p) => p.owner), ['', 'Paul']);
  // chez Léa : chaque lieu garde son auteur
  const l = mergeImport({ ...base(), me: 'Léa' }, exportJSON(marie), 'Marie');
  assert.deepEqual(l.state.points.map((p) => p.owner), ['Marie', 'Paul']);
});

test('photos : identifiants gardés, valeurs douteuses écartées', () => {
  const st = memStorage();
  saveState(st, { ...base(), points: [{ ...sample(), photos: ['abc-1', '../x', 42, 'ok_2'] }] });
  assert.deepEqual(loadState(st).points[0].photos, ['abc-1', 'ok_2']);
  assert.deepEqual(sample().photos, []);
});

test('note en étoiles : 0 à 5, valeurs farfelues ramenées à 0', async () => {
  const { newPoint, cleanStars } = await import('../js/store.js');
  assert.equal(newPoint({ name: 'A', cat: 'resto', lat: 48.86, lng: 2.34, stars: 4 }).stars, 4);
  assert.equal(newPoint({ name: 'A', cat: 'resto', lat: 48.86, lng: 2.34 }).stars, 0);
  assert.equal(cleanStars(7), 0);
  assert.equal(cleanStars(2.5), 0);
  assert.equal(cleanStars('3'), 0);
});

test('ordre des catégories : monter, descendre, bornes', async () => {
  const { moveCategory } = await import('../js/store.js');
  const st = { categories: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], points: [] };
  assert.deepEqual(moveCategory(st, 'c', -1).categories.map((c) => c.id), ['a', 'c', 'b']);
  assert.deepEqual(moveCategory(st, 'a', 1).categories.map((c) => c.id), ['b', 'a', 'c']);
  assert.equal(moveCategory(st, 'a', -1), st);
  assert.equal(moveCategory(st, 'c', 1), st);
  assert.equal(moveCategory(st, 'zz', 1), st);
});

test('ordre des boutons de la carte : valide, complété, déplaçable', async () => {
  const { normalizeTools, moveTool, MAP_TOOLS } = await import('../js/store.js');
  assert.deepEqual(normalizeTools(undefined), MAP_TOOLS);
  assert.deepEqual(normalizeTools(['home', 'home', 'zoom', 'pirate']), ['home', 'paris', 'pratique', 'metro', 'velib', 'sorties', 'planning', 'circuits', 'notes', 'locate']); // l'ancien bouton zoom disparaît
  assert.deepEqual(normalizeTools(['pratique', 'metro', 'velib', 'home', 'street', 'paris', 'locate']), ['pratique', 'metro', 'velib', 'home', 'paris', 'sorties', 'planning', 'circuits', 'notes', 'locate'], 'le bouton « Dans la rue » est parti en haut, Sorties arrive avant Ma position');
  assert.deepEqual(normalizeTools(['pratique', 'metro', 'home', 'locate']), ['pratique', 'metro', 'home', 'paris', 'velib', 'sorties', 'planning', 'circuits', 'notes', 'locate'], 'bouton manquant juste avant Ma position');
  assert.deepEqual(moveTool(MAP_TOOLS, 'home', -1), ['paris', 'pratique', 'metro', 'home', 'velib', 'sorties', 'planning', 'circuits', 'notes', 'locate']);
  assert.deepEqual(moveTool(MAP_TOOLS, 'paris', -1), MAP_TOOLS);
});

test('boutons cachés : noms connus seulement', async () => {
  const { cleanHidden } = await import('../js/store.js');
  assert.deepEqual(cleanHidden(['paris', 'pirate', 'paris', 'metro', 'zoom']), ['paris', 'metro']);
  assert.deepEqual(cleanHidden(null), []);
});

test('listes : créer, reprendre le même nom, renommer, supprimer, export et import', async () => {
  const { addList, renameList, deleteList, exportJSON, mergeImport, newPoint, DEFAULT_CATEGORIES } = await import('../js/store.js');
  let st = { points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [], fav: {}, rings: [] };
  const a = addList(st, 'Sous la pluie'); st = a.state;
  assert.equal(addList(st, 'sous la pluie').id, a.id);
  assert.throws(() => addList(st, '  '), /nom/);
  st = { ...st, points: [newPoint({ name: 'X', cat: 'resto', lat: 48.86, lng: 2.34, lists: [a.id, a.id, 'bad id!'], covered: true })] };
  assert.deepEqual(st.points[0].lists, [a.id]);
  assert.equal(st.points[0].covered, true);
  st = renameList(st, a.id, 'Abrités');
  assert.equal(st.lists[0].name, 'Abrités');
  const file = exportJSON(st);
  const other = mergeImport({ points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [] }, file);
  assert.equal(other.state.lists[0].name, 'Abrités');
  assert.deepEqual(other.state.points[0].lists, [a.id]);
  st = deleteList(st, a.id);
  assert.deepEqual(st.lists, []);
  assert.deepEqual(st.points[0].lists, []);
});

test('mes réglages par défaut : enregistrer, détecter un changement, revenir, garder dans la sauvegarde', async () => {
  const { saveMySettings, applyMySettings, sameAsMySettings, exportJSON, mergeImport, DEFAULT_CATEGORIES, loadState, saveState } = await import('../js/store.js');
  let st = { points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [], fav: { icon: '❤️', color: '#c2255c' }, rings: [100, 500], mapStyle: 'night', theme: 'dark', toolsSide: 'left', hiddenTools: ['paris'], voice: false };
  assert.equal(sameAsMySettings(st), false);
  st = saveMySettings(st, 1000);
  assert.equal(sameAsMySettings(st), true);
  st = { ...st, mapStyle: 'classic', toolsSide: 'right' };
  assert.equal(sameAsMySettings(st), false);
  st = applyMySettings(st);
  assert.equal(st.mapStyle, 'night'); assert.equal(st.toolsSide, 'left'); assert.equal(st.voice, false);
  assert.deepEqual(st.hiddenTools, ['paris']);
  // garde après rechargement
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  saveState(storage, st);
  assert.equal(loadState(storage).mySettings.settings.mapStyle, 'night');
  // repris depuis ma sauvegarde sur un autre téléphone, sans être appliqué d'office
  const other = mergeImport({ points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [] }, exportJSON(st), '');
  assert.equal(other.state.mySettings.settings.theme, 'dark');
  assert.equal(other.state.theme, undefined);
  // pas repris depuis le fichier d'un ami
  assert.equal(mergeImport({ points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [] }, exportJSON(st), 'Paul').state.mySettings, undefined);
});

test('mes stations : personnelles, sans doublon, dans ma sauvegarde mais pas reprises d\'un ami', async () => {
  const { addMyStation, removeMyStation, exportJSON, mergeImport, DEFAULT_CATEGORIES } = await import('../js/store.js');
  let st = { points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [], myStations: [] };
  st = addMyStation(st, 'Nation', 'Maison');
  st = addMyStation(st, 'Nation', 'Chez moi');
  st = addMyStation(st, 'Opéra', 'Travail');
  assert.deepEqual(st.myStations.map((s) => [s.station, s.label]), [['Nation', 'Chez moi'], ['Opéra', 'Travail']]);
  const file = exportJSON(st);
  const empty = () => ({ points: [], categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [], myStations: [] });
  assert.equal(mergeImport(empty(), file, '').state.myStations.length, 2);
  assert.equal(mergeImport(empty(), file, 'Paul').state.myStations.length, 0);
  st = removeMyStation(st, st.myStations[0].id);
  assert.deepEqual(st.myStations.map((s) => s.station), ['Opéra']);
});

test('boutons Paris et Zoom cachés au départ, une seule fois pour les anciens réglages', async () => {
  const { loadState, saveState, DEFAULT_HIDDEN } = await import('../js/store.js');
  const mem = (v) => { let x = v; return { getItem: () => x, setItem: (_k, val) => { x = val; } }; };
  assert.deepEqual(DEFAULT_HIDDEN, ['paris']);
  assert.deepEqual(loadState(mem(null)).hiddenTools, []); // depuis la v124, Paris est affiché
  const old = mem(JSON.stringify({ points: [], hiddenTools: ['velib'] }));
  const st = loadState(old);
  assert.deepEqual(st.hiddenTools, ['velib']);
  assert.equal(st.mapTools.at(-1), 'locate'); // le bouton position passe en bas
  st.hiddenTools = []; saveState(old, st); // l'utilisatrice les réaffiche : ça doit tenir
  assert.deepEqual(loadState(old).hiddenTools, []);
});

test('Mon billet : gardé s\'il est lisible, sinon rien', () => {
  const st = memStorage();
  const at = new Date(2026, 10, 17, 15).getTime();
  st.setItem(KEY, JSON.stringify({ points: [
    { id: 'a', name: 'Orsay', cat: 'x', lat: 48.86, lng: 2.33, ticket: { at, junk: 1 } },
    { id: 'b', name: 'Louvre', cat: 'x', lat: 48.86, lng: 2.34, ticket: { at: 'demain' } },
  ] }));
  const s = loadState(st);
  assert.deepEqual(s.points[0].ticket, { at });
  assert.equal(s.points[1].ticket, undefined);
});

test('barre du haut : boutons masqués gardés, valeurs inconnues écartées', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], hiddenChips: ['fav', 'cat:resto', 'cat:resto', '<script>', 42, 'all', 'street', 'lines'] }));
  const s = loadState(st);
  assert.deepEqual(s.hiddenChips, ['fav', 'cat:resto', 'all', 'street', 'lines']);
  saveState(st, { ...s, hiddenChips: ['filters'] });
  assert.deepEqual(loadState(st).hiddenChips, ['filters']);
  assert.deepEqual(loadState(memStorage()).hiddenChips, ['ttb'], 'v312 : TTB masqué au départ d\'un nouveau venu');
});

test('feuille Filtres : lignes masquées gardées, inconnues écartées', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], hiddenFilters: ['top', 'xx', 'people', 'top'] }));
  assert.deepEqual(loadState(st).hiddenFilters, ['top', 'people']);
  assert.deepEqual(loadState(memStorage()).hiddenFilters, []);
});

test('setListMembers : ajoute et retire d\'un coup', async () => {
  const { setListMembers } = await import('../js/store.js');
  const st = { lists: [{ id: 'L', name: 'Pluie' }], points: [
    { id: 'a', lists: ['L'] }, { id: 'b', lists: [] }, { id: 'c' }, { id: 'd', lists: ['M', 'L'] },
  ] };
  const r = setListMembers(st, 'L', ['b', 'c', 'd']);
  assert.deepEqual(r.points.map((p) => p.lists ?? []), [[], ['L'], ['L'], ['M', 'L']]);
  assert.equal(r.points[3], st.points[3], 'lieu inchangé : même objet');
  assert.deepEqual(st.points[0].lists, ['L'], 'état d\'origine intact');
});

test('import du fichier d\'un proche : ses lieux arrivent, ses billets non (ma sauvegarde garde les miens)', () => {
  const at = Date.now() + 2 * 864e5;
  const p = { ...sample(), ticket: { at } };
  const text = JSON.stringify({ app: 'carte-paris', version: 2, owner: 'Léa', points: [p] });
  const r = mergeImport(base(), text, 'Léa');
  assert.equal(r.added, 1);
  assert.equal(r.state.points[0].owner, 'Léa');
  assert.equal(r.state.points[0].ticket, undefined);
  const mine = mergeImport(base(), text, '');
  assert.equal(mine.state.points[0].ticket.at, at);
});

test('Mon billet : « avec qui » est gardé, coupé à 40 signes, vide = absent', () => {
  const s0 = base();
  const at = Date.now() + 864e5;
  const a = { ...sample(), id: 'a1', ticket: { at, with: '  Léa  ' } };
  const b = { ...sample(), id: 'b1', name: 'Autre', lat: 48.87, ticket: { at, with: '   ' } };
  const text = JSON.stringify({ app: 'carte-paris', version: 2, points: [a, b] });
  const r = mergeImport(s0, text, '');
  assert.equal(r.state.points.find((p) => p.id === 'a1').ticket.with, 'Léa');
  assert.equal(r.state.points.find((p) => p.id === 'b1').ticket.with, undefined);
});

test('sauvegarde : restaurer sur une appli vide garde mes lieux à moi et remet mes réglages', async () => {
  const { loadState, exportJSON, mergeImport, readSettings, FAV_ICONS } = await import('../js/store.js');
  const icon = FAV_ICONS.find((i) => i !== '⭐');
  const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  let st = loadState(mem());
  const cat = st.categories[0].id;
  st = { ...st, me: 'Capucine', fav: { icon, color: st.fav.color }, rings: [300, 700], chipIcons: true, theme: 'dark', mapStyle: 'pastel', showLines: true, showTtb: true, hiddenChips: ['fav'],
    points: [{ id: 'p1', name: 'Lomi', lat: 48.89, lng: 2.35, cat, note: '', done: false, fav: true, stars: 4, lists: [], created: 1, ticket: { at: Date.UTC(2026, 11, 1, 19) } },
      { id: 'p2', name: 'Chez Léa', lat: 48.86, lng: 2.34, cat, note: '', done: false, fav: false, stars: 0, lists: [], created: 2, owner: 'Léa' }] };
  const txt = exportJSON(st);
  const r = mergeImport(loadState(mem()), txt, '');
  assert.equal(r.state.points.find((p) => p.id === 'p1').owner ?? '', '', 'mon lieu ne devient pas celui de « Capucine »');
  assert.equal(r.state.points.find((p) => p.id === 'p2').owner, 'Léa', 'le lieu d\'un proche le reste');
  assert.ok(r.state.points.find((p) => p.id === 'p1').ticket, 'Mon billet revient');
  assert.equal(r.settings.theme, 'dark');
  assert.equal(r.settings.mapStyle, 'pastel');
  assert.deepEqual(r.settings.rings, [300, 700]);
  assert.equal(r.settings.fav.icon, icon);
  assert.equal(r.settings.showTtb, true);
  assert.deepEqual(r.settings.hiddenChips, ['fav']);
  // Lieux d'un proche : pas ses réglages
  assert.equal(mergeImport(loadState(mem()), txt, 'Capucine').settings, null);
  // Ancien fichier (sans « settings ») : seulement le favori et les cercles qu'il contenait
  const old = JSON.parse(txt); delete old.settings;
  assert.deepEqual(Object.keys(readSettings(old)).sort(), ['fav', 'rings']);
  assert.equal(readSettings({ app: 'carte-paris', points: [] }), null);
});

test('boutons de la carte (v124) : Paris à la place de Fontaine, et « Plus » pour Fontaine, Vélib\' et Rentrer', async () => {
  const { loadState, saveState, layoutV4, cleanMore, cleanSettings } = await import('../js/store.js');
  const mem = (v) => { let x = v; return { getItem: () => x, setItem: (_k, val) => { x = val; } }; };
  const fresh = loadState(mem(null));
  assert.deepEqual(fresh.mapTools.filter((t) => !fresh.moreTools.includes(t)), ['paris', 'metro', 'sorties', 'planning', 'notes', 'locate'], 'v312 : Note du jour sur la carte au départ');
  assert.deepEqual(fresh.moreTools, ['pratique', 'velib', 'home', 'circuits']);
  // Mes réglages de la v123 : Paris caché en 5e place, Fontaine en tête
  const v3 = mem(JSON.stringify({ points: [], layoutV: 3, mapTools: ['pratique', 'metro', 'velib', 'home', 'paris', 'sorties', 'planning', 'locate'], hiddenTools: ['paris', 'velib'] }));
  const st = loadState(v3);
  assert.deepEqual(st.mapTools, ['paris', 'pratique', 'metro', 'velib', 'home', 'sorties', 'planning', 'circuits', 'notes', 'locate']);
  assert.deepEqual(st.hiddenTools, ['velib']);
  assert.deepEqual(st.moreTools, ['pratique', 'home', 'circuits', 'notes'], 'un bouton caché ne va pas dans Plus');
  // Mon choix tient ensuite (pas de seconde migration)
  st.moreTools = ['sorties']; saveState(v3, st);
  assert.deepEqual(loadState(v3).moreTools, ['sorties']);
  assert.deepEqual(cleanMore(['x', 'home', 'home', 'velib'], ['velib']), ['home']);
  assert.deepEqual(layoutV4(['metro', 'paris'], []).mapTools.slice(0, 2), ['metro', 'paris'], 'sans Fontaine avant Paris, l\'ordre ne change pas');
  assert.deepEqual(cleanSettings({ hiddenTools: ['home'] }).moreTools, ['pratique', 'velib', 'circuits', 'notes']);
  // v168 : chez qui avait déjà ses boutons, Circuits arrive dans Plus, jamais sur la carte ; ensuite mon choix tient
  const v165 = mem(JSON.stringify({ points: [], layoutV: 4, mapTools: ['paris', 'pratique', 'metro', 'velib', 'home', 'sorties', 'planning', 'locate'], hiddenTools: [], moreTools: ['velib'] }));
  const s5 = loadState(v165);
  assert.deepEqual(s5.moreTools, ['velib', 'circuits', 'notes']);
  assert.deepEqual(s5.mapTools.at(-3), 'circuits');
  assert.deepEqual(s5.mapTools.at(-2), 'notes');
  s5.moreTools = ['velib']; saveState(v165, s5);
  assert.deepEqual(loadState(v165).moreTools, ['velib'], 'sorti de Plus, il reste sur la carte');
});

test('restauration sur une appli vide : mes catégories et mes listes reviennent telles quelles (audit du 18 nov.)', () => {
  const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c })).map((c) => ({ ...c }));
  cats[0].name = 'Restaurants'; cats[0].color = '#2b8a3e'; cats[0].did = 'Déjà goûté';
  cats.push({ id: 'vide', name: 'Sans lieu', color: '#1971c2', icon: '📍' });
  const mine = { me: 'M', categories: cats, lists: [{ id: 'l1', name: 'Week-end' }, { id: 'l2', name: 'Plus tard' }],
    points: [{ id: 'a', name: 'A', lat: 48.86, lng: 2.35, cat: cats[0].id, lists: ['l1'], created: 1 }] };
  const text = exportJSON(mine);
  const empty = { me: '', categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), points: [], lists: [] };
  const r = mergeImport(empty, text, '').state;
  assert.equal(r.categories[0].name, 'Restaurants');
  assert.equal(r.categories[0].did, 'Déjà goûté');
  assert.ok(r.categories.some((c) => c.id === 'vide'), 'une catégorie sans lieu revient aussi');
  assert.deepEqual(r.lists.map((l) => l.id), ['l1', 'l2']);
  // Sur une appli qui a déjà des lieux, mes catégories ne sont pas remplacées
  const used = { me: 'M', categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), points: [{ id: 'z', name: 'Z', lat: 48.87, lng: 2.36, cat: DEFAULT_CATEGORIES.map((c) => ({ ...c }))[0].id, created: 1 }], lists: [] };
  assert.equal(mergeImport(used, text, '').state.categories[0].name, DEFAULT_CATEGORIES.map((c) => ({ ...c }))[0].name);
  // Les lieux d'un proche ne changent jamais mes catégories
  assert.equal(mergeImport(empty, text, 'Paul').state.categories[0].name, DEFAULT_CATEGORIES.map((c) => ({ ...c }))[0].name);
});

test('catégories : pas deux fois le même nom (v209)', () => {
  const s0 = loadState(memStorage());
  assert.throws(() => addCategory(s0, { name: ' restos ', color: PALETTE[3], icon: ICONS[0] }), /« Restos » existe déjà/);
  assert.throws(() => addCategory(s0, { name: 'Bôutiques', color: PALETTE[3], icon: ICONS[0] }), /existe déjà/);
  const s1 = addCategory(s0, { name: 'Cafés', color: PALETTE[3], icon: ICONS[0] });
  const id = s1.categories.at(-1).id;
  assert.throws(() => updateCategory(s1, id, { name: 'Culture', color: PALETTE[3], icon: ICONS[0] }), /« Culture » existe déjà/);
  assert.equal(updateCategory(s1, id, { name: 'CAFÉS', color: PALETTE[3], icon: ICONS[0] }).categories.at(-1).name, 'CAFÉS');
  // un doublon d'avant la v209 se modifie encore sans changer de nom
  const old = { ...s1, categories: [...s1.categories, { id: 'x2', name: 'Cafés', color: PALETTE[4], icon: ICONS[0] }] };
  assert.equal(updateCategory(old, 'x2', { name: 'Cafés', color: PALETTE[5], icon: ICONS[0] }).categories.at(-1).color, PALETTE[5]);
});

test('favoris : seulement l\'étoile ou le cœur (v240)', async () => {
  const { loadState, setFavStyle, FAV_ICONS, DEFAULT_FAV, KEY } = await import('../js/store.js');
  assert.deepEqual(FAV_ICONS, ['⭐', '❤️']);
  const m = new Map(); const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  st.setItem(KEY, JSON.stringify({ points: [], fav: { icon: '🍷', color: DEFAULT_FAV.color } }));
  assert.equal(loadState(st).fav.icon, '⭐', 'une ancienne icône de catégorie redevient l\'étoile');
  st.setItem(KEY, JSON.stringify({ points: [], fav: { icon: '❤️', color: DEFAULT_FAV.color } }));
  assert.equal(loadState(st).fav.icon, '❤️');
  assert.throws(() => setFavStyle(loadState(st), { icon: '🍷', color: DEFAULT_FAV.color }));
  assert.equal(setFavStyle(loadState(st), { icon: '⭐', color: DEFAULT_FAV.color }).fav.icon, '⭐');
});
