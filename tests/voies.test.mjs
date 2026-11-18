import test from 'node:test';
import assert from 'node:assert/strict';
import { voieKey, voieOrigin } from '../js/voies.js';
import { parseFeatures } from '../js/adresse.js';

test('origine du nom d\'une rue : même clé que le robot, rien quand le nom ne correspond pas', () => {
  const json = { updated: '2026-11-18', voies: { 'rue des archives': 'Cette voie longe les bâtiments des Archives nationales.', 'rue du faubourg saint denis': 'x', 'rue de l\'homme arme': 'y' } };
  assert.equal(voieKey('Rue du Faubourg Saint-Denis'), 'rue du faubourg saint denis');
  assert.equal(voieKey('Rue de l’Homme Armé'), 'rue de l\'homme arme');
  assert.equal(voieOrigin(json, 'Rue des Archives'), 'Cette voie longe les bâtiments des Archives nationales.');
  assert.equal(voieOrigin(json, 'RUE DES  ARCHIVES'), 'Cette voie longe les bâtiments des Archives nationales.');
  assert.equal(voieOrigin(json, 'Rue des Archive'), '', 'pas de rapprochement approximatif');
  assert.equal(voieOrigin(json, ''), '');
  assert.equal(voieOrigin(json, 'toString'), '', 'pas une propriété héritée');
  assert.equal(voieOrigin(null, 'Rue des Archives'), '');
  assert.equal(voieOrigin({ voies: {} }, 'Rue des Archives'), '', 'fichier pas encore arrivé');
  assert.equal(voieOrigin({ voies: { 'rue x': 42 } }, 'Rue X'), '');
});

test('l\'adresse de l\'IGN donne le nom de la rue seule', () => {
  const f = (properties) => ({ features: [{ geometry: { coordinates: [2.357, 48.86] }, properties }] });
  assert.equal(parseFeatures(f({ label: '62 Rue des Archives 75003 Paris', type: 'housenumber', street: 'Rue des Archives', name: '62 Rue des Archives' }))[0].street, 'Rue des Archives');
  assert.equal(parseFeatures(f({ label: 'Rue des Archives 75003 Paris', type: 'street', name: 'Rue des Archives' }))[0].street, 'Rue des Archives');
  assert.equal('street' in parseFeatures(f({ label: 'Paris', type: 'municipality', name: 'Paris' }))[0], false);
});
