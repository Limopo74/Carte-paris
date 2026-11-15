import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placesUrl, parsePlaces, shortAddress, kindLabel, nextDelay } from '../js/annuaire.js';

test('adresse de la requête Nominatim', () => {
  const u = new URL(placesUrl('uniqlo opéra'));
  assert.equal(u.origin + u.pathname, 'https://nominatim.openstreetmap.org/search');
  assert.equal(u.searchParams.get('q'), 'uniqlo opéra');
  assert.equal(u.searchParams.get('format'), 'jsonv2');
  assert.equal(u.searchParams.get('countrycodes'), 'fr');
  assert.equal(u.searchParams.get('addressdetails'), '1');
  assert.equal(u.searchParams.get('accept-language'), 'fr');
  assert.equal(u.searchParams.get('limit'), '8');
  assert.equal(u.searchParams.get('viewbox'), '2.22,48.92,2.47,48.80');
  assert.equal(u.searchParams.get('bounded'), '0');
});

test('adresse courte à partir du détail', () => {
  assert.equal(shortAddress({ house_number: '19', road: 'Rue Scribe', postcode: '75009', city: 'Paris' }), '19 Rue Scribe 75009 Paris');
  assert.equal(shortAddress({ road: 'Rue Scribe', postcode: '75009', town: 'Boulogne' }), 'Rue Scribe 75009 Boulogne');
  assert.equal(shortAddress({ pedestrian: 'Place du Tertre', city: 'Paris' }), 'Place du Tertre Paris');
  assert.equal(shortAddress(undefined), '');
});

test('type de lieu en français, vide si inconnu', () => {
  assert.equal(kindLabel('shop', 'clothes'), 'Vêtements');
  assert.equal(kindLabel('amenity', 'restaurant'), 'Restaurant');
  assert.equal(kindLabel('tourism', 'museum'), 'Musée');
  assert.equal(kindLabel('shop', 'truc_inconnu'), 'Magasin');
  assert.equal(kindLabel('highway', 'residential'), '');
});

test('lecture des résultats : lieux nommés, adresses écartées, entrées cassées ignorées', () => {
  const json = [
    { lat: '48.8721', lon: '2.3317', name: 'Uniqlo', category: 'shop', type: 'clothes', display_name: 'Uniqlo, 19, Rue Scribe, Paris', address: { house_number: '19', road: 'Rue Scribe', postcode: '75009', city: 'Paris' } },
    { lat: '48.86', lon: '2.33', name: '', category: 'place', type: 'house', display_name: '12, Rue de Rivoli, Paris', address: { road: 'Rue de Rivoli' } },
    { lat: 'x', lon: '2.3', name: 'Cassé', category: 'shop', type: 'bakery' },
    { lat: '48.85', lon: '2.34', name: 'Rue de Rivoli', category: 'highway', type: 'primary', display_name: 'Rue de Rivoli, Paris', address: { road: 'Rue de Rivoli', city: 'Paris' } },
  ];
  assert.deepEqual(parsePlaces(json), [
    { name: 'Uniqlo', kind: 'Vêtements', address: '19 Rue Scribe 75009 Paris', lat: 48.8721, lng: 2.3317 },
  ]);
  assert.deepEqual(parsePlaces(null), []);
  assert.deepEqual(parsePlaces({}), []);
});

test('une requête au plus par seconde', () => {
  assert.equal(nextDelay(0, 10_000), 0);
  assert.equal(nextDelay(10_000, 10_400), 700);
  assert.equal(nextDelay(10_000, 11_200), 0);
});
