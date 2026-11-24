// v398 : toilettes et fontaines sur mon chemin (Sur mon chemin).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onTheWay } from '../js/move.js';

test('une toilette à 150 m de détour au plus, dans l\'ordre du chemin', () => {
  const a = { lat: 48.8536, lng: 2.3700 }; const b = { lat: 48.8443, lng: 2.3730 }; // Bastille → Gare de Lyon
  const items = [{ id: 1, lat: 48.8462, lng: 2.3735 }, { id: 2, lat: 48.8500, lng: 2.3715 }, { id: 3, lat: 48.8600, lng: 2.3800 }];
  assert.deepEqual(onTheWay(items, a, b, 150).map((x) => x.point.id), [2, 1]);
});

test('le bloc va sous les boutons, écarte les toilettes fermées ou fermées à l\'arrivée, sans envoyer ma position', () => {
  const app = readFileSync('js/app.js', 'utf8');
  const way = app.slice(app.indexOf('function renderWay('), app.indexOf('/* ---------- Mes parcours (v244'));
  assert.ok(way.indexOf('pausesBox,') > way.indexOf("'Itinéraire direct'"), 'sous la plaque Itinéraire : rien ne bouge au-dessus');
  assert.match(way, /openState\(x\.hours\)\?\.open !== false && !closedOnArrival/);
  assert.match(way, /const PAUSE_DETOUR_M = 150;/);
  assert.doesNotMatch(way.slice(way.indexOf('async function fillWayPauses')), /from\.lat\}|lat=\$\{from/, 'aucune position dans une adresse');
});
