// v311 (mes choix 1A 2B 3A 4A 5C du 20 nov.) : Réglages → Vu en passant → « Après la photo » : catégories cochées (au départ :
// toutes), leur ordre propre, une page par catégorie pour ses sous-catégories (créer, renommer, ↑ ↓, supprimer avec « Annuler »).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, cleanSettings, seenSettings, seenOrderOf, moveSub, addSub } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mem = (o) => { const m = new Map(o ? [['carte-paris.v1', JSON.stringify(o)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('Au départ : toutes cochées, aucun ordre ; gardés dans mes réglages par défaut', () => {
  const s = seenSettings({});
  assert.deepEqual([s.seenOff, s.seenOrder], [[], []]);
  const c = cleanSettings({ seenOff: ['resto', 'resto', '../x'], seenOrder: ['culture', 'streetart'] });
  assert.deepEqual(c.seenOff, ['resto']); assert.deepEqual(c.seenOrder, ['culture', 'streetart']);
});

test('L\'ordre : celui réglé, les catégories nouvelles au bout, les supprimées oubliées', () => {
  assert.deepEqual(seenOrderOf(['c', 'a'], ['a', 'b', 'c']), ['c', 'a', 'b']);
  assert.deepEqual(seenOrderOf(['x', 'b'], ['a', 'b']), ['b', 'a']);
  assert.deepEqual(seenOrderOf(null, ['a', 'b']), ['a', 'b']);
});

test('Les sous-catégories dans mon ordre (↑ ↓)', () => {
  let s = loadState(mem({ categories: [{ id: 'culture', name: 'Culture', color: '#7048e8', icon: '🏛️' }], points: [] }));
  for (const n of ['Portes', 'Cours', 'Vitrines']) s = addSub(s, 'culture', n).state;
  const v = s.categories[0].subs.find((x) => x.name === 'Vitrines').id;
  s = moveSub(s, 'culture', v, -1);
  assert.deepEqual(s.categories[0].subs.map((x) => x.name), ['Portes', 'Vitrines', 'Cours']);
  assert.equal(moveSub(s, 'culture', s.categories[0].subs[0].id, -1), s, 'déjà en tête : rien ne bouge');
});

test('Dans l\'appli : seulement les cochées après la photo, Vu en passant toujours en tête ; gestion dans Réglages → Vu en passant', () => {
  assert.match(app, /const seenCats = \(\) => seenCatsAll\(\)\.filter\(\(c, i\) => i === 0 \|\| !\(state\.seenOff \?\? \[\]\)\.includes\(c\.id\)\);/);
  assert.match(app, /return \[vu, \.\.\.seenOrderOf\(state\.seenOrder, all\.slice\(1\)\.map\(\(c\) => c\.id\)\)/);
  assert.match(app, /el\('span', \{\}, 'Après la photo'\)/);
  assert.match(app, /function openSeenSubs\(catId\)/);
  assert.match(app, /« \$\{x\.name\} » supprimée \(ses photos restent\)`, false, \{ label: 'Annuler'/);
  assert.match(app, /Ses \$\{plural\(c\.subs\.length, 'sous-catégorie', 'sous-catégories'\)\} \(photos prises en passant\) : Réglages → Autres réglages → Vu en passant → \$\{c\.name\}\./, 'la page de la catégorie dit seulement où');
  assert.match(app, /if \(state\.seenStart === 'street' && seenCats\(\)\.some\(isStreetCat\)\)/, 'Street art décochée : pas une autre catégorie à sa place');
});
