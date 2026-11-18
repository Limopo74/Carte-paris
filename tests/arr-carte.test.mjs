// v193 : arrondissement sûr de ma position (pastille de la carte), point du numéro, réglage des numéros.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arrSure, arrLabelPoint, arrAt } from '../js/explore.js';
import { loadState, saveState, readSettings, exportJSON } from '../js/store.js';

const data = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url), 'utf8'));
const NOW = Date.UTC(2026, 10, 18, 15, 0, 0);
const fix = (lat, lng, acc = 10, ago = 0) => ({ lat, lng, acc, time: NOW - ago });

test('arrSure : au milieu du 3e, précis et récent → 3', () => {
  const p = arrLabelPoint(data.arr.find((a) => a.n === 3).rings);
  assert.equal(arrSure(fix(p[0], p[1]), data, NOW), 3);
});

test('arrSure : rien si la position est trop vieille, imprécise ou sans précision', () => {
  const p = arrLabelPoint(data.arr.find((a) => a.n === 3).rings);
  assert.equal(arrSure(fix(p[0], p[1], 10, 11 * 60 * 1000), data, NOW), null, 'plus de 10 min');
  assert.equal(arrSure(fix(p[0], p[1], 2000), data, NOW), null, 'précision de 2 km');
  assert.equal(arrSure({ lat: p[0], lng: p[1], time: NOW }, data, NOW), null, 'précision inconnue');
  assert.equal(arrSure(null, data, NOW), null);
});

test('arrSure : rien tout près d\'une limite (20 m d\'un sommet du contour), même avec un GPS à 15 m', () => {
  const ring = data.arr.find((a) => a.n === 11).rings[0];
  // un point juste à l'intérieur d'un sommet du 11e
  const [x, y] = ring[5];
  const c = arrLabelPoint(data.arr.find((a) => a.n === 11).rings);
  const lat = y + (c[0] - y) * 0.004; const lng = x + (c[1] - x) * 0.004;
  assert.equal(arrAt(lat, lng, data), 11, 'le point d\'essai est bien dans le 11e');
  assert.equal(arrSure(fix(lat, lng, 15), data, NOW), null);
});

test('arrSure : hors de Paris → rien', () => {
  assert.equal(arrSure(fix(48.80, 2.13), data, NOW), null, 'Versailles');
});

test('arrSure : la marche depuis la mesure élargit la marge', () => {
  const p = arrLabelPoint(data.arr.find((a) => a.n === 2).rings); // le 2e est petit
  assert.equal(arrSure(fix(p[0], p[1], 10, 0), data, NOW), 2);
  assert.equal(arrSure(fix(p[0], p[1], 10, 9 * 60 * 1000), data, NOW), null, '9 min de marche possible : on ne sait plus');
});

test('arrLabelPoint : chaque numéro tombe dans son arrondissement', () => {
  for (const a of data.arr) {
    const p = arrLabelPoint(a.rings);
    assert.ok(p, `${a.n} sans point`);
    assert.equal(arrAt(p[0], p[1], data), a.n, `numéro du ${a.n} hors de son arrondissement`);
  }
});

test('showArrNums : allumé au départ, gardé, exporté, relu', () => {
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  assert.equal(loadState(st).showArrNums, true);
  assert.ok(saveState(st, { ...loadState(st), showArrNums: false }));
  const back = loadState(st);
  assert.equal(back.showArrNums, false);
  assert.equal(readSettings(JSON.parse(exportJSON(back))).showArrNums, false);
});
