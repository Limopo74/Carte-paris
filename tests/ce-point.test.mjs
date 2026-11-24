// v399 : l'appui long sur la carte ouvre « Ce point » (Y aller, Boussole, Métro, Ajouter) au lieu du formulaire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('js/app.js', 'utf8');

test('l\'appui long ouvre « Ce point », jamais pendant un tracé ou une rue d\'intérêt', () => {
  const h = app.slice(app.indexOf("map.on('contextmenu'"), app.indexOf("map.on('contextmenu'") + 400);
  assert.match(h, /if \(moving \|\| view === 'trace' \|\| view === 'rue'\) return;/);
  assert.match(h, /openPointAt\(e\.latlng\.lat, e\.latlng\.lng\)/);
  assert.doesNotMatch(h, /addAt\(e\.latlng/);
});

test('la page : la même que pour une adresse, un rond tant qu\'elle est ouverte, Ajouter sans nom tout fait', () => {
  const f = app.slice(app.indexOf('function openPointAt('), app.indexOf('// Résultats d\'adresse imprécis'));
  assert.match(f, /openSpot\(\{ icon: 'map-pin', title: label \|\| 'Ce point', kicker: 'Point de la carte'/);
  assert.match(f, /add: \{ name: '' \}/);
  assert.match(f, /onClose: \(\) => pointLayer\.clearLayers\(\)/);
  assert.match(f, /class="peek-pin"/);
  assert.match(app, /\), \{ tall: true, name: key, again, onClose \}\);/);
});

test('Confidentialité dit que le point touché part à l\'IGN', () => {
  assert.match(app, /le point de la carte où tu laisses le doigt appuyé \(IGN, pour trouver son adresse/);
});
