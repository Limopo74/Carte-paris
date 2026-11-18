import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, exportJSON, readSettings } from '../js/store.js';

// v189 : « Vibrer quand Maintenant a du nouveau », éteint au départ, gardé et sauvegardé
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('vibrateNow : éteint au départ, gardé, exporté, relu', () => {
  const st = memStorage();
  assert.equal(loadState(st).vibrateNow, false);
  assert.ok(saveState(st, { ...loadState(st), vibrateNow: true }));
  const back = loadState(st);
  assert.equal(back.vibrateNow, true);
  assert.equal(readSettings(JSON.parse(exportJSON(back))).vibrateNow, true);
  assert.ok(saveState(st, { ...back, vibrateNow: 'oui' }));
  assert.equal(loadState(st).vibrateNow, false, 'seul true allume');
});
