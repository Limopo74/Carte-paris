// v419 (mon choix A du 24 nov.) : un seul point bleu quand une liste pose le sien (Sorties, Autour de moi, Vélib'…)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('point bleu : les listes passent par listMeMarker, jamais meMarker(…).addTo(nearLayer)', () => {
  assert.doesNotMatch(app, /meMarker\([^;\n]*\)\.addTo\(nearLayer\)/);
  assert.ok((app.match(/listMeMarker\(/g) ?? []).length >= 10, 'les dix listes');
});

test('point bleu : celui de la carte ne se dessine pas à moins de 100 m de celui de la liste, et revient quand la liste se ferme', () => {
  const draw = app.slice(app.indexOf('function drawMe() {'), app.indexOf('function locateOnMap()'));
  assert.match(draw, /if \(listMe && nearLayer\.hasLayer\(listMe\) && distanceM\(meShown, listMe\.getLatLng\(\)\) < 100\) return;/);
  const h = app.slice(app.indexOf('function listMeMarker('), app.indexOf('/* Orientation du téléphone'));
  assert.match(h, /m\.on\('remove', \(\) => \{ if \(listMe === m\) \{ listMe = null; drawMe\(\); \} \}\)/);
  assert.match(h, /drawMe\(\);\n\}/);
});
