// Regroupement de mes lieux vus de loin (v178) : js/groupes.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPoints, groupCenter, groupLabel, GROUP_MAX_ZOOM, GROUP_CELL, GROUP_MIN } from '../js/groupes.js';

// Projection de test : 1 degré = 10 000 px, comme une carte très zoomée (les cases font GROUP_CELL px).
const proj = (p) => ({ x: p.lng * 10000, y: -p.lat * 10000 });
const at = (id, x, y, extra = {}) => ({ id, name: id, lat: -y / 10000, lng: x / 10000, ...extra });

test('regroupement : 3 lieux dans une même case forment un groupe, 2 restent seuls', () => {
  const pts = [at('a', 1, 1), at('b', 10, 10), at('c', 20, 20), at('d', 5 * GROUP_CELL + 1, 1), at('e', 5 * GROUP_CELL + 9, 9)];
  const { single, groups } = groupPoints(pts, proj, GROUP_MAX_ZOOM);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].map((p) => p.id).sort(), ['a', 'b', 'c']);
  assert.deepEqual(single.map((p) => p.id).sort(), ['d', 'e']);
  assert.equal(GROUP_MIN, 3);
});

test('regroupement : un favori n\'est jamais regroupé', () => {
  const pts = [at('a', 1, 1), at('b', 2, 2), at('c', 3, 3, { fav: true })];
  const { single, groups } = groupPoints(pts, proj, 12);
  assert.equal(groups.length, 0, 'il ne reste que 2 lieux non favoris : pas de groupe');
  assert.equal(single.length, 3);
});

test('regroupement : à la vue « rue » (au-delà de GROUP_MAX_ZOOM), jamais de groupe', () => {
  const pts = Array.from({ length: 50 }, (_, i) => at(`p${i}`, i, i));
  assert.equal(groupPoints(pts, proj, GROUP_MAX_ZOOM + 1).groups.length, 0);
  assert.equal(groupPoints(pts, proj, GROUP_MAX_ZOOM + 1).single.length, 50);
  assert.equal(groupPoints(pts, proj, GROUP_MAX_ZOOM).groups.length, 1);
});

test('regroupement : le lieu exclu (celui qu\'on déplace) n\'est ni seul ni dans un groupe', () => {
  const pts = [at('a', 1, 1), at('b', 2, 2), at('c', 3, 3), at('d', 4, 4)];
  const { single, groups } = groupPoints(pts, proj, 12, 'd');
  assert.equal(groups[0].length, 3);
  assert.ok(![...single, ...groups.flat()].some((p) => p.id === 'd'));
});

test('regroupement : rien n\'est perdu, centre au milieu, nombre lisible', () => {
  const pts = Array.from({ length: 40 }, (_, i) => at(`p${i}`, (i * 37) % 400, (i * 53) % 400, { fav: i % 9 === 0 }));
  const { single, groups } = groupPoints(pts, proj, 13);
  assert.equal(single.length + groups.reduce((n, g) => n + g.length, 0), 40);
  const c = groupCenter([{ lat: 48.8, lng: 2.3 }, { lat: 48.9, lng: 2.4 }]);
  assert.ok(Math.abs(c.lat - 48.85) < 1e-9 && Math.abs(c.lng - 2.35) < 1e-9);
  assert.equal(groupLabel(7), '7 lieux ici. Toucher pour zoomer.');
  assert.equal(groupPoints([], proj, 12).groups.length, 0);
});
