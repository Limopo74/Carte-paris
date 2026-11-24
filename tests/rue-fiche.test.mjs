// v403 à v406 (mes choix 1 2 3 4 du 24 nov.) : la fiche et les distances d'une rue d'intérêt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lineLengthM, nearestOnLine, distanceM } from '../js/geo.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
// Un morceau de la rue Mouffetard (nord-sud, environ 330 m)
const LINE = [[48.8445, 2.3497], [48.8430, 2.3496], [48.8415, 2.3498]];

test('longueur d\'un tracé', () => {
  const m = lineLengthM(LINE);
  assert.ok(Math.abs(m - 333) < 5, String(m));
  assert.equal(lineLengthM(null), 0);
  assert.equal(lineLengthM([[48.84, 2.35]]), 0);
});

test('point du tracé le plus proche : sur la rue, à côté, au-delà d\'un bout', () => {
  const on = nearestOnLine(LINE, { lat: 48.8430, lng: 2.3496 });
  assert.ok(on.d < 1);
  const side = nearestOnLine(LINE, { lat: 48.8437, lng: 2.3510 }); // ≈ 100 m à l'est
  assert.ok(side.d > 90 && side.d < 115, String(side.d));
  const beyond = nearestOnLine(LINE, { lat: 48.8460, lng: 2.3497 }); // au nord du premier bout : le bout lui-même
  assert.ok(distanceM(beyond, { lat: 48.8445, lng: 2.3497 }) < 1);
  assert.equal(nearestOnLine(null, { lat: 1, lng: 1 }), null);
  assert.equal(nearestOnLine(LINE, null), null);
});

test('v403 : la fiche d\'une rue sans horaires dit sa longueur et la durée, à la place de « Horaires inconnus »', () => {
  assert.match(app, /const rueM = p\.line && !st && !p\.hours && !parkHoursById\.has\(p\.id\) \? lineLengthM\(p\.line\) : 0;/);
  const i = app.indexOf('const rueM'); const f = app.slice(i, i + 900);
  assert.match(f, /'Longueur'/);
  assert.match(f, /distText\(rueM\)/);
  assert.match(f, /`≈ \$\{routeMin\(rueM\)\}`/); // à mon pas, le long de la rue (déjà mesurée) : pas de détour ajouté
  assert.match(f, /st \|\| metro \|\| rueM \?/);
});
