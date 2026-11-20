// v312 (mes choix 1A 2A 3A 4A 5A du 20 nov.) : gérer entièrement Vu en passant depuis Réglages → Vu en passant ; supprimer
// des photos prises en passant (une dans le diaporama, toutes celles d'une catégorie dans sa page), avec une question sur place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const del = app.slice(app.indexOf('function deleteSeenItems('), app.indexOf('function seenDeleteZone('));
const zone = app.slice(app.indexOf('function seenDeleteZone('), app.indexOf('/** v311 (mes choix 3A 4A 5C'));

test('2A : la photo et sa note ; rattachée à un de mes lieux, seulement son impression', () => {
  assert.match(del, /if \(inPass\) place\.passages = \(place\.passages \?\? \[\]\)\.filter\(\(x\) => x\.photo !== id\);/);
  assert.match(del, /if \(!place\.photos\.length\) \{[\s\S]*state\.points = state\.points\.filter\(\(x\) => x\.id !== place\.id\);/);
  assert.match(del, /deletePhoto\(id\)/, 'la photo est effacée du téléphone');
});

test('4A : la catégorie ne part que si elle ne contient rien d\'autre (ni mes autres lieux, ni ceux d\'un proche)', () => {
  assert.match(zone, /const onlyPass = !state\.points\.some\(\(p\) => p\.cat === catId && \(!isPass\(p\) \|\| p\.owner\)\);/);
  assert.match(zone, /Tes autres lieux de « \$\{c\.name\} » restent\./);
  assert.match(zone, /const its = one \? 'sa photo' : `ses \$\{items\.length\} photos`;/, 'jamais « ses 1 photo »');
});

test('3A : une question sur place, « définitif », dans la page et dans le diaporama', () => {
  assert.match(zone, /C'est définitif/);
  assert.match(app, /'Supprimer cette photo \? C\\'est définitif : elle est effacée du téléphone\.'/);
  assert.match(app, /del: \(k\) => \{ deleteSeenItems\(\[photos\[k\]\]\);/);
  assert.match(app, /seenDeleteZone\(catId, again\), \/\/ v312 : tout en bas/);
});

test('5A : la mosaïque en haut de Réglages → Vu en passant', () => {
  const vu = app.slice(app.indexOf("if (section === 'vu') {"), app.indexOf("if (section === 'alertes') {"));
  assert.ok(vu.indexOf('Mes Vu en passant · ${seenPhotoCount()}') < vu.indexOf("onOff('seenKeep'"));
});
