// Mots tout prêts (v226, mes choix du 19 nov. 2026 : 1A 2A 3A 4A 5A, 6A 7A 8A, 9A 10A 11A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_WORDS, cleanWords, wordsOf, seriesIdOf, seriesOf, toggleWord, hasWord, saveSeries, deleteSeries, wordsAsStart, WORDS_MAX } from '../js/mots.js';
import { loadState, saveState, exportJSON, exportForFriend, mergeImport, backupHash, updateCategory, addCategory } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
let n = 0;
const ids = () => `s${++n}`;

test('séries de départ : la catégorie prend celle de son nom, sinon aucune', () => {
  const w = wordsOf({});
  assert.deepEqual(w, DEFAULT_WORDS);
  assert.equal(seriesIdOf({ id: 'x', name: 'Cafés' }, w), 'repas');
  assert.equal(seriesIdOf({ id: 'x', name: 'MUSÉES' }, w), 'visite');
  assert.equal(seriesIdOf({ id: 'x', name: 'Street art' }, w), 'streetart');
  assert.equal(seriesIdOf({ id: 'resto', name: 'Mes tables' }, w), 'repas'); // catégorie d'origine renommée
  assert.equal(seriesIdOf({ id: 'x', name: 'Parcs et jardins' }, w), '');
  assert.equal(seriesIdOf({ id: 'x', name: 'Cafés', words: '' }, w), ''); // « Aucun » choisi
  assert.equal(seriesIdOf({ id: 'x', name: 'Cafés', words: 'disparue' }, w), '');
  assert.equal(seriesIdOf({ id: 'x', name: 'Cafés' }, w.filter((s) => s.id !== 'repas')), '');
  assert.equal(seriesOf({ id: 'x', name: 'Bars' }, w).name, 'Repas');
});

test('un appui ajoute le mot à la fin, un second le retire ; le texte libre reste', () => {
  assert.equal(toggleWord('', 'Très bon'), 'Très bon');
  assert.equal(toggleWord('Très bon', 'J\'y retourne'), 'Très bon · J\'y retourne');
  assert.equal(toggleWord('la terrasse au soleil', 'Très bon'), 'la terrasse au soleil · Très bon');
  assert.equal(toggleWord('Très bon · J\'y retourne', 'Très bon'), 'J\'y retourne');
  assert.equal(toggleWord('la terrasse · très bon', 'Très bon'), 'la terrasse');
  assert.equal(toggleWord('Très bon · ', 'Trop cher'), 'Très bon · Trop cher');
  assert.ok(hasWord('a · Très bon', 'très bon'));
  assert.ok(!hasWord('Très bonne table', 'Très bon'));
});

test('une série : nom et au moins un mot, sans doublon ; nom unique', () => {
  const r = saveSeries(DEFAULT_WORDS, null, '  Expo ', ['Belle', '', 'belle', 'À revoir', 'a', 'b', 'c', 'd', 'e'], ids);
  const s = r.words.find((x) => x.id === r.id);
  assert.equal(s.name, 'Expo');
  assert.deepEqual(s.words, ['Belle', 'À revoir', 'a', 'b', 'c', 'd', 'e']);
  assert.throws(() => saveSeries(DEFAULT_WORDS, null, 'repas', ['x'], ids), /existe déjà/);
  assert.throws(() => saveSeries(DEFAULT_WORDS, null, 'Nouvelle', ['', ' '], ids), /au moins un mot/);
  assert.throws(() => saveSeries(DEFAULT_WORDS, null, '', ['x'], ids), /nom/);
  const edited = saveSeries(DEFAULT_WORDS, 'repas', 'Repas', ['Bon'], ids);
  assert.deepEqual(edited.words.find((x) => x.id === 'repas').words, ['Bon']);
  assert.equal(cleanWords([{ id: 'a', name: 'A', words: [] }]).length, 0);
});

test('v403 : autant de mots que je veux (plus de 6), gardés au rechargement ; 100, limite de sécurité', () => {
  const douze = Array.from({ length: 12 }, (_, i) => `Mot ${i + 1}`);
  const r = saveSeries(DEFAULT_WORDS, 'repas', 'Repas', douze, ids);
  assert.deepEqual(r.words.find((x) => x.id === 'repas').words, douze);
  assert.deepEqual(cleanWords(r.words).find((x) => x.id === 'repas').words, douze); // relu depuis le téléphone ou une sauvegarde
  assert.equal(WORDS_MAX, 100);
  const trop = saveSeries(DEFAULT_WORDS, null, 'Long', Array.from({ length: 150 }, (_, i) => `m${i}`), ids);
  assert.equal(trop.words.find((x) => x.id === trop.id).words.length, WORDS_MAX);
});

