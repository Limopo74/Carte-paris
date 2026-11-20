// v304 (mes choix du 20 nov. : « Séparer », « Une seule file », « Toujours dans la page ») : Réglages → Barre du haut a sa
// propre page ; une catégorie peut se ranger parmi les boutons de l'appli ; Vu en passant y est même avant la première photo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOVABLE_CHIPS, cleanChipOrder, barOrderOf, moveChip } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const cats = ['resto', 'culture', 'vu'];

test('Une seule file : les catégories au bout au départ, dans leur ordre', () => {
  assert.deepEqual(barOrderOf(null, cats), [...MOVABLE_CHIPS, 'cat:resto', 'cat:culture', 'cat:vu']);
});

test('Une seule file : une catégorie monte devant les boutons de l\'appli, et y reste', () => {
  let s = { chipOrder: null };
  for (let i = 0; i < 20; i++) s = moveChip(s, 'cat:vu', -1, cats);
  assert.equal(barOrderOf(s.chipOrder, cats)[0], 'cat:vu');
  assert.deepEqual(cleanChipOrder(s.chipOrder), s.chipOrder, 'se relit tel quel (sauvegarde, réglages par défaut)');
  // une catégorie supprimée disparaît de la file, une nouvelle arrive au bout
  assert.deepEqual(barOrderOf(s.chipOrder, ['resto', 'culture', 'neuve']).slice(-3), ['cat:resto', 'cat:culture', 'cat:neuve']);
  assert.ok(!barOrderOf(s.chipOrder, ['resto']).includes('cat:vu'));
  assert.equal(cleanChipOrder(['all', 'filters', 'cat:resto']), null, 'Tout et Filtres ne se rangent pas');
});

test('Barre du haut et Catégories et listes : deux pages', () => {
  assert.match(app, /function openChipsSettings\(\) \{ openSettings\('barre'\); \}/);
  assert.match(app, /openSheet\(\[ico\('panel-top'\), ' Barre du haut'\]/);
  const cat = app.slice(app.indexOf("openSheet([ico('tags'), ' Catégories et listes']"), app.indexOf("name: 'settings:categories'"));
  assert.ok(!cat.includes('topSeg('), 'plus de Barre / Plus / Masqué dans Catégories et listes');
  assert.match(app, /openSettings\('barre'\) \}, ico\('panel-top'\), 'Choisir ce qui va dans Plus'\)/);
});

test('Vu en passant toujours dans Barre du haut, créée par « Barre » ou « Plus »', () => {
  assert.match(app, /const seenRow = catIds\.includes\(SEEN_CAT\.id\) \? null :/);
  assert.match(app, /if \(key === `cat:\$\{SEEN_CAT\.id\}`\) state = withSeenCat\(state\);/);
});
