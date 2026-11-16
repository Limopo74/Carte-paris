import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceM, walkMinutes, normalizeRings, groupByRings, mapsUrl, DEFAULT_RINGS, minutesToMeters, normalizeMinuteRings, DEFAULT_MINUTE_RINGS } from '../js/geo.js';

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

test('temps de marche : 12 min par km sur un trajet 1,3 fois plus long qu\'à vol d\'oiseau', () => {
  assert.equal(walkMinutes(0), 1);
  assert.equal(walkMinutes(1000), 16);
  assert.equal(walkMinutes(2000), 32);
  assert.equal(walkMinutes(250), 4);
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

test('cercles en minutes à pied', () => {
  assert.deepEqual(DEFAULT_MINUTE_RINGS, [5, 10, 15, 20]);
  assert.equal(minutesToMeters(10), 641);
  assert.equal(minutesToMeters(5), 320);
  for (const m of [5, 10, 15, 20]) assert.ok(walkMinutes(minutesToMeters(m)) <= m, `${m} min`);
  assert.deepEqual(normalizeMinuteRings('15, 5, 5, 90, x, 0'), [5, 15, 60]);
  assert.deepEqual(normalizeMinuteRings(''), [5, 10, 15, 20]);
});

test('cercles : un favori passe devant, dans la limite du bonus', async () => {
  const { groupByRings } = await import('../js/geo.js');
  const here = { lat: 48.86, lng: 2.34 };
  const at = (m) => ({ lat: 48.86 + m / 111195, lng: 2.34 });
  const a = { id: 'a', ...at(100) }, f = { id: 'f', fav: true, ...at(300) }, g = { id: 'g', fav: true, ...at(800) };
  const [ring] = groupByRings([a, f, g], here, [1000], { favBonus: 400 });
  assert.deepEqual(ring.items.map((x) => x.point.id), ['f', 'a', 'g']); // f gagne (200 m d'écart), g non (700 m)
  const [plain] = groupByRings([a, f], here, [1000]);
  assert.deepEqual(plain.items.map((x) => x.point.id), ['a', 'f']); // sans bonus : distance seule
});
