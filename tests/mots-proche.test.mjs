// v357 : mes Mots tout prêts pour un proche, seulement si je les coche (ma demande du 21 nov.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exportForFriend, mergeFriend, SEND_DEFAULT } from '../js/store.js';
import { defaultWords, wordsOf } from '../js/mots.js';

const cats = [{ id: 'resto', name: 'Restaurants', color: '#B4532A', icon: 'utensils', words: 'apero' }];
const pt = (id, cat = 'resto') => ({ id, name: `Lieu ${id}`, cat, lat: 48.86, lng: 2.35 + Number(id.slice(1)) / 100, created: 1, lists: [], note: '' });
const mine = { me: 'Marie', categories: cats, lists: [], points: [pt('a1')], words: [...defaultWords(), { id: 'apero', name: 'Apéro', words: ['Bonne ambiance', 'Terrasse'] }, { id: 'v2', name: 'Visite', words: ['Autre'] }] };
const his = { me: 'Paul', categories: [{ id: 'musee', name: 'Musées', color: '#333333', icon: 'landmark' }], lists: [], points: [] };

test('décochés au départ : ni séries ni lien de catégorie', () => {
  const o = exportForFriend(mine, SEND_DEFAULT);
  assert.equal(o.words, undefined);
  assert.equal(o.categories[0].words, undefined);
  assert.ok(!o.sent.includes('words'));
});

test('cochés : mes séries et le lien de mes catégories partent', () => {
  const o = exportForFriend(mine, { ...SEND_DEFAULT, words: true });
  assert.deepEqual(o.words.map((x) => x.id), wordsOf(mine).map((x) => x.id));
  assert.equal(o.categories[0].words, 'apero');
  assert.ok(o.sent.includes('words'));
});

test('chez lui : mes séries s\'ajoutent, une série du même nom ou du même identifiant reste la sienne ; ma catégorie nouvelle garde sa série', () => {
  const o = JSON.parse(JSON.stringify(exportForFriend(mine, { ...SEND_DEFAULT, words: true })));
  const r = mergeFriend(his, o, 'Marie', { lieux: true, notes: true, words: true });
  assert.equal(r.words, 1, 'seule « Apéro » est nouvelle (« Visite » a le même nom qu\'une des siennes)');
  assert.deepEqual(r.state.words.map((x) => x.name), ['Repas', 'Visite', 'Boutique', 'Street art', 'Apéro']);
  assert.deepEqual(r.state.words.find((x) => x.name === 'Visite').words, defaultWords()[1].words);
  assert.equal(r.state.categories.find((c) => c.id === 'resto').words, 'apero');
  const no = mergeFriend(his, o, 'Marie', { lieux: true, notes: true, words: false });
  assert.equal(no.words, 0);
  assert.equal(no.state.words, undefined);
  assert.equal(no.state.categories.find((c) => c.id === 'resto').words, undefined);
});

test('les écrans : la case dans Envoyer à un proche, la ligne à l\'import, plus « ne partent jamais »', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /row\('words', 'Mots tout prêts'/);
  assert.match(app, /hasWords \? row\(impSel\.words, 'Mots tout prêts'/);
  assert.doesNotMatch(app, /tes parcours, tes mots tout prêts et les lieux de tes proches/);
});
