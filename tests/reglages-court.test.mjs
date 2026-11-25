// 1A et 3A (25 nov. 2026) : Réglages et Autres réglages plus courts.
// 1A : chaque petite ligne tient sur une ligne à 360 px en Normal (mesuré : 250 px pour une ligne ›, 214 px pour un interrupteur,
//      soit environ 38 et 32 signes) ; 3A : « Réglages de référence » devient une ligne qui ouvre sa page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const autres = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
const main = app.slice(app.indexOf("openSheet([ico('settings'), ' Réglages'"), app.indexOf("), { name: 'settings', again: () => openSettings(), tall: true });"));
const lit = (s) => s.replace(/\\'/g, "'");

test('1A : les petites lignes écrites en dur tiennent sur une ligne (38 signes pour une ligne ›, 32 pour un interrupteur)', () => {
  const rows = [...(main + autres).matchAll(/row\([^,]+, '((?:[^'\\]|\\.)+)', '((?:[^'\\]|\\.)+)'/g)].map((m) => [lit(m[1]), lit(m[2])]);
  assert.ok(rows.length >= 8, `${rows.length} lignes lues`);
  for (const [t, sub] of rows) assert.ok(sub.length <= 38, `${t} : « ${sub} » (${sub.length})`);
  const sw = [...autres.matchAll(/onOff\('[a-zA-Z]+', '[a-z-]+', '((?:[^'\\]|\\.)+)', [^?]*\? '((?:[^'\\]|\\.)+)'[^:]*: '((?:[^'\\]|\\.)+)'/g)].map((m) => [lit(m[1]), lit(m[2]), lit(m[3])]);
  assert.ok(sw.length >= 6, `${sw.length} interrupteurs lus`);
  for (const [t, on, off] of sw) for (const sub of [on, off]) assert.ok(sub.length <= 32, `${t} : « ${sub} » (${sub.length})`);
});

test('1A : plus les anciennes petites lignes trop longues', () => {
  for (const old of ['Comment utiliser l\\\'appli, nouveautés, problèmes fréquents', 'Ordre, côté, noms, carte, Plus ou masqué', 'toutes les durées à pied`', 'Comme un téléphone neuf ; tes lieux et réglages ne bougent pas', 'La photo de l\\\'agenda à gauche de chaque sortie, sinon la lettre du genre']) {
    assert.ok(!app.includes(old), old);
  }
});
