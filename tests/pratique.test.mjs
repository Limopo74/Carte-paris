import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportUrl, parseRecords, nearestOf } from '../js/pratique.js';

test('adresses des données ouvertes de la Ville de Paris', () => {
  assert.equal(exportUrl('fontaines'), 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/fontaines-a-boire/exports/json');
  assert.equal(exportUrl('toilettes'), 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/sanisettesparis/exports/json');
});

test('fontaines : position, nom, adresse, disponibilité', () => {
  const json = [
    { modele: 'WALLACE', type_objet: 'BORNE_FONTAINE', voie: 'RUE DE RIVOLI', no_voirie_pair: '12', commune: 'PARIS 01', dispo: 'OUI', geo_point_2d: { lon: 2.34, lat: 48.86 } },
    { modele: 'MILLENAIRE', voie: 'QUAI X', dispo: 'NON', geo_point_2d: { lon: 2.35, lat: 48.85 } },
    { modele: 'CASSEE' },
    { modele: 'TABLEAU', geo_point_2d: [48.87, 2.36] },
  ];
  const r = parseRecords(json, 'fontaines');
  assert.equal(r.length, 3);
  assert.deepEqual(r[0], { lat: 48.86, lng: 2.34, label: 'Wallace', detail: '12 Rue de rivoli, PARIS 01', ok: true });
  assert.equal(r[1].ok, false);
  assert.deepEqual([r[2].lat, r[2].lng], [48.87, 2.36]);
});

test('toilettes : adresse, horaires, accès fauteuil, état', () => {
  const json = [
    { type: 'SANISETTE', adresse: '5 RUE X', horaire: '24 h / 24', acces_pmr: 'Oui', statut: '', geo_shape: { geometry: { coordinates: [2.3, 48.8] } } },
    { type: 'SANISETTE', adresse: '6 RUE Y', statut: 'Hors service', geo_point_2d: { lon: 2.31, lat: 48.81 } },
  ];
  const r = parseRecords(json, 'toilettes');
  assert.deepEqual(r[0], { lat: 48.8, lng: 2.3, label: 'Sanisette', detail: '5 RUE X · Horaires : 24 h / 24 · Accès fauteuil', ok: true });
  assert.equal(r[1].ok, false);
});

test('les plus proches en état de marche', () => {
  const items = [
    { lat: 48.861, lng: 2.34, ok: true, label: 'a' },
    { lat: 48.8601, lng: 2.34, ok: false, label: 'hs' },
    { lat: 48.87, lng: 2.34, ok: true, label: 'b' },
  ];
  const r = nearestOf(items, { lat: 48.86, lng: 2.34 }, 2);
  assert.deepEqual(r.map((x) => x.item.label), ['a', 'b']);
  assert.deepEqual(parseRecords(null, 'fontaines'), []);
});
