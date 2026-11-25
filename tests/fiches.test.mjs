// v509 (ma réponse 18 A et B, maquette validée le 25 nov.) : une fiche « Les bons gestes » par crise (pas de Grève), 5 à 7 gestes,
// chacune avec sa source officielle et le lien vers le guide entier ; dans le mode crise, juste sous Rentrer à pied.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FICHES, ficheOf } from '../js/fiches.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('quatre fiches, 5 à 7 gestes, source et lien officiels ; pas de Grève', () => {
  assert.deepEqual(Object.keys(FICHES), ['crue', 'coupure', 'canicule', 'abri']);
  assert.equal(ficheOf('greve'), null);
  const officiel = /^https:\/\/www\.(paris\.fr|info\.gouv\.fr|sante\.fr)\//;
  for (const [k, f] of Object.entries(FICHES)) {
    assert.ok(f.gestes.length >= 5 && f.gestes.length <= 7, k);
    assert.match(f.url, officiel, k);
    assert.ok(f.source.length > 10 && f.label, k);
    for (const [t, sub] of f.gestes) { assert.ok(t.length <= 45, `${k} : ${t}`); assert.equal(typeof sub, 'string'); }
  }
});

test('dans le mode crise, sous Rentrer à pied ; mis en cache', () => {
  const block = app.slice(app.indexOf('function crisisBlock()'), app.indexOf('/** « Je vais bien »'));
  assert.ok(block.indexOf('Rentrer à pied chez moi') < block.indexOf('Les bons gestes · '), 'sous Rentrer à pied');
  assert.ok(block.indexOf('Les bons gestes · ') < block.indexOf('seineRow()'), 'avant la Seine');
  assert.match(app, /function openFiche\(k, back\)/);
  assert.match(sw, /'js\/fiches\.js'/);
});
