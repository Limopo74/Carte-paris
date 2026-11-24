// v423 (ma demande du 25 nov. : « Mets le cœur à droite du mot ») : dans les listes de mes lieux,
// le nom d'abord, puis la marque du favori ; hors du nom coupé à deux lignes, pour qu'un nom long ne l'emporte pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('aucune liste ne met plus le favori avant le nom', () => {
  assert.doesNotMatch(app, /class: 'item-name' \}, favMark\(p\)/);
});

test('nameFav : le nom puis le cœur, le cœur hors du nom coupé', () => {
  const def = app.match(/const nameFav = \(p\) => \(([\s\S]*?)\)\);\n/);
  assert.ok(def, 'nameFav absente');
  assert.match(def[1], /el\('span', \{ class: 'item-name' \}, p\.name\), favMark\(p\)/);
  assert.ok((app.match(/nameFav\(p\)/g) || []).length >= 6, 'les six listes de mes lieux');
});

test('le cœur ne rétrécit pas et reste sur la première ligne', () => {
  assert.match(css, /\.name-fav \{[^}]*display: flex/);
  assert.match(css, /\.name-fav \.fav-mark \{[^}]*flex: none/);
});
