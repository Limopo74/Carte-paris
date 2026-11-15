import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeatures, searchUrl, reverseUrl } from '../js/adresse.js';

test('lecture des résultats du géocodage', () => {
  const json = {
    type: 'FeatureCollection',
    features: [
      { geometry: { type: 'Point', coordinates: [2.3488, 48.8534] }, properties: { label: '1 Rue de Rivoli 75004 Paris' } },
      { geometry: { type: 'Point', coordinates: ['x', 48] }, properties: { label: 'cassé' } },
      { properties: { label: 'sans géométrie' } },
    ],
  };
  assert.deepEqual(parseFeatures(json), [{ label: '1 Rue de Rivoli 75004 Paris', lat: 48.8534, lng: 2.3488 }]);
  assert.deepEqual(parseFeatures(null), []);
  assert.deepEqual(parseFeatures({}), []);
});

test('adresses des requêtes', () => {
  const u = new URL(searchUrl('8 rue de la paix'));
  assert.equal(u.origin + u.pathname, 'https://data.geopf.fr/geocodage/search');
  assert.equal(u.searchParams.get('q'), '8 rue de la paix');
  assert.equal(u.searchParams.get('limit'), '5');
  assert.equal(u.searchParams.get('autocomplete'), '1');
  assert.equal(u.searchParams.get('lat'), '48.8566');
  assert.equal(u.searchParams.get('lon'), '2.3522');
  const r = new URL(reverseUrl(48.85, 2.35));
  assert.equal(r.origin + r.pathname, 'https://data.geopf.fr/geocodage/reverse');
  assert.equal(r.searchParams.get('lat'), '48.85');
  assert.equal(r.searchParams.get('lon'), '2.35');
});
