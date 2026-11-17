import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placesUrl, parsePlaces, shortAddress, kindLabel, nextDelay, viewBox } from '../js/annuaire.js';

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
  assert.equal(u.searchParams.get('extratags'), '1');
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
    { lat: '48.8721', lon: '2.3317', name: 'Uniqlo', category: 'shop', type: 'clothes', display_name: 'Uniqlo, 19, Rue Scribe, Paris', address: { house_number: '19', road: 'Rue Scribe', postcode: '75009', city: 'Paris' }, extratags: { opening_hours: 'Mo-Sa 10:00-20:00' } },
    { lat: '48.86', lon: '2.33', name: '', category: 'place', type: 'house', display_name: '12, Rue de Rivoli, Paris', address: { road: 'Rue de Rivoli' } },
    { lat: 'x', lon: '2.3', name: 'Cassé', category: 'shop', type: 'bakery' },
    { lat: '48.85', lon: '2.34', name: 'Rue de Rivoli', category: 'highway', type: 'primary', display_name: 'Rue de Rivoli, Paris', address: { road: 'Rue de Rivoli', city: 'Paris' } },
  ];
  assert.deepEqual(parsePlaces(json), [
    { name: 'Uniqlo', kind: 'Vêtements', address: '19 Rue Scribe 75009 Paris', lat: 48.8721, lng: 2.3317, hours: 'Mo-Sa 10:00-20:00' },
  ]);
  assert.deepEqual(parsePlaces(null), []);
  assert.deepEqual(parsePlaces({}), []);
});

test('une requête au plus par seconde', () => {
  assert.equal(nextDelay(0, 10_000), 0);
  assert.equal(nextDelay(10_000, 10_400), 700);
  assert.equal(nextDelay(10_000, 11_200), 0);
});

test('recherche par nom : Paris et départements limitrophes seulement', async () => {
  const { deptOf } = await import('../js/annuaire.js');
  const u = new URL(placesUrl('fnac', { zone: true }));
  assert.equal(u.searchParams.get('bounded'), '1');
  assert.equal(u.searchParams.get('viewbox'), '2.14,48.99,2.62,48.68');
  assert.equal(u.searchParams.get('limit'), '40');
  assert.equal(deptOf({ 'ISO3166-2-lvl6': 'FR-92', postcode: '75001' }), '92');
  assert.equal(deptOf({ postcode: '93100' }), '93');
  assert.equal(deptOf({}), '');
  assert.equal(deptOf({ 'ISO3166-2-lvl6': 'FR-75C' }), '75');
  const r = (name, a) => ({ name, lat: '48.85', lon: '2.35', category: 'shop', type: 'books', address: a });
  const json = [r('Paris', { postcode: '75006', city: 'Paris' }), r('Montreuil', { 'ISO3166-2-lvl6': 'FR-93' }), r('Versailles', { 'ISO3166-2-lvl6': 'FR-78', postcode: '78000' }),
    r('Créteil', { postcode: '94000' }), r('Boulogne', { postcode: '92100' }), r('Sans adresse', {}), r('Argenteuil', { postcode: '95100' })];
  assert.deepEqual(parsePlaces(json, { zone: true }).map((p) => p.name), ['Paris', 'Montreuil', 'Créteil', 'Boulogne', 'Sans adresse']);
  assert.equal(parsePlaces(json).length, 7); // sans zone (import de listes) : rien n'est écarté
});

test('recherche par nom : toutes les réponses gardées, doublons point/bâtiment retirés, gares et lieux de santé reconnus', () => {
  const r = (name, category, type, lat = '48.85', lon = '2.35') => ({ name, lat, lon, category, type, address: { postcode: '75001' } });
  const many = Array.from({ length: 30 }, (_, i) => r(`Uniqlo ${i}`, 'shop', 'clothes', String(48.80 + i * 0.003)));
  assert.equal(parsePlaces(many, { zone: true }).length, 30, 'plus de limite à 8');
  const dup = [r('Uniqlo', 'shop', 'clothes'), r('Uniqlo', 'building', 'retail', '48.8501', '2.3501'), r('Uniqlo', 'shop', 'clothes', '48.86')];
  assert.equal(parsePlaces(dup, { zone: true }).length, 2);
  const kinds = parsePlaces([r('Gare de Lyon', 'railway', 'station'), r('Centre de santé', 'healthcare', 'centre'), r('Rue de Rivoli', 'highway', 'primary'), r('Immeuble', 'building', 'yes'), r('Paris', 'boundary', 'administrative')], { zone: true });
  assert.deepEqual(kinds.map((p) => `${p.name}:${p.kind}`), ['Gare de Lyon:Gare', 'Centre de santé:Santé']);
});

test('recherche de lieux dans la zone que montre la carte', () => {
  // Carte zoomée sur le Marais : la zone est envoyée telle quelle, et la recherche s'y limite
  const box = viewBox({ west: 2.35, north: 48.865, east: 2.37, south: 48.85 });
  assert.equal(box, '2.35,48.87,2.37,48.85'); // arrondie vers l'extérieur à 0,01° (environ 1 km)
  assert.equal(viewBox({ west: 2.3517, north: 48.8650, east: 2.3527, south: 48.8637 }), '2.35,48.87,2.36,48.86');
  const u = new URL(placesUrl('boulangerie', { zone: true, box }));
  assert.equal(u.searchParams.get('viewbox'), box);
  assert.equal(u.searchParams.get('bounded'), '1');
  assert.equal(u.searchParams.get('limit'), '40');
  // Carte qui déborde de Paris et de la petite couronne : ramenée à cette zone
  assert.equal(viewBox({ west: 2.0, north: 48.9, east: 2.4, south: 48.8 }), '2.14,48.90,2.40,48.80');
  // Carte qui montre déjà toute la zone, ou qui regarde ailleurs : pas de seconde recherche
  assert.equal(viewBox({ west: 1.9, north: 49.1, east: 2.8, south: 48.6 }), null);
  assert.equal(viewBox({ west: 5.3, north: 43.4, east: 5.5, south: 43.2 }), null);
});
