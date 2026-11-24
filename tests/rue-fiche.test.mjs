// v403 à v406 (mes choix 1 2 3 4 du 24 nov.) : la fiche et les distances d'une rue d'intérêt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lineLengthM, nearestOnLine, distanceM, goTarget } from '../js/geo.js';

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

test('v404 : Y aller d\'une rue d\'intérêt mène au bout le plus proche ; sur la rue, au point le plus proche ; un lieu : sa goutte', () => {
  const rue = { id: 'r', name: 'Rue Mouffetard', lat: 48.8430, lng: 2.3496, line: LINE };
  const nord = goTarget(rue, { lat: 48.8470, lng: 2.3500 }); // au nord : le bout nord
  assert.deepEqual([nord.lat, nord.lng], LINE[0]);
  const sud = goTarget(rue, { lat: 48.8395, lng: 2.3490 }); // au sud : le bout sud
  assert.deepEqual([sud.lat, sud.lng], LINE.at(-1));
  const dessus = goTarget(rue, { lat: 48.8437, lng: 2.3499 }); // à 20 m de la rue : le point le plus proche
  assert.ok(distanceM(dessus, { lat: 48.8437, lng: 2.3499 }) < 30);
  assert.equal(nord.name, 'Rue Mouffetard'); assert.equal(nord.id, 'r'); // le reste du lieu suit (nom pour Google Maps)
  const lieu = { id: 'l', lat: 48.85, lng: 2.35 };
  assert.equal(goTarget(lieu, { lat: 48.84, lng: 2.34 }), lieu);
  assert.equal(goTarget(rue, null), rue); // sans position : la goutte
});

test('v404 : la fiche, Chemin à pied, Autour de moi, Sur mon chemin et la boussole passent par goTarget', () => {
  assert.match(app, /const goPt = goTarget\(p, pos\);[^\n]*\n  const d = pos \? distanceM\(pos, goPt\) : null;/);
  assert.match(app, /href: mapsUrl\(goPt, d \?\? Infinity\)/);
  assert.match(app, /const b = snap\(P, goTarget\(p, pos\)\);/);
  assert.match(app, /href: mapsUrl\(goTarget\(p, origin\), d\)/);
  assert.match(app, /href: mapsUrl\(goTarget\(p, from\), distanceM\(from, goTarget\(p, from\)\)\)/);
  assert.match(app, /compass-go'\)\.href = mapsUrl\(goTarget\(p, pos\)/);
});
