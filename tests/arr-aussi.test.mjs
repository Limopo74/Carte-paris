// v438 (mon choix 1A du 25 nov., visuel A) : « Aussi dans le 9e » en bas de « Mes lieux du 9e ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arrMore, arrAt } from '../js/explore.js';
import { cleanCircuits } from '../js/circuits.js';

const J = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const arr = J('arrondissements');
const body = (name) => {
  const start = app.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `${name} existe`);
  const next = app.slice(start + 10).search(/^(async )?function /m);
  return app.slice(start, next < 0 ? undefined : start + 10 + next);
};

test('arrMore : seulement l\'arrondissement demandé, par ordre alphabétique, sans toucher la liste', () => {
  const items = [{ n: 'Zèbre', lat: 48.8768, lng: 2.3379 }, { n: 'abeille', lat: 48.8768, lng: 2.3380 }, { n: 'Ailleurs', lat: 48.8462, lng: 2.3464 }, { n: '', lat: 48.8768, lng: 2.3379 }];
  const copy = JSON.stringify(items);
  const got = arrMore(items, 9, arr, (x) => x.n);
  assert.deepEqual(got.map((x) => x.n), ['abeille', 'Zèbre']);
  assert.equal(JSON.stringify(items), copy);
  assert.deepEqual(arrMore(null, 9, arr, (x) => x.n), []);
});

test('arrMore : vrais fichiers, plaques du 9e et circuits qui passent par le 4e (une étape suffit)', () => {
  const plaques = arrMore(J('plaques').items, 9, arr, (x) => x.t);
  assert.ok(plaques.length > 50 && plaques.length < 300, `plaques du 9e : ${plaques.length}`);
  assert.ok(plaques.every((p) => arrAt(p.lat, p.lng, arr) === 9));
  const circuits = cleanCircuits(J('circuits'));
  const c4 = arrMore(circuits, 4, arr, (x) => x.titre, (x) => x.etapes);
  assert.ok(c4.length >= 1, 'au moins un circuit passe par le 4e');
  assert.ok(c4.every((c) => c.etapes.some((e) => arrAt(e.lat, e.lng, arr) === 4)));
});

test('aussi dans : en bas de la liste (sous mes lieux, au-dessus du retour), jamais les monuments', () => {
  const b = body('openArrList');
  const groups = b.indexOf('...arrGroups(');
  const more = b.indexOf('arrMoreBlock(n, back)');
  const foot = b.indexOf('foot(backBtn(openFilters))');
  assert.ok(groups > 0 && more > groups && foot > more);
  const defs = app.match(/const ARR_MORE = \[([\s\S]*?)\n\];/)?.[1] ?? '';
  assert.deepEqual([...defs.matchAll(/\{ k: '(\w+)'/g)].map((m) => m[1]), ['jardins', 'passages', 'musees', 'circuits', 'plaques', 'oeuvres', 'galeries']);
  assert.doesNotMatch(defs, /monument|merimee|monuments\(\)/i, 'un nombre de monuments hors ligne serait faux');
});

test('aussi dans : une ligne à 0 ou un fichier pas lu ne s\'affiche pas ; un autre arrondissement entre-temps ne reçoit pas le bloc', () => {
  const b = body('arrMoreBlock');
  assert.match(b, /\.filter\(\(\[, l\]\) => l\?\.length\)/);
  assert.match(b, /filt\.arr !== n \|\| !box\.isConnected\) return;/);
  assert.match(body('arrMoreList'), /if \(!items\) return null;/);
  assert.doesNotMatch(app.match(/async function arrMoreList[\s\S]*?\n}\n/)?.[0] ?? '', /net\(|fetch\(/, 'rien n\'est demandé en ligne de plus');
});
