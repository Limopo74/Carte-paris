// v349 (mes choix 1A 2A du 21 nov. ; 3A pas tenable : « Nouvelle catégorie de photos » passe sur deux lignes même en Normal) :
// une catégorie de photos se crée sans les « Toutes prêtes » de la carte (Boulangeries, Cafés…), ni historique,
// « Déjà visité » ou mots tout prêts. Street art garde tout (elle sert aussi aux œuvres).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const cat = app.slice(app.indexOf('function openCategory('), app.indexOf('/* ---------- Mots tout prêts'));

test('« + Nouvelle » d\'une catégorie de photos le dit à l\'écran de catégorie', () => {
  assert.match(app, /const newPhotoCat = \(back, done\) => openCategory\(null, \{ photo: true, back, done:/);
  assert.match(cat, /const photoCat = Boolean\(ret\?\.photo\) \|\| \(Boolean\(c\) && isPhotoCat\(c\) && !isStreetCat\(c\)\);/);
});

test('Pas de « Toutes prêtes » (catégories de la carte) pour une catégorie de photos', () => {
  assert.match(cat, /const presets = id \|\| photoCat \? \[\] : suggestedPresets\(state\.categories\);/);
});

test('Ni historique, ni « Déjà visité », ni mots tout prêts pour une catégorie de photos', () => {
  const i = cat.indexOf('...(photoCat ? [] : [');
  assert.ok(i > 0);
  const block = cat.slice(i, cat.indexOf('subsBlock,', i));
  for (const k of ['Nom de l\\\'historique', 'Nom de « Déjà visité »', "'Mots tout prêts'"]) assert.ok(block.includes(k), k);
});
