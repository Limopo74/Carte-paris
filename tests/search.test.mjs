import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, searchPoints } from '../js/search.js';

const cats = [{ id: 'resto', name: 'Restos', color: '#000000' }, { id: 'culture', name: 'Musées', color: '#000000' }];
const pts = [
  { id: '1', name: 'Café Kitsuné', note: 'matcha', address: 'Rue de Rivoli 75001 Paris', cat: 'resto', lat: 48.8606, lng: 2.3376 },
  { id: '2', name: 'Orsay', note: 'Expo Degas', address: '', cat: 'culture', lat: 48.86, lng: 2.3266 },
  { id: '3', name: 'Ancien', note: '', address: '10 rue Oberkampf', cat: 'resto', lat: 48.865, lng: 2.37 },
];

test('fold enlève accents et majuscules', () => {
  assert.equal(fold('  Café ÉLÉGANT  '), 'cafe elegant');
});

test('recherche dans le nom, la note, l\'adresse et la catégorie, sans accents', () => {
  assert.deepEqual(searchPoints(pts, cats, 'cafe').map((r) => r.point.id), ['1']);
  assert.deepEqual(searchPoints(pts, cats, 'DEGAS').map((r) => r.point.id), ['2']);
  assert.deepEqual(searchPoints(pts, cats, 'oberkampf').map((r) => r.point.id), ['3']);
  assert.deepEqual(searchPoints(pts, cats, 'musees').map((r) => r.point.id), ['2']);
});

test('plusieurs mots : tous doivent être trouvés', () => {
  assert.deepEqual(searchPoints(pts, cats, 'rivoli matcha').map((r) => r.point.id), ['1']);
  assert.deepEqual(searchPoints(pts, cats, 'rivoli degas'), []);
});

test('sans position : ordre alphabétique ; avec position : du plus proche au plus loin', () => {
  assert.deepEqual(searchPoints(pts, cats, 'r').map((r) => r.point.id), ['3', '1', '2']);
  const here = { lat: 48.865, lng: 2.37 };
  const r = searchPoints(pts, cats, '', here);
  assert.equal(r[0].point.id, '3');
  assert.ok(r[0].d < r[1].d && r[1].d < r[2].d);
});

test('recherche vide sans position : tous les lieux par ordre alphabétique', () => {
  assert.deepEqual(searchPoints(pts, cats, '  ').map((r) => r.point.id), ['3', '1', '2']);
});
