import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bearing, relativeAngle, compassLabel, bestFix, detourM, onTheWay, MAX_DETOUR_M,
  orderRoute, routeLength, routeUrl, MAX_ROUTE, newlyNear, directionWord, spokenDistance, walkSegment, stepsFor, dayKey,
} from '../js/move.js';
import { distanceM } from '../js/geo.js';

// Décale une position de `n` mètres vers le nord et `e` mètres vers l'est.
const off = (p, n, e) => ({ lat: p.lat + n / 111195, lng: p.lng + e / (111195 * Math.cos(p.lat * Math.PI / 180)) });
const O = { lat: 48.8566, lng: 2.3522 };

test('cap vers un lieu : nord 0°, est 90°, sud 180°, ouest 270°', () => {
  assert.ok(Math.abs(bearing(O, off(O, 500, 0)) - 0) < 0.5 || Math.abs(bearing(O, off(O, 500, 0)) - 360) < 0.5);
  assert.ok(Math.abs(bearing(O, off(O, 0, 500)) - 90) < 0.5);
  assert.ok(Math.abs(bearing(O, off(O, -500, 0)) - 180) < 0.5);
  assert.ok(Math.abs(bearing(O, off(O, 0, -500)) - 270) < 0.5);
});

test('angle de la flèche selon l\'orientation du téléphone', () => {
  assert.equal(relativeAngle(90, 0), 90);
  assert.equal(relativeAngle(90, 90), 0);
  assert.equal(relativeAngle(10, 350), 20);
  assert.equal(relativeAngle(350, 10), 340);
});

test('direction en mots', () => {
  assert.equal(compassLabel(0), 'nord');
  assert.equal(compassLabel(44), 'nord-est');
  assert.equal(compassLabel(180), 'sud');
  assert.equal(compassLabel(300), 'nord-ouest');
});

test('meilleure position : la plus précise', () => {
  assert.equal(bestFix([{ acc: 80 }, { acc: 12 }, { acc: 30 }]).acc, 12);
  assert.equal(bestFix([]), null);
});

test('détour : nul sur la ligne droite, positif à côté', () => {
  const B = off(O, 1000, 0);
  assert.ok(detourM(O, off(O, 500, 0), B) < 1);
  const d = detourM(O, off(O, 500, 300), B);
  assert.ok(d > 150 && d < 180, `${d}`); // 2 × √(500² + 300²) − 1000 ≈ 166 m
});

test('sur mon chemin : lieux à faire avec un petit détour, dans l\'ordre du trajet', () => {
  const B = off(O, 2000, 0);
  const pts = [
    { id: 'loin', done: false, ...off(O, 1000, 800) },
    { id: 'fin', done: false, ...off(O, 1800, 50) },
    { id: 'debut', done: false, ...off(O, 200, -60) },
    { id: 'visite', done: true, ...off(O, 1000, 0) },
  ];
  assert.ok(MAX_DETOUR_M > 250 && MAX_DETOUR_M < 400);
  const r = onTheWay(pts, O, B);
  assert.deepEqual(r.map((x) => x.point.id), ['debut', 'fin']);
  assert.ok(r[0].detour >= 0);
});

test('parcours : ordre le plus court depuis le départ', () => {
  const a = { id: 'a', ...off(O, 0, 300) };
  const b = { id: 'b', ...off(O, 0, 900) };
  const c = { id: 'c', ...off(O, 0, 600) };
  const r = orderRoute(O, [b, a, c]);
  assert.deepEqual(r.map((x) => x.id), ['a', 'c', 'b']);
  assert.ok(Math.abs(routeLength(O, r) - 900) < 5);
  // un cas où le plus proche d'abord n'est pas le meilleur : 2-opt doit corriger
  const pts = [off(O, 100, 0), off(O, -150, 0), off(O, 800, 0), off(O, -900, 0)].map((p, i) => ({ id: String(i), ...p }));
  const best = orderRoute(O, pts);
  const naive = [pts[0], pts[1], pts[2], pts[3]];
  assert.ok(routeLength(O, best) <= routeLength(O, naive));
});

test('lien Google Maps du parcours : à pied, étapes séparées par |, 4 lieux au plus', () => {
  assert.equal(MAX_ROUTE, 4);
  const pts = [{ lat: 48.1, lng: 2.1 }, { lat: 48.2, lng: 2.2 }, { lat: 48.3, lng: 2.3 }];
  const u = new URL(routeUrl(pts));
  assert.equal(u.origin + u.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(u.searchParams.get('api'), '1');
  assert.equal(u.searchParams.get('travelmode'), 'walking');
  assert.equal(u.searchParams.get('destination'), '48.3,2.3');
  assert.equal(u.searchParams.get('waypoints'), '48.1,2.1|48.2,2.2');
  assert.equal(u.searchParams.get('origin'), null, 'départ : position du téléphone');
  assert.equal(new URL(routeUrl([{ lat: 1, lng: 2 }])).searchParams.get('waypoints'), null);
});

test('suivi : lieux à faire qui viennent d\'entrer à moins de 100 m', () => {
  const pts = [
    { id: 'pres', done: false, ...off(O, 60, 0) },
    { id: 'deja', done: false, ...off(O, 0, 40) },
    { id: 'visite', done: true, ...off(O, 20, 0) },
    { id: 'loin', done: false, ...off(O, 500, 0) },
  ];
  const r = newlyNear(pts, O, new Set(['deja']), 100);
  assert.deepEqual(r.map((p) => p.id), ['pres']);
  assert.ok(distanceM(O, pts[0]) < 100);
});

test('voix : direction et distance en mots', () => {
  assert.equal(directionWord(0), 'tout droit');
  assert.equal(directionWord(350), 'tout droit');
  assert.equal(directionWord(45), 'légèrement à droite');
  assert.equal(directionWord(90), 'à droite');
  assert.equal(directionWord(180), 'derrière toi');
  assert.equal(directionWord(270), 'à gauche');
  assert.equal(directionWord(315), 'légèrement à gauche');
  assert.equal(spokenDistance(43), '40 mètres');
  assert.equal(spokenDistance(3), '10 mètres');
  assert.equal(spokenDistance(1234), '1,2 kilomètre');
  assert.equal(spokenDistance(2500), '2,5 kilomètres');
});

test('compteur de balade : seulement la marche plausible', () => {
  const a = { ...O, acc: 10, time: 0 };
  const b = { ...off(O, 20, 0), acc: 10, time: 15000 }; // 20 m en 15 s
  assert.ok(Math.abs(walkSegment(a, b) - 20) < 1);
  assert.equal(walkSegment(a, { ...off(O, 3, 0), acc: 10, time: 15000 }), 0, 'bruit à l\'arrêt');
  assert.equal(walkSegment(a, { ...off(O, 300, 0), acc: 10, time: 15000 }), 0, 'trop rapide');
  assert.equal(walkSegment(a, { ...b, acc: 60 }), 0, 'imprécis');
  assert.equal(walkSegment(null, b), 0);
  assert.equal(stepsFor(700), 1000);
  assert.equal(dayKey(new Date(2026, 10, 5)), '2026-11-05');
});
