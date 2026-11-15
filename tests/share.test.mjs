import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseShared } from '../js/share.js';

test('partage depuis Google Maps : nom et adresse', () => {
  const r = parseShared({ title: '', text: 'Du Pain et des Idées\n34 Rue Yves Toudic, 75010 Paris\nhttps://maps.app.goo.gl/XyZ123', url: '' });
  assert.equal(r.name, 'Du Pain et des Idées');
  assert.equal(r.address, '34 Rue Yves Toudic, 75010 Paris');
  assert.equal(r.lat, null);
  assert.equal(r.query, 'Du Pain et des Idées 34 Rue Yves Toudic, 75010 Paris');
});

test('partage avec un titre et une adresse sur la même ligne', () => {
  const r = parseShared({ title: 'Septime', text: 'Septime · 80 Rue de Charonne, 75011 Paris', url: 'https://maps.app.goo.gl/abc' });
  assert.equal(r.name, 'Septime');
  assert.equal(r.address, '80 Rue de Charonne, 75011 Paris');
});

test('coordonnées dans un lien', () => {
  const a = parseShared({ text: 'https://www.google.com/maps/place/Louvre/@48.8606111,2.337644,17z' });
  assert.deepEqual([a.lat, a.lng], [48.8606111, 2.337644]);
  const b = parseShared({ url: 'https://maps.google.com/?q=48.85,2.35' });
  assert.deepEqual([b.lat, b.lng], [48.85, 2.35]);
  const c = parseShared({ text: 'geo:48.8584,2.2945?q=Tour Eiffel' });
  assert.deepEqual([c.lat, c.lng], [48.8584, 2.2945]);
  const d = parseShared({ url: 'https://www.openstreetmap.org/#map=18/48.86/2.34' });
  assert.deepEqual([d.lat, d.lng], [48.86, 2.34]);
});

test('coordonnées hors limites ignorées', () => {
  assert.equal(parseShared({ text: 'https://x.y/@123.4,2.3,17z' }).lat, null);
});

test('lien seul, sans nom ni adresse (Instagram)', () => {
  const r = parseShared({ url: 'https://www.instagram.com/p/abc123/' });
  assert.equal(r.name, '');
  assert.equal(r.address, '');
  assert.equal(r.query, '');
});

test('titre seul', () => {
  const r = parseShared({ title: 'Musée Carnavalet' });
  assert.equal(r.name, 'Musée Carnavalet');
  assert.equal(r.query, 'Musée Carnavalet');
});
