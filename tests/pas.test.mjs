// v142 : Mon pas — trois modes, chacun avec sa vitesse réglable ; toutes les durées à pied suivent.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { walkMinutes, minutesToMeters, setWalkSpeed, walkMinPerM } from '../js/geo.js';
import { cleanPace, paceKmh, DEFAULT_PACE_KMH, loadState, saveState, exportJSON, readSettings } from '../js/store.js';

after(() => setWalkSpeed(5));
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('5 km/h reste la vitesse d\'avant (12 min par km, détours compris)', () => {
  setWalkSpeed(5);
  assert.equal(walkMinutes(1000), 16); // 1 km à vol d'oiseau = 1,3 km de rues
  assert.equal(minutesToMeters(5), 320);
  assert.ok(Math.abs(walkMinPerM() - 0.0156) < 1e-9);
});

test('plus lent : plus de minutes, des cercles en minutes plus petits', () => {
  setWalkSpeed(3.5);
  assert.equal(walkMinutes(1000), 23);
  assert.equal(minutesToMeters(5), 224);
  setWalkSpeed(6);
  assert.equal(walkMinutes(1000), 13);
  setWalkSpeed(99); assert.equal(walkMinutes(1000), 12, 'borné à 7 km/h');
  setWalkSpeed('n\'importe quoi'); assert.equal(walkMinutes(1000), 16, 'illisible : 5 km/h');
  setWalkSpeed(5);
});

test('le réglage est nettoyé : modes connus, 2 à 7 km/h par demi-km/h', () => {
  assert.deepEqual(cleanPace(), { mode: 'normal', kmh: DEFAULT_PACE_KMH });
  assert.deepEqual(cleanPace({ mode: 'escargot', kmh: { rapide: 9, normal: 4.26, tranquille: 1 } }), { mode: 'normal', kmh: { rapide: 7, normal: 4.5, tranquille: 2 } });
  assert.deepEqual(cleanPace({ mode: 'tranquille', kmh: { __proto__: { tranquille: 6 } } }).kmh.tranquille, 3.5);
  assert.equal(paceKmh({ mode: 'tranquille', kmh: { tranquille: 3 } }), 3);
});

test('Mon pas est gardé, rechargé et part avec la sauvegarde', () => {
  const st = memStorage();
  const s = loadState(st);
  assert.ok(saveState(st, { ...s, pace: { mode: 'tranquille', kmh: { rapide: 6, normal: 5, tranquille: 3 } } }));
  const back = loadState(st);
  assert.deepEqual(back.pace, { mode: 'tranquille', kmh: { rapide: 6, normal: 5, tranquille: 3 } });
  assert.deepEqual(readSettings(JSON.parse(exportJSON(back))).pace, back.pace);
});
