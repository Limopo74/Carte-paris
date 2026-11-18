// v176 : « Ouvrir sur ma position » (Réglages → La carte), allumé au départ, gardé et sauvegardé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, exportJSON, readSettings, KEY } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('allumé sur une appli neuve et chez qui avait déjà ses réglages', () => {
  assert.equal(loadState(memStorage()).startOnMe, true);
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st).startOnMe, true);
});

test('éteint, il le reste après rechargement et part avec la sauvegarde', () => {
  const st = memStorage();
  assert.ok(saveState(st, { ...loadState(st), startOnMe: false }));
  const back = loadState(st);
  assert.equal(back.startOnMe, false);
  assert.equal(readSettings(JSON.parse(exportJSON(back))).startOnMe, false);
});

test('une valeur bizarre vaut « allumé »', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], startOnMe: 'non' }));
  assert.equal(loadState(st).startOnMe, true);
});
