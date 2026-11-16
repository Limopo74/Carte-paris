import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportUrl, parseRecords, nearestOf } from '../js/pratique.js';
import { parseRatpToilets } from '../js/pratique.js';

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

test('toilettes RATP : zone payante dite clairement, lignes illisibles écartées', () => {
  const t = parseRatpToilets({ items: [
    { n: 'Nation', l: 'A', lat: 48.848, lng: 2.397, zone: true, passe: false, payant: false, pmr: true, ou: 'En bas des escalators.' },
    { n: 'Laplace', l: 'B', lat: 48.808, lng: 2.333, zone: false, passe: true, payant: false, pmr: true, ou: '' },
    { n: 'Sans position' },
  ] });
  assert.equal(t.length, 2);
  assert.equal(t[0].label, 'Toilettes RATP · Nation');
  assert.match(t[0].detail, /zone payante.*ticket/); assert.match(t[0].detail, /Accès fauteuil/);
  assert.match(t[1].detail, /Sans passer les tourniquets/); assert.match(t[1].detail, /passe Navigo/);
  assert.deepEqual(parseRatpToilets(null), []);
});

test('parcs : horaires de la saison (îlots de fraîcheur) au format OpenStreetMap', async () => {
  const { parkHours, parkFor, looksLikePark } = await import('../js/pratique.js');
  const { openState } = await import('../js/hours.js');
  const nov = new Date(2026, 10, 16, 16, 0);
  const days = (wk, we) => ({ horaires_lundi: wk, horaires_mardi: wk, horaires_mercredi: wk, horaires_jeudi: wk, horaires_vendredi: wk, horaires_samedi: we, horaires_dimanche: we });
  const sq = { ...days('08h00 - 17h00', '09h00 - 17h00'), horaires_periode: 'du 25/10/26 au 28/02/27', ouvert_24h: 'Non' };
  const h = parkHours(sq, nov);
  assert.equal(h, 'Mo 08:00-17:00; Tu 08:00-17:00; We 08:00-17:00; Th 08:00-17:00; Fr 08:00-17:00; Sa 09:00-17:00; Su 09:00-17:00');
  assert.equal(openState(h, new Date(2026, 10, 16, 17, 30)).open, false, 'un square ferme à 17 h en hiver');
  assert.equal(parkHours(sq, new Date(2027, 4, 1)), '', 'saison passée : horaires inconnus plutôt que faux');
  assert.equal(parkHours({ ...days('00h00 - 23h59', '00:00 - 23:59'), horaires_periode: 'None' }, nov), '24/7');
  assert.equal(parkHours({ ...days('None', 'None'), ouvert_24h: 'Oui' }, nov), '24/7');
  assert.equal(parkHours({ ...days('08h30 - 12h30 / 14h00 - 17h00', '-'), horaires_periode: 'à partir du 07/06/22' }, nov), 'Mo 08:30-12:30,14:00-17:00; Tu 08:30-12:30,14:00-17:00; We 08:30-12:30,14:00-17:00; Th 08:30-12:30,14:00-17:00; Fr 08:30-12:30,14:00-17:00; Sa off; Su off');
  assert.equal(parkHours({ ...days('15H - 18H', '10h-19h'), horaires_periode: null }, nov), 'Mo 15:00-18:00; Tu 15:00-18:00; We 15:00-18:00; Th 15:00-18:00; Fr 15:00-18:00; Sa 10:00-19:00; Su 10:00-19:00');
  assert.equal(parkHours({ ...days('08h00 - 17h00', 'None') }, nov), '', 'un jour inconnu : on ne devine pas');
  const parks = [{ label: 'PARC MONCEAU', lat: 48.8797, lng: 2.3088, hours: '24/7' }, { label: 'SQUARE DES BATIGNOLLES', lat: 48.8867, lng: 2.3170, hours: h }];
  assert.equal(parkFor({ name: 'Parc Monceau', lat: 48.8812, lng: 2.3110 }, parks)?.label, 'PARC MONCEAU', 'entrée du parc, à 230 m du centre');
  assert.equal(parkFor({ name: 'Café Monceau', lat: 48.8850, lng: 2.3170 }, parks)?.label, undefined, '« Monceau » mais à plus de 500 m');
  assert.equal(parkFor({ name: 'Mon banc', lat: 48.88672, lng: 2.31702 }, parks)?.label, 'SQUARE DES BATIGNOLLES');
  assert.ok(looksLikePark('Jardin du Luxembourg'));
  assert.ok(looksLikePark('Square du Temple Parcs'));
  assert.ok(!looksLikePark('Parcours galerie'));
});
