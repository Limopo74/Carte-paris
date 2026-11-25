// v520 (mon choix 2A du 25 nov.) : « Chaque semaine » d'Ouvert tard n'annonce rien un jour férié (avant : le 25 décembre, 4 nocturnes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lateOn, ART_PLACES } from '../js/art.js';
import { holidayOn } from '../js/holidays.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Ouvert tard → Chaque semaine : le jour férié passe à lateOn', () => {
  const page = app.slice(app.indexOf('async function openLate('), app.indexOf('async function openLate(') + 3000);
  assert.match(page, /list: lateOn\(d, ART_PLACES, holidayOn\(d\)\)/);
  const noel = new Date(2026, 11, 25, 12);
  assert.ok(lateOn(noel).length > 0, 'un vendredi ordinaire a des nocturnes');
  assert.equal(lateOn(noel, ART_PLACES, holidayOn(noel)).length, 0);
});
