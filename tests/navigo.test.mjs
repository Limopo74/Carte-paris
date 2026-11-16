import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseNavigo, navigoNear, navigoFor, nameWords, navigoGenre, NAVIGO_SOURCE } from '../js/navigo.js';

const json = JSON.parse(readFileSync(new URL('../data/navigo.json', import.meta.url), 'utf8'));
const items = parseNavigo(json);

test('navigo : le fichier est daté, dans la zone de l\'appli, sans offre « en cours d\'élaboration »', () => {
  assert.match(json.updated ?? '', /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(items.length > 100, `${items.length} lieux`);
  for (const x of items) {
    assert.ok(x.lat > 48.72 && x.lat < 48.96 && x.lng > 2.2 && x.lng < 2.5, x.name);
    assert.ok(!/laboration/i.test(x.offer), x.name);
  }
  assert.match(NAVIGO_SOURCE, /^https:\/\/prim\.iledefrance-mobilites\.fr\//);
});

test('navigo : lecture prudente (lignes incomplètes ignorées, liens non web retirés)', () => {
  const r = parseNavigo({ items: [{ n: 'A', o: 'Tarif réduit', lat: 48.8, lng: 2.3, url: 'javascript:alert(1)' }, { n: 'B', lat: 48.8, lng: 2.3 }, null] });
  assert.equal(r.length, 1);
  assert.equal(r[0].url, '');
  assert.deepEqual(parseNavigo(null), []);
});

test('navigo : tri par distance, au moins les plus proches', () => {
  const from = { lat: 48.8812, lng: 2.3361 };
  const near = navigoNear(items, from, 2000, 5);
  assert.ok(near.length >= 5);
  for (let i = 1; i < near.length; i++) assert.ok(near[i].d >= near[i - 1].d);
  const far = navigoNear(items, { lat: 48.73, lng: 2.21 }, 10, 3);
  assert.equal(far.length, 3);
});

test('navigo : retrouve un de mes lieux par le nom et la position', () => {
  const p = items.find((x) => /Parnassiens/.test(x.name));
  assert.ok(p);
  assert.equal(navigoFor({ name: 'Les 7 Parnassiens', lat: p.lat + 0.0008, lng: p.lng }, items)?.name, p.name); // ≈ 90 m, même nom
  assert.equal(navigoFor({ name: 'Boulangerie du coin', lat: p.lat + 0.0008, lng: p.lng }, items), null); // ≈ 90 m, autre nom
  assert.equal(navigoFor({ name: 'Mon ciné', lat: p.lat + 0.0001, lng: p.lng }, items)?.name, p.name); // ≈ 11 m
  assert.deepEqual(nameWords('Théâtre de l\'Atelier'), ['atelier']);
  assert.equal(navigoGenre('Cinéma'), 'cine');
});
