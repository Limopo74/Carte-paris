// v320 : Mesurer mon pas — chrono qui s'arrête seul au bout de 1 km compté comme dans l'appli (ligne droite × 1,3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startOk, progress, result, nearestStep, chronoText, perKmText, MESURE_ACC } from '../js/mesure-pas.js';
import { distanceM, DETOUR } from '../js/geo.js';

const A = { lat: 48.8566, lng: 2.3522, acc: 8, time: 0 };
// Un point plein nord à `m` mètres en ligne droite
const north = (m, acc = 8) => ({ lat: A.lat + m / 111195, lng: A.lng, acc, time: 0 });

test('départ : position sûre à 20 m près et récente seulement', () => {
  assert.equal(startOk({ ...A, time: 1000 }, 5000), true);
  assert.equal(startOk({ ...A, acc: MESURE_ACC + 1, time: 1000 }, 5000), false, 'trop imprécise');
  assert.equal(startOk({ ...A, time: 0 }, 20000), false, 'trop vieille');
  assert.equal(startOk(null, 0), false);
});

test('1 km = environ 770 m en ligne droite, comme partout dans l\'appli', () => {
  const p = progress(A, north(500));
  assert.equal(p.done, false);
  assert.ok(Math.abs(p.m - 500 * DETOUR) < 2);
  assert.equal(progress(A, north(1000 / DETOUR + 2)).done, true);
  assert.ok(Math.abs(distanceM(A, north(769)) - 769) < 1);
});

test('après 1 km, une position imprécise fait attendre la suivante', () => {
  assert.equal(progress(A, north(800, 40)).done, false);
  assert.equal(progress(A, north(800, 15)).done, true);
});

test('vitesse : 1 km en 12 min = 5 km/h, cran le plus proche par demi-km/h', () => {
  const r = result(A, north(1000 / DETOUR), 0, 12 * 60 * 1000);
  assert.ok(Math.abs(r.kmh - 5) < 0.01);
  assert.equal(r.step, 5);
  const r2 = result(A, north(1000 / DETOUR), 0, (12 * 60 + 40) * 1000); // 4,74 km/h
  assert.equal(r2.step, 4.5);
  assert.equal(perKmText(r2.kmh), '12 min 40 s');
});

test('la distance réellement comptée à l\'arrivée sert au calcul (dernière position un peu après 1 km)', () => {
  const r = result(A, north(1100 / DETOUR), 0, 13.2 * 60 * 1000); // 1,1 km en 13,2 min = 5 km/h
  assert.ok(Math.abs(r.kmh - 5) < 0.01);
});

test('pas de résultat plutôt qu\'un faux : moins de 1 km, imprécis, trop vite ou trop lent', () => {
  assert.equal(result(A, north(500), 0, 600000), null);
  assert.equal(result(A, north(800, 40), 0, 720000), null);
  assert.equal(result(A, north(800), 0, 3 * 60 * 1000), null, '20 km/h : transport ou saut du GPS');
  assert.equal(result(A, north(800), 0, 60 * 60 * 1000), null, '1 km/h');
  assert.equal(result(A, north(800), 1000, 1000), null);
});

test('crans bornés de 2 à 7 km/h', () => {
  assert.equal(nearestStep(1.6), 2);
  assert.equal(nearestStep(7.8), 7);
  assert.equal(nearestStep(5.74), 5.5);
  assert.equal(nearestStep(5.76), 6);
});

test('chrono écrit à la française', () => {
  assert.equal(chronoText(45), '45 s');
  assert.equal(chronoText(312), '5 min 12 s');
  assert.equal(chronoText(3720), '1 h 2 min');
});

test('Mon pas : deux boutons Mesurer Normal et Mesurer Rapide, rien n\'est gardé ni envoyé', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /\['normal', 'rapide'\]\.map\(\(m\) => el\('button'.*`Mesurer \$\{PACE_NAME\[m\]\}`/);
  const fn = app.slice(app.indexOf('function openMesurePas'), app.indexOf('function openMesurePas') + 9000);
  assert.ok(!/fetch\(|persist\(\)[^;]*;[^\n]*start/.test(fn.split('function save')[0]), 'aucun envoi');
  assert.match(fn, /start = null; \/\/ le point de départ est oublié/);
  assert.match(fn, /onClose: stop/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /'js\/mesure-pas\.js'/);
});
