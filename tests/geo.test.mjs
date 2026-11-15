import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceM, walkMinutes, normalizeRings, groupByRings, mapsUrl, DEFAULT_RINGS } from '../js/geo.js';

const notreDame = { lat: 48.852968, lng: 2.349902 };
const eiffel = { lat: 48.858370, lng: 2.294481 };

// Décale une position de `m` mètres vers le nord.
const north = (p, m) => ({ lat: p.lat + m / 111195, lng: p.lng });

test('distance Notre-Dame – Tour Eiffel ≈ 4,1 km', () => {
  const d = distanceM(notreDame, eiffel);
  assert.ok(Math.abs(d - 4100) < 100, `obtenu ${d}`);
});

test('distance nulle pour un même point', () => {
  assert.equal(distanceM(notreDame, notreDame), 0);
});

test('temps de marche : 12 min par km, arrondi au-dessus, 1 min au minimum', () => {
  assert.equal(walkMinutes(0), 1);
  assert.equal(walkMinutes(1000), 12);
  assert.equal(walkMinutes(1001), 13);
  assert.equal(walkMinutes(250), 3);
});

test('normalisation des cercles', () => {
  assert.deepEqual(normalizeRings([50, '300', 300, 'x', 1000, 200]), [100, 200, 300, 1000]);
  assert.deepEqual(normalizeRings([]), DEFAULT_RINGS);
  assert.deepEqual(normalizeRings('n importe quoi'), DEFAULT_RINGS);
  assert.deepEqual(normalizeRings('800, 150 ,150'), [150, 800]);
  assert.deepEqual(normalizeRings([250.6]), [251]);
  assert.deepEqual(DEFAULT_RINGS, [100, 300, 500, 1000]);
});

test('regroupement par cercles : bornes incluses, tri, exclusion au-delà', () => {
  const pts = [
    { id: 'a', ...north(notreDame, 95) },
    { id: 'b', ...north(notreDame, 40) },
    { id: 'c', ...north(notreDame, 450) },
    { id: 'd', ...north(notreDame, 5000) },
  ];
  const g = groupByRings(pts, notreDame, [100, 300, 500, 1000]);
  assert.deepEqual(g.map((x) => x.ring), [100, 300, 500, 1000]);
  assert.deepEqual(g[0].items.map((x) => x.point.id), ['b', 'a']);
  assert.deepEqual(g[1].items, []);
  assert.deepEqual(g[2].items.map((x) => x.point.id), ['c']);
  const all = g.flatMap((x) => x.items.map((i) => i.point.id));
  assert.ok(!all.includes('d'));
});

test('un point pile sur la limite d\'un cercle est dedans', () => {
  const p = { id: 'x', ...north(notreDame, 100) };
  const r = distanceM(notreDame, p);
  const g = groupByRings([p], notreDame, [r, 1000]);
  assert.deepEqual(g[0].items.map((x) => x.point.id), ['x']);
});

test('lien Google Maps : à pied sous 1 km, transports à partir de 1 km', () => {
  const p = { lat: 48.85, lng: 2.35 };
  assert.match(mapsUrl(p, 999), /travelmode=walking/);
  assert.match(mapsUrl(p, 1000), /travelmode=transit/);
  assert.match(mapsUrl(p, 10), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=48\.85,2\.35&/);
});
