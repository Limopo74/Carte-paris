// v450 (ma demande du 25 nov. : « géolocaliser les Grands lieux ») : les distances de Sorties, de ses pages et d'Autour de moi
// ne partent jamais d'une position de plus de 10 min (FRESH_MS) ; les Grands lieux disent d'où elles partent (« Autour de toi ▾ »).
// Avant : l'appli restée en mémoire, le lendemain à Épinay, Grands lieux donnait 640 m pour le Grand Palais (la position de la veille).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const fn = (head) => { const i = app.indexOf(head); assert.ok(i >= 0, head); return app.slice(i, app.indexOf('\n}\n', i)); };

test('une position du point de départ de plus de 10 min est périmée (gps et « Ma position »)', () => {
  assert.match(app, /const evStale = \(o\) => \(o\?\.kind === 'gps' \|\| o\?\.kind === 'here'\) && !\(Date\.now\(\) - \(o\.time \?\? 0\) < FRESH_MS\);/);
  const f = fn('async function freshEvFrom(');
  assert.match(f, /if \(evStale\(evFrom\)\)/);
  assert.match(f, /freshHere\(\)/);
  assert.match(f, /await locate\(\)/);
  assert.match(f, /evFrom = mapPoint\(\)/); // refusée ou loin de Paris : le centre de la carte, dit en haut
  assert.match(f, /!nearParis\(evFrom\)/);
});

test('« Ma position » de Sorties garde son heure, pour être redemandée après 10 min', () => {
  assert.match(fn('async function eventsFromMe('), /time: pos\.time, kind: 'here'/);
});

test('Sorties revérifie son point de départ à chaque ouverture', () => {
  const f = fn('async function openEvents(');
  assert.match(f, /setEvFrom\(start\);\n\s+await freshEvFrom\(\);/);
});

test('les pages de Sorties ne lisent plus le point de départ tel quel', () => {
  for (const head of ['async function openArtPlaces(', 'async function openWeekExpos(', 'async function openLate(', 'async function openStreetArt(', 'async function openVenues(', 'async function openArtists(']) {
    const f = fn(head);
    assert.doesNotMatch(f, /const o = evFrom( \?\? origin)?;/, head);
    assert.match(f, /const o = await (evPoint|freshEvFrom)\(\)/, head);
  }
  assert.match(fn('function openFreeDay('), /evStale\(evFrom\) \? null : evFrom/);
  assert.match(fn('function openFindOutings('), /evStale\(evFrom\) \? null : evFrom/);
});

test('Grands lieux : « Autour de toi ▾ » sous « Voir sur la carte », qui le rouvre au même endroit', () => {
  const f = fn('async function openArtPlaces(');
  assert.match(f, /const again = named\('Grands lieux', \(\) => openArtPlaces\(focus, from\)\);/);
  assert.ok(f.indexOf("'Voir sur la carte'),\n    evFromBtn(o, again),") > 0);
  const from = fn('function openEventsFrom(');
  assert.match(from, /if \(again\) \{ setEvFrom\(start\); again\(\); \} else openEvents\(start\);/);
  assert.match(from, /foot\(backBtn\(again \?\? openEvents\)\)/);
});

test('les mots du point de départ suivent le point (chez toi, une station, le centre de la carte)', () => {
  assert.doesNotMatch(fn('async function openWeekExpos('), /' Distances depuis toi\.'/);
  assert.match(fn('async function openStreetArt('), /evFromWords\(o\)/);
});

test('← Autour de moi : une position de plus de 10 min est redemandée', () => {
  assert.match(fn('function nearAgain('), /if \(!homeOn\(\) && evStale\(origin\) && !following\)/);
  assert.doesNotMatch(app, /onclick: \(\) => renderNear\(\) \}, '← Autour de moi'\)/);
  assert.doesNotMatch(app, /named\('Autour de moi', \(\) => renderNear\(\)\)/);
});