test('supprimer une série : ses catégories passent à « Aucun »', () => {
  const s = { categories: [{ id: 'resto', name: 'Restos' }, { id: 'c', name: 'Culture', words: 'visite' }] };
  const out = deleteSeries(s, 'repas');
  assert.equal(out.categories[0].words, '');
  assert.equal(out.categories[1].words, 'visite');
  assert.ok(!out.words.some((x) => x.id === 'repas'));
});

test('enregistrement, sauvegarde, restauration ; rien dans le fichier pour un proche', () => {
  const st = memStorage();
  let s = loadState(st);
  assert.equal(s.words, undefined); // séries de départ, rien d'écrit tant que je ne change rien
  s = updateCategory(s, 'resto', { name: 'Restos', color: s.categories[0].color, icon: s.categories[0].icon, words: '' });
  const r = saveSeries(wordsOf(s), null, 'Expo', ['Belle'], ids);
  s = { ...s, words: r.words };
  saveState(st, s);
  const back = loadState(st);
  assert.deepEqual(back.words, r.words);
  assert.equal(back.categories.find((c) => c.id === 'resto').words, '');
  const file = exportJSON(back);
  const restored = mergeImport(loadState(memStorage()), file).state;
  assert.deepEqual(restored.words, r.words);
  assert.equal(restored.categories.find((c) => c.id === 'resto').words, '');
  // un proche : ni mes séries ni mon choix
  const withPlace = { ...back, points: [{ id: 'p', name: 'Bistrot', cat: 'resto', lat: 48.87, lng: 2.34, note: '', done: false, fav: false, created: 1 }] };
  const friend = exportForFriend(withPlace);
  assert.equal(friend.words, undefined);
  assert.ok(friend.categories.every((c) => !('words' in c)));
  assert.equal(mergeImport(loadState(memStorage()), JSON.stringify({ ...JSON.parse(file) }), 'Anne').state.words, undefined);
});

test('empreinte de sauvegarde : la même qu\'avant tant que les mots sont ceux du départ', () => {
  const s = loadState(memStorage());
  const h0 = backupHash(s);
  assert.ok(wordsAsStart(s));
  // ouvrir une catégorie et l'enregistrer sans rien changer ne compte pas
  assert.equal(backupHash({ ...s, categories: s.categories.map((c) => ({ ...c, words: seriesIdOf(c, DEFAULT_WORDS) })) }), h0);
  assert.equal(backupHash({ ...s, words: DEFAULT_WORDS.map((x) => ({ ...x })) }), h0);
  assert.notEqual(backupHash({ ...s, categories: s.categories.map((c) => ({ ...c, words: '' })) }), h0);
  assert.notEqual(backupHash({ ...s, words: [] }), h0);
});

test('une catégorie ajoutée sans choix prend la série de son nom', () => {
  const s = addCategory(loadState(memStorage()), { name: 'Cafés', color: '#9c6644', icon: '☕' });
  const c = s.categories.at(-1);
  assert.equal('words' in c, false);
  assert.equal(seriesIdOf(c, wordsOf(s)), 'repas');
});

test('l\'appli : rangée de mots sous « En quelques mots », ligne dans Réglages → Mes lieux (v239), fichier gardé hors réseau', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(app, /'En quelques mots \(facultatif\)', text\),[^\n]*\n\s+wordBox,/);
  // v404 : un titre et un exemple qui valent pour toutes les catégories (« Ce que j'ai vu » et la glycine ne vont pas à un resto)
  assert.doesNotMatch(app, /Ce que j\\'ai vu|la glycine en fleur'/);
  assert.match(app, /placeholder: 'Ex\. : terrasse au soleil' \}\);\n\s+\/\/ Mots tout prêts/);
  // v239 : une ligne à elle dans Réglages → Mes lieux ; plus dans la page Catégories et listes.
  // v322 (mon choix 1a) : rangée dans Autres réglages → Mes lieux, sous Mes lignes de bus
  assert.match(app, /'Le chemin de tes lignes sur la carte', \(\) => openMyBusLines\(\), false, 'c-metro'\),\n\s+row\('message-square-text', 'Mots tout prêts'/);
  assert.equal((app.match(/\(\) => openWordSeries\(\)/g) ?? []).length, 1);
  assert.doesNotMatch(app, /Catégories et listes → Mots tout prêts/);
  assert.match(sw, /'js\/mots\.js'/);
});
