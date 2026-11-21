// v231 : la plaque « Y aller » ne donne des minutes que quand Google Maps s'ouvre à pied (mes choix 1A 2A du 19 nov.).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { walkGo, distText, mapsUrl, setWalkLimit, WALK_LIMIT_M } from '../js/geo.js';

test('walkGo suit exactement le mode de Google Maps, pour toutes les limites réglables', () => {
  const p = { lat: 48.85, lng: 2.35 };
  for (let limit = 500; limit <= 3000; limit += 250) {
    setWalkLimit(limit);
    for (let i = 0; i < 2000; i++) {
      const d = Math.random() * 6000;
      assert.equal(walkGo(d), /travelmode=walking/.test(mapsUrl(p, d)), `limite ${limit}, distance ${d}`);
    }
    assert.equal(walkGo(limit - 1), true);
    assert.equal(walkGo(limit), false); // à la limite : en transports, comme mapsUrl
  }
  setWalkLimit(WALK_LIMIT_M);
  assert.equal(walkGo(Infinity), false);
});

test('distText : la distance sans durée', () => {
  assert.equal(distText(770), '770 m');
  assert.equal(distText(1000), '1,0 km');
  assert.equal(distText(7600), '7,6 km');
  assert.equal(distText(12000), '12 km');
  assert.equal(distText(384600), '385 km');
});

test('les deux plaques « Y aller » à durée passent par goText (fiche, prochain lieu de Mon planning)', () => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.equal((src.match(/\.\.\.goText\(/g) ?? []).length, 2);
  assert.doesNotMatch(src, /Y aller · \$\{fmtWalk\(/); // plus de minutes écrites à part sur une plaque
  const fn = src.slice(src.indexOf('const goText'), src.indexOf('};', src.indexOf('const goText')));
  // v335 : au-delà, « Y aller en transports » puis la distance seule, « de chez toi » gardé, sans minutes
  assert.match(fn, /if \(!walkGo\(d\)\) return \[el\('span', \{ class: 'go-two' \}, el\('span', \{\}, 'Y aller en transports'\), el\('span', \{\}, `\$\{nb\(distText\(d\)\)\}\$\{from\}`\)\)\];/);
});

test('v335 : « en transports » seulement quand Google Maps s\'ouvre en transports (walkGo faux), jamais à pied', async () => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('const goText'), src.indexOf('};', src.indexOf('const goText')));
  const far = fn.indexOf('if (!walkGo(d))');
  assert.equal((fn.match(/'Y aller en transports'/g) ?? []).length, 1);
  assert.ok(far > 0 && fn.indexOf("'Y aller en transports'") > far, 'le mot n\'apparaît que dans la branche au-delà de la limite');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.go-two \{ display: flex; flex-direction: column;/, 'deux lignes voulues, même coupure dans les trois tailles');
});
