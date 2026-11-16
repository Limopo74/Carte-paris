import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streetKind } from '../js/events.js';

test('streetKind : ce qui se passe dans la rue', () => {
  assert.equal(streetKind({ title: 'Vide-grenier de la rue Mouffetard', place: 'Rue Mouffetard' }), 'brocante');
  assert.equal(streetKind({ title: 'Brocante solidaire', place: 'Gymnase Japy' }), null, 'brocante en salle');
  assert.equal(streetKind({ title: 'Fête de quartier', place: 'Place des Fêtes' }), 'fete');
  assert.equal(streetKind({ title: 'Festival de jazz', place: 'Théâtre du Châtelet' }), null, 'festival en salle');
  assert.equal(streetKind({ title: 'Exposition photo sur les grilles du Luxembourg', place: 'Jardin du Luxembourg' }), 'expo');
  assert.equal(streetKind({ title: 'Exposition Hockney', place: 'Musée de l\'Orangerie' }), null, 'expo en musée');
  assert.equal(streetKind({ title: 'Exposition en plein air', tags: 'Expo', place: '' }), 'expo');
  assert.equal(streetKind({ title: 'Marché de Noël de Saint-Germain', place: 'Place Saint-Germain-des-Prés' }), 'marche');
  assert.equal(streetKind({ title: 'Marché de créateurs', place: 'Parvis de l\'Hôtel de Ville' }), 'marche');
  assert.equal(streetKind({ title: 'Conférence sur l\'art', place: 'Bibliothèque Forney' }), null);
});
