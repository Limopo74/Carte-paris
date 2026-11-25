// v479 (mes choix 1A 2A 3A 4A du 25 nov.) : la marche entre les lieux de la liste du jour, dans Mon planning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { legText, dayWalkText } from '../js/planning.js';

const dist = (m) => (m < 1000 ? `${Math.ceil(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

test('la petite ligne : minutes seules, « ≈ » quand c\'est une estimation, jamais de distance', () => {
  assert.equal(legText({ m: 640, min: 8, exact: true }, 1), '8 min du n° 1');
  assert.equal(legText({ min: 9, exact: false }, 2), '≈ 9 min du n° 2');
  assert.equal(legText({ m: 6200, min: 75, exact: true }, 3), '1 h 15 du n° 3');
  assert.equal(legText({ min: 60, exact: false }, 1), '≈ 1 h du n° 1');
  assert.equal(legText(null, 1), '');
  assert.equal(legText({ min: NaN }, 1), '');
});

test('le total : distance seulement quand chaque bout suit les rues', () => {
  assert.equal(dayWalkText([{ m: 640, min: 8, exact: true }, { m: 3360, min: 39, exact: true }], dist), 'Du n° 1 au n° 3 : 4,0 km · 47 min à pied');
  assert.equal(dayWalkText([{ m: 640, min: 8, exact: true }, { min: 37, exact: false }], dist), 'Du n° 1 au n° 3 : ≈ 45 min à pied');
  assert.equal(dayWalkText([{ min: 9, exact: false }], dist), 'Du n° 1 au n° 2 : ≈ 9 min à pied');
  assert.equal(dayWalkText([], dist), '');
});

test('Mon planning : les minutes depuis le lieu précédent, le total sous la liste numérotée, rien de téléchargé', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const fn = app.slice(app.indexOf('function openPlanning('), app.indexOf('function openDayOrder('));
  assert.match(fn, /class: 'day-leg'/);
  assert.match(fn, /class: 'summary day-walk'/);
  assert.ok(fn.indexOf("class: 'summary day-walk'") < fn.indexOf("timed.length ? el('ul'"), 'le total vient avant les sorties à heure fixe');
  const run = app.slice(app.indexOf('async function dayLegsByStreets('), app.indexOf('async function walkRouteTo('));
  assert.ok(run.length > 0 && !/downloadStreets/.test(run), 'le plan des rues n\'est jamais téléchargé depuis Mon planning');
});
