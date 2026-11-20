// v328 : « À l'ouverture, la carte montre » remplace l'interrupteur « Ouvrir sur ma position ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, exportJSON, readSettings, KEY, startViewOf, START_VIEWS } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('les cinq choix, « ma position » au départ', () => {
  assert.deepEqual(START_VIEWS, ['me', 'all', 'home', 'paris', 'last']);
  assert.equal(loadState(memStorage()).startView, 'me');
});

test('l\'ancien interrupteur éteint devient « tous mes lieux »', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], startOnMe: false }));
  assert.equal(loadState(st).startView, 'all');
  assert.equal(startViewOf({ startView: 'bizarre' }), 'me');
});

test('chaque choix est gardé et part avec la sauvegarde', () => {
  for (const k of START_VIEWS) {
    const st = memStorage();
    assert.ok(saveState(st, { ...loadState(st), startView: k, startOnMe: k === 'me' }));
    const back = loadState(st);
    assert.equal(back.startView, k);
    assert.equal(back.startOnMe, k === 'me');
    assert.equal(startViewOf(readSettings(JSON.parse(exportJSON(back)))), k);
  }
});

test('l\'interrupteur a disparu, la ligne mène à la page', () => {
  assert.ok(!app.includes("'menu-title' }, 'Ouvrir sur ma position')"));
  assert.match(app, /row\('locate', 'À l\\'ouverture, la carte montre'/);
  assert.match(app, /section === 'ouverture'/);
  assert.match(app, /startViewOf\(state\) !== 'me' \|\| mapTouched/);
});

test('la dernière vue est gardée à part, hors sauvegarde, et vérifiée à la lecture', () => {
  assert.match(app, /const VIEW_KEY = 'carte-paris\.vue'/);
  assert.match(app, /storage\.setItem\(VIEW_KEY/); // storage = mémoire à part pendant l'essai
  assert.match(app, /Number\.isFinite\(v\.zoom\)/);
});
