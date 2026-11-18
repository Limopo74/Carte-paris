import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plaquesOf, plaquesFor } from '../js/plaques.js';

const list = plaquesOf(JSON.parse(readFileSync(new URL('../data/plaques.json', import.meta.url), 'utf8')));

test('la loupe trouve les plaques qui portent un nom, en mots entiers, le titre d\'abord', () => {
  const colette = plaquesFor(list, 'colette', { lat: 48.8656, lng: 2.3372 });
  assert.ok(colette.length >= 3, `Colette : ${colette.length}`);
  assert.ok(colette[0].title && /colette/i.test(colette[0].plaque.t), 'une plaque dont le titre est Colette en tête');
  const firstOther = colette.findIndex((x) => !x.title);
  if (firstOther > 0) assert.ok(colette.slice(firstOther).every((x) => !x.title), 'les titres d\'abord, puis celles qui citent le nom');
  const titled = colette.filter((x) => x.title).map((x) => x.d);
  assert.deepEqual(titled, [...titled].sort((a, b) => a - b), 'la plus proche d\'abord');
  assert.equal(plaquesFor(list, 'cole').some((x) => /colette/i.test(x.plaque.t) && !/\bcole\b/i.test(`${x.plaque.t} ${x.plaque.x}`)), false, 'pas de morceau de mot');
  assert.ok(plaquesFor(list, 'Victor Hugo').length >= 1);
  assert.ok(plaquesFor(list, 'victor hugo').every((x) => /victor/i.test(`${x.plaque.t} ${x.plaque.x}`) && /hugo/i.test(`${x.plaque.t} ${x.plaque.x}`)));
  assert.deepEqual(plaquesFor(list, 'zzzyyyxxx'), []);
  assert.deepEqual(plaquesFor(list, 'co'), [], 'moins de 3 lettres : rien');
  assert.deepEqual(plaquesFor([], 'colette'), []);
});
