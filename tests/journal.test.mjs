import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airBucket, cleanJournal, addWalk, addUse, prune, lastDays, totals, placesStats, arrProgress } from '../js/journal.js';

test('journal : marche par air, utilisations, 90 jours au plus', () => {
  const j = cleanJournal(null);
  const d1 = new Date(2026, 10, 15, 10);
  const d2 = new Date(2026, 10, 16, 18);
  addWalk(j, 800, 'correct', d1);
  addWalk(j, 400, 'mediocre', d2);
  addWalk(j, 100, null, d2);
  addWalk(j, -5, 'bon', d2); // ignoré
  addUse(j, 'Rentrer', d2); addUse(j, 'Rentrer', d2); addUse(j, 'Sorties', d1);
  const days = lastDays(j, 7, d2);
  assert.equal(days.length, 7);
  assert.equal(days.at(-1).key, '2026-11-16');
  assert.deepEqual(days.at(-1).air, { mauvais: 400, inconnu: 100 });
  const t = totals(days);
  assert.equal(t.m, 1300);
  assert.deepEqual(t.air, { bon: 800, moyen: 0, mauvais: 400, inconnu: 100 });
  assert.deepEqual(t.use, [['Rentrer', 2], ['Sorties', 1]]);
  addWalk(j, 50, 'bon', new Date(2026, 6, 1));
  prune(j, d2);
  assert.ok(!j.days['2026-07-01']);
  assert.ok(j.days['2026-11-15']);
  assert.equal(airBucket('extreme'), 'mauvais');
});

test('journal relu : formes inattendues écartées', () => {
  const j = cleanJournal({ days: { '2026-11-16': { m: '120', air: { bon: 100, pirate: 9 }, use: { Rentrer: 2, x: -1 } }, nope: { m: 5 } } });
  assert.deepEqual(j, { days: { '2026-11-16': { m: 120, air: { bon: 100 }, use: { Rentrer: 2 } } } });
});

test('mes lieux et arrondissements sur la période', () => {
  const now = Date.UTC(2026, 10, 16);
  const from = now - 7 * 864e5;
  const pts = [
    { cat: 'a', created: now - 864e5, done: true, visited: now - 3600e3, arr: 1, fav: true, stars: 5 },
    { cat: 'a', created: now - 60 * 864e5, done: true, visited: now - 40 * 864e5, arr: 2, stars: 3 },
    { cat: 'b', created: now - 2 * 864e5, done: false, arr: 3 },
    { cat: 'b', created: now - 90 * 864e5, done: true, arr: 4 }, // visité sans date
  ];
  const s = placesStats(pts, from, now);
  assert.deepEqual({ ...s, byCat: undefined }, { total: 4, added: 2, visited: 1, fav: 1, stars: 4, byCat: undefined });
  assert.deepEqual(s.byCat, [['a', 2], ['b', 2]]);
  assert.deepEqual(arrProgress(pts, from), { now: 3, gained: 1 });
});
