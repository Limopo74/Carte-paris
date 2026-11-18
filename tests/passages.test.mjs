// Passages couverts (v167) : liste fixe dans l'appli, triée sur le téléphone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanArcades, arcadesNear, arcadesNearTrace, ARCADE_NEAR_MIN, ARCADE_RAIN_MIN, ARCADE_TRACE_MIN } from '../js/passages.js';
import { minutesToMeters } from '../js/geo.js';
import { cleanCircuits } from '../js/circuits.js';

const file = JSON.parse(readFileSync(new URL('../data/passages.json', import.meta.url), 'utf8'));
const list = cleanArcades(file);

test('Passages : les 12 du fichier sont lus, 6 avec un trait', () => {
  assert.equal(list.length, 12);
  assert.equal(list.filter((a) => a.trace).length, 6);
  for (const a of list) {
    assert.ok(a.nom && a.rues && a.t, a.id);
    assert.match(a.s, /^https:\/\//, `${a.id} a sa source`);
    assert.doesNotMatch(a.t, /\d{1,2} ?h\b/, `${a.id} : aucun horaire précis`);
  }
  assert.deepEqual(list.filter((a) => a.trace).map((a) => a.id).sort(), ['bourg-labbe', 'brady', 'choiseul', 'grand-cerf', 'jouffroy', 'panoramas']);
});

test('Passages : un trait passe près de son repère et reste court', () => {
  for (const a of list.filter((x) => x.trace)) {
    const near = Math.min(...a.trace.map(([lat, lng]) => Math.hypot((lat - a.lat) * 110540, (lng - a.lng) * 73000)));
    assert.ok(near < 20, `${a.id} : repère sur le trait`);
    assert.ok(a.trace.length >= 2 && a.trace.length < 20, a.id);
  }
});

test('Passages : fichier abîmé, trait illisible ou lieu hors de Paris écartés', () => {
  assert.deepEqual(cleanArcades(null), []);
  assert.deepEqual(cleanArcades({ items: [{ id: 'x', nom: 'X', lat: 45.7, lng: 4.8 }] }), [], 'hors de Paris');
  const r = cleanArcades({ items: [{ id: 'a', nom: 'A', lat: 48.87, lng: 2.34, trace: '@@@' }, { id: 'a', nom: 'Doublon', lat: 48.87, lng: 2.34 }, { id: '<b>', nom: 'B', lat: 48.87, lng: 2.34 }] });
  assert.equal(r.length, 1);
  assert.equal(r[0].trace, undefined, 'trait illisible : pictogramme seul');
  assert.equal(cleanArcades({ items: [{ id: 'a', nom: 'A', lat: 48.87, lng: 2.34, s: 'javascript:alert(1)' }] })[0].s, '');
});

test('Passages : à moins de 15 min et à moins de 10 min, du plus proche', () => {
  const grandsBd = { lat: 48.8716, lng: 2.3434 }; // métro Grands Boulevards
  const near = arcadesNear(list, grandsBd, ARCADE_NEAR_MIN);
  assert.ok(near.length >= 4);
  assert.ok(['panoramas', 'jouffroy'].includes(near[0].a.id));
  for (let i = 1; i < near.length; i++) assert.ok(near[i].d >= near[i - 1].d);
  const rain = arcadesNear(list, grandsBd, ARCADE_RAIN_MIN);
  assert.ok(rain.length <= near.length && rain.length >= 2);
  assert.deepEqual(arcadesNear(list, { lat: 48.8462, lng: 2.3372 }, ARCADE_RAIN_MIN), [], 'rien près du Luxembourg');
  assert.deepEqual(arcadesNear(list, null, 15), []);
});

test('Passages : ceux du circuit des passages sont trouvés près de son tracé', () => {
  const c = cleanCircuits(JSON.parse(readFileSync(new URL('../data/circuits.json', import.meta.url), 'utf8'))).find((x) => x.id === 'passages');
  const ids = arcadesNearTrace(list, c.trace, 40).map((x) => x.a.id);
  for (const id of ['jouffroy', 'verdeau', 'panoramas', 'vivienne', 'colbert']) assert.ok(ids.includes(id), id);
  const stops = new Set(c.etapes.map((e) => e.n));
  const others = arcadesNearTrace(list, c.trace, minutesToMeters(ARCADE_TRACE_MIN)).filter((x) => !stops.has(x.a.nom)).map((x) => x.a.id);
  assert.deepEqual(others, ['vero-dodat', 'choiseul'], 'les deux passages proches qui ne sont pas des étapes');
  assert.deepEqual(arcadesNearTrace(list, [], 1000), []);
});
