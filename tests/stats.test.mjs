import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeAgo, formatDate, todoSummary, categoryCounts, nearestStation, nearestStations } from '../js/stats.js';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 15, 12);

test('ancienneté en mots', () => {
  assert.equal(timeAgo(now - 1000, now), 'aujourd\'hui');
  assert.equal(timeAgo(now - DAY, now), 'hier');
  assert.equal(timeAgo(now - 5 * DAY, now), 'il y a 5 jours');
  assert.equal(timeAgo(now - 15 * DAY, now), 'il y a 2 semaines');
  assert.equal(timeAgo(now - 40 * DAY, now), 'il y a 1 mois');
  assert.equal(timeAgo(now - 250 * DAY, now), 'il y a 8 mois');
  assert.equal(timeAgo(now - 400 * DAY, now), 'il y a 1 an');
  assert.equal(timeAgo(now - 800 * DAY, now), 'il y a 2 ans');
});

test('date de visite en français', () => {
  assert.equal(formatDate(Date.UTC(2026, 2, 3, 12)), '3 mars 2026');
});

test('résumé des lieux à faire autour de moi', () => {
  const g = (ring, done) => ({ ring, items: done.map((d) => ({ point: { done: d } })) });
  // cercles : 100 m (rien à faire), 300 m (1 à faire + 1 visité), 1 km (2 à faire)
  const groups = [g(100, [true]), g(300, [false, true]), g(1000, [false, false])];
  // « déjà visité » n'est qu'une information : tous les lieux sont comptés
  assert.deepEqual(todoSummary(groups), { first: { ring: 100, n: 1 }, last: { ring: 1000, n: 5 } });
  assert.deepEqual(todoSummary([g(100, [false]), g(500, [])]), { first: { ring: 100, n: 1 }, last: { ring: 500, n: 1 } });
  assert.deepEqual(todoSummary([g(100, []), g(500, [])]), { first: null, last: { ring: 500, n: 0 } });
});

test('compte par catégorie', () => {
  const pts = [{ cat: 'a', done: false }, { cat: 'a', done: true }, { cat: 'b', done: false }];
  assert.deepEqual(categoryCounts(pts, 'a'), { total: 2, todo: 1 });
  assert.deepEqual(categoryCounts(pts, 'c'), { total: 0, todo: 0 });
});

test('station la plus proche', () => {
  const st = [
    { n: 'Opéra', m: 'M', l: ['3', '7', '8'], lat: 48.8712, lng: 2.3310 },
    { n: 'Pyramides', m: 'M', l: ['7', '14'], lat: 48.8657, lng: 2.3346 },
  ];
  const r = nearestStation(st, { lat: 48.8700, lng: 2.3318 });
  assert.equal(r.station.n, 'Opéra');
  assert.ok(r.d > 100 && r.d < 200);
  assert.equal(nearestStation([], { lat: 48, lng: 2 }), null);
});

test('les stations les plus proches, dans l\'ordre', () => {
  const st = [
    { n: 'Loin', lat: 48.90, lng: 2.40 },
    { n: 'Opéra', lat: 48.8712, lng: 2.3310 },
    { n: 'Pyramides', lat: 48.8657, lng: 2.3346 },
    { n: 'Madeleine', lat: 48.8700, lng: 2.3245 },
  ];
  const r = nearestStations(st, { lat: 48.8700, lng: 2.3318 }, 3);
  assert.deepEqual(r.map((x) => x.station.n), ['Opéra', 'Pyramides', 'Madeleine']);
  assert.ok(r[0].d < r[1].d && r[1].d < r[2].d);
  assert.deepEqual(nearestStations([], { lat: 48, lng: 2 }), []);
});
