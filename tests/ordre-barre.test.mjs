// L'ordre des boutons de l'appli dans la barre du haut (v268, mes choix 2A, 3A, 4A) : ↑ ↓ dans Réglages → Catégories et listes ;
// Tout et Filtres toujours en tête, les catégories toujours après, le même ordre sous ⋯ Plus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, exportJSON, readSettings, KEY, MOVABLE_CHIPS, cleanChipOrder, chipOrderOf, moveChip } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
/** Une mémoire déjà là (mon téléphone) : pas le départ d'un nouveau venu (v440 : il a son propre ordre). */
const oldStorage = () => { const st = memStorage(); st.setItem(KEY, JSON.stringify({ points: [] })); return st; };

test('Ordre du haut : les boutons déplaçables sont tous ceux de la barre, sauf Tout et Filtres', () => {
  const body = app.slice(app.indexOf('function chipItems('), app.indexOf('/** ⋯ Plus de la barre du haut'));
  const keys = [...body.matchAll(/\{ key: '([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(keys.slice(0, 2), ['all', 'filters']);
  assert.deepEqual([...keys.slice(2)].sort(), [...MOVABLE_CHIPS].sort(), 'un bouton du haut ajouté doit aussi aller dans MOVABLE_CHIPS');
  assert.deepEqual(keys.slice(2), MOVABLE_CHIPS, 'l\'ordre de départ ne change pas');
});

test('Ordre du haut : rien de changé = null ; un ordre faux ou vide = null', () => {
  assert.equal(cleanChipOrder(loadState(oldStorage()).chipOrder), null);
  assert.deepEqual(chipOrderOf(null), MOVABLE_CHIPS);
  assert.equal(cleanChipOrder(undefined), null);
  assert.equal(cleanChipOrder('ttb'), null);
  assert.equal(cleanChipOrder(['all', 'filters', 'cat:resto', 'nimporte']), null, 'Tout, Filtres et les catégories ne se rangent pas ici');
  assert.equal(cleanChipOrder([...MOVABLE_CHIPS]), null);
});

test('Ordre du haut : chaque bouton une fois ; un bouton absent reprend sa place de départ', () => {
  const twice = ['ttb', 'fav', 'ttb', 'street', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins'];
  assert.deepEqual(cleanChipOrder(twice), ['ttb', 'fav', 'street', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins', 'artistes']);
  // Un bouton ajouté dans une version suivante n'est pas dans l'ordre enregistré : il vient après celui qui le précède au départ
  const old = ['ttb', 'fav', 'street', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo'];
  assert.deepEqual(cleanChipOrder(old), ['ttb', 'fav', 'street', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins', 'artistes']);
  const first = MOVABLE_CHIPS.slice(1).reverse();
  assert.equal(cleanChipOrder(first).indexOf('fav'), 0, 'le premier de départ absent revient en tête');
});

test('Ordre du haut : ↑ ↓ échangent deux voisins ; rien au bout ; revenir à l\'ordre de départ remet null', () => {
  let s = { chipOrder: null };
  s = moveChip(s, 'ttb', -1);
  assert.deepEqual(s.chipOrder.slice(0, 3), ['fav', 'ttb', 'street']);
  s = moveChip(s, 'ttb', -1);
  assert.deepEqual(s.chipOrder.slice(0, 2), ['ttb', 'fav']);
  assert.equal(moveChip(s, 'ttb', -1), s, 'déjà le premier');
  assert.equal(moveChip({ chipOrder: null }, 'artistes', 1).chipOrder, null, 'déjà le dernier');
  assert.equal(moveChip({ chipOrder: null }, 'cat:resto', 1).chipOrder, null, 'une catégorie ne se range pas ici');
  s = moveChip(moveChip(s, 'ttb', 1), 'ttb', 1);
  assert.equal(s.chipOrder, null);
});

test('Ordre du haut : gardé d\'un jour à l\'autre et dans les réglages de la sauvegarde', () => {
  const st = oldStorage();
  const s = moveChip(loadState(st), 'artistes', -1);
  saveState(st, s);
  assert.equal(JSON.parse(st.getItem(KEY)).chipOrder.at(-1), 'jardins');
  assert.deepEqual(loadState(st).chipOrder, s.chipOrder);
  const file = JSON.parse(exportJSON(s));
  assert.deepEqual(readSettings(file).chipOrder, s.chipOrder);
  // Une sauvegarde d'avant la v268 : l'ordre de départ
  delete file.settings.chipOrder;
  assert.equal(readSettings(file).chipOrder, null);
});

test('Ordre du haut : « Barre du haut comme au début » remet aussi l\'ordre', () => {
  // v440 : « comme au début » remet le départ de mes captures (cachés, Plus, ordre, icônes seules)
  assert.match(app, /onclick: \(\) => \{ Object\.assign\(state, freshChips\(catIds\)\); persist\(\);/);
  assert.match(app, /const asStart = chipsAsFresh\(state, catIds\);/);
});
