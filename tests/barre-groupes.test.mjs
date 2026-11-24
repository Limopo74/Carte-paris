// v400 (mes choix 1A 2A 3A 4A 5A du 24 nov.) : Réglages → Barre du haut rangée comme Boutons de la carte (v376) :
// trois groupes qui suivent l'écran, ↑ ↓ seulement dans le groupe, Mes artistes en tête de Plus sans flèches,
// plus de ligne « En haut : … » ; Mes proches (étapes 5 et 6) pareil ; « … comme au début » seulement si quelque chose a changé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moveChipIn, chipGroupOf, barOrderOf, MOVABLE_CHIPS, DEFAULT_MORE_CHIPS } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const barre = app.slice(app.indexOf("if (section === 'barre') {"), app.indexOf("name: 'settings:barre'"));
const outils = app.slice(app.indexOf("if (section === 'outils') {"), app.indexOf("if (section === 'essentiel') {"));
const cats = ['resto', 'boutique', 'culture'];
// Le départ : Vélib' … Mes artistes dans Plus, le reste dans la barre
const place = (k) => (DEFAULT_MORE_CHIPS.includes(k) ? 'more' : 'bar');
const group = chipGroupOf(place);
const inGroup = (order, g) => order.filter((k) => group(k) === g);

test('Barre du haut (v400) : ↓ sur Lignes passe devant Restos (avant : échangé avec Vélib\', invisible)', () => {
  const s = moveChipIn({ chipOrder: null }, 'lines', 1, cats, group);
  const o = barOrderOf(s.chipOrder, cats);
  assert.deepEqual(inGroup(o, 'bar'), ['fav', 'street', 'ttb', 'cat:resto', 'lines', 'cat:boutique', 'cat:culture'], 'la barre change à l\'écran');
  assert.deepEqual(inGroup(o, 'more'), inGroup(barOrderOf(null, cats), 'more'), 'Plus ne bouge pas');
});

test('Barre du haut (v400) : Restos monte dans la barre en un appui, sans passer par les boutons de Plus', () => {
  const o = barOrderOf(moveChipIn({ chipOrder: null }, 'cat:resto', -1, cats, group).chipOrder, cats);
  assert.equal(inGroup(o, 'bar').indexOf('cat:resto'), inGroup(o, 'bar').indexOf('lines') - 1);
});

test('Barre du haut (v400) : Mes artistes reste en tête de Plus, personne n\'échange avec lui', () => {
  assert.equal(group('artistes'), 'lead');
  const avant = barOrderOf(null, cats);
  assert.deepEqual(barOrderOf(moveChipIn({ chipOrder: null }, 'artistes', -1, cats, group).chipOrder, cats), avant);
  const s = moveChipIn({ chipOrder: null }, 'jardins', 1, cats, group); // le dernier de Plus avant Mes artistes
  assert.deepEqual(barOrderOf(s.chipOrder, cats), avant);
  // rangé dans la barre, il se range comme les autres
  const bar = chipGroupOf(() => 'bar');
  assert.equal(bar('artistes'), 'bar');
  assert.ok(MOVABLE_CHIPS.includes('artistes'));
});

test('Barre du haut (v400) : trois groupes dans l\'ordre de l\'écran, sans la ligne « En haut : »', () => {
  const i = barre.indexOf("['bar', 'La barre, de gauche à droite']");
  assert.ok(i > 0 && barre.indexOf("['more', 'Dans ⋯ Plus']") > i && barre.indexOf("['hidden', 'Masqués']") > i);
  assert.ok(!barre.includes('En haut :'), '2A : les nombres sont dans les titres des groupes');
  assert.ok(barre.includes('moveChipIn(state, key, delta, catIds, groupOf)'));
  assert.ok(barre.includes("k === 'hidden' ? [] :"), 'pas de flèches pour les masqués');
  assert.ok(barre.includes("'Toujours en tête de Plus'"));
  assert.ok(/k === 'hidden' && seenRow \? \[seenRow\]/.test(barre), 'Vu en passant avant la première photo : dans Masqués');
});

test('« … comme au début » (v400, 5A) : même aspect, seulement si quelque chose a changé', () => {
  assert.ok(barre.includes("asStart ? null : el('button', { type: 'button', class: 'btn', onclick"), 'Barre du haut : bouton simple');
  assert.ok(!barre.includes("'btn c-guide', onclick: () => { state.hiddenChips = []"));
  assert.ok(outils.includes("toolsAsStart() ? null : el('button', { type: 'button', class: 'btn', onclick"), 'Boutons de la carte');
  assert.match(app, /const toolsAsStart = \(\) => normalizeTools\(state\.mapTools\)\.join\(\) === normalizeTools\(\[\]\)\.join\(\)/);
});

test('Mes proches (v400, 4A) : étapes 5 et 6 en trois groupes, ↑ ↓ dans le groupe', () => {
  const prep = app.slice(app.indexOf('    5: (() => {'), app.indexOf('    7: (() => {'));
  assert.ok(prep.includes("[['bar', 'La barre, de gauche à droite'], ['more', 'Dans ⋯ Plus'], ['hidden', 'Masqués']]"));
  assert.ok(prep.includes("[['map', 'Sur la carte, de haut en bas'], ['more', 'Dans ⋯ Plus'], ['hidden', 'Masqués']]"));
  assert.ok(prep.includes('moveChipIn({ chipOrder: p.chipOrder }, k, dd, catIds, groupOf)'));
  assert.ok(prep.includes('moveToolIn(p.mapTools, t, dd, toolPlace)'));
  assert.match(app, /const placeGroups = \(keys, place, groupOf, titles, row\) =>/);
});
