// v202 : la liste de mes lieux d'un arrondissement (Filtres → une case), rangée par catégorie ;
// un appui sur la carte ouvre un autre arrondissement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arrGroups, arrTap, arrLabelPoint } from '../js/explore.js';

const data = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url), 'utf8'));
const middle = (n) => arrLabelPoint(data.arr.find((a) => a.n === n).rings); // [lat, lng] au milieu de l'arrondissement
const CATS = [{ id: 'resto', name: 'Restos' }, { id: 'boutique', name: 'Boutiques' }, { id: 'culture', name: 'Culture' }];
const pt = (name, cat) => ({ id: name, name, cat });

test('arrGroups : une rubrique par catégorie, dans l\'ordre de mes catégories', () => {
  const g = arrGroups([pt('Opéra', 'culture'), pt('Chartier', 'resto'), pt('Drouot', 'boutique')], CATS);
  assert.deepEqual(g.map((x) => x.cat), ['resto', 'boutique', 'culture']);
});

test('arrGroups : une catégorie sans lieu n\'a pas de rubrique', () => {
  const g = arrGroups([pt('Opéra', 'culture')], CATS);
  assert.deepEqual(g.map((x) => x.cat), ['culture']);
});

test('arrGroups : dans une rubrique, les lieux par ordre alphabétique, sans tenir compte des accents ni des majuscules', () => {
  const g = arrGroups([pt('Rose Bakery', 'resto'), pt('à la Mère de Famille', 'resto'), pt('Bouillon Chartier', 'resto'), pt('Église', 'resto')], CATS);
  assert.deepEqual(g[0].rows.map((p) => p.name), ['à la Mère de Famille', 'Bouillon Chartier', 'Église', 'Rose Bakery']);
});

test('arrGroups : un lieu dont la catégorie n\'existe plus reste dans la liste, en dernier', () => {
  const g = arrGroups([pt('Orphelin', 'ancienne'), pt('Chartier', 'resto')], CATS);
  assert.deepEqual(g.map((x) => x.cat), ['resto', 'ancienne']);
  assert.equal(g[1].rows[0].name, 'Orphelin');
});

test('arrGroups : aucun lieu → aucune rubrique ; la liste reçue n\'est pas modifiée', () => {
  assert.deepEqual(arrGroups([], CATS), []);
  const pts = [pt('B', 'resto'), pt('A', 'resto')];
  arrGroups(pts, CATS);
  assert.deepEqual(pts.map((p) => p.name), ['B', 'A']);
});

test('arrTap : un appui dans un autre arrondissement donne son numéro', () => {
  const [lat, lng] = middle(10);
  assert.equal(arrTap(lat, lng, 9, data), 10);
});

test('arrTap : un appui dans l\'arrondissement déjà choisi ne fait rien', () => {
  const [lat, lng] = middle(9);
  assert.equal(arrTap(lat, lng, 9, data), null);
});

test('arrTap : hors de Paris, rien', () => {
  assert.equal(arrTap(48.80, 2.13, 9, data), null, 'Versailles');
});

test('arrTap : sans arrondissement choisi, un appui sur la carte ne fait rien (choix 1A)', () => {
  const [lat, lng] = middle(10);
  assert.equal(arrTap(lat, lng, 0, data), null);
});

test('arrTap : contours pas encore lus, rien', () => {
  const [lat, lng] = middle(10);
  assert.equal(arrTap(lat, lng, 9, null), null);
});

test('arrondissement choisi : un autre écran que sa liste ou une fiche l\'enlève, revenir à la liste le remet (v267)', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const open = app.slice(app.indexOf('function openSheet('), app.indexOf('fill(sheetTitle'));
  assert.match(open, /if \(filt\.arr && name !== 'arrlist' && !String\(name\)\.startsWith\('detail:'\)\) \{ filt\.arr = 0;/);
  const list = app.slice(app.indexOf('function openArrList(n)'), app.indexOf('const here = (p) => arrOfPoint(p) === n;'));
  assert.match(list, /if \(filt\.arr !== n\) \{ filt\.arr = n;/);
  const pass = app.slice(app.indexOf('const passFilters'), app.indexOf('/** v267 : l\'arrondissement choisi ne trie'));
  assert.doesNotMatch(pass, /filt\.arr/, 'Autour de moi, la recherche et Surprise ne sont pas triés par l\'arrondissement');
  assert.match(app, /groupPoints\(onMap\(\)/);
});
