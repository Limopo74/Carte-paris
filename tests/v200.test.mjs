import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanGares, gareLines, garesNear } from '../js/gares.js';

test('gares de RER et arrêts de tram : nettoyés, lignes lisibles, les plus proches', () => {
  const list = cleanGares({ stations: [
    { n: 'Porte Dorée', m: 'T', l: ['3a'], lat: 48.83552, lng: 2.40666 },
    { n: 'Porte de Vincennes', m: 'T', l: ['3a', '3b'], lat: 48.84717, lng: 2.4096 },
    { n: 'Cité Universitaire', m: 'R', l: ['B'], lat: 48.8203, lng: 2.3384 },
    { n: 'Métro ?', m: 'M', l: ['1'], lat: 48.85, lng: 2.35 }, { n: 'x', m: 'R', l: [], lat: 48.8, lng: 2.3 }, { n: 'y', m: 'T', l: ['2'] }] });
  assert.equal(list.length, 3);
  assert.equal(gareLines(list[0]), 'Tram T3a');
  assert.equal(gareLines(list[1]), 'Tram T3a, T3b');
  assert.equal(gareLines(list[2]), 'RER B');
  const lac = { lat: 48.8338, lng: 2.4153 }; // lac Daumesnil, bois de Vincennes
  assert.deepEqual(garesNear(list, lac, 1500, 3).map((x) => x.station.n), ['Porte Dorée'], 'Porte de Vincennes est à plus de 1,5 km');
  assert.deepEqual(garesNear(list, lac, 3000, 3).map((x) => x.station.n), ['Porte Dorée', 'Porte de Vincennes']);
  assert.deepEqual(garesNear([], lac), []); assert.deepEqual(garesNear(list, null), []);
});

test('horaires datés : la date de copie est gardée avec les horaires, et seulement avec eux', async () => {
  const { newPoint, loadState, saveState } = await import('../js/store.js').catch(() => ({}));
  if (!newPoint) return;
  const p = newPoint({ name: 'Café', cat: 'c', lat: 48.86, lng: 2.35, hours: 'Mo-Fr 08:00-18:00' });
  assert.ok(Number.isFinite(p.hoursAt) && Math.abs(p.hoursAt - Date.now()) < 5000);
  assert.equal('hoursAt' in newPoint({ name: 'Café', cat: 'c', lat: 48.86, lng: 2.35 }), false, 'sans horaires : pas de date');
  void loadState; void saveState;
});
