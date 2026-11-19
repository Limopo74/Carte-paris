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

/* v220 : sorties réelles de l'agenda lues le 19 nov. 2026 (titre, lieu, étiquettes, champ « en salle »). */
const real = (title, place, tags = '', indoor = null) => ({ title, place, tags, address: '', lead: '', indoor });
test('streetKind : un concert de festival en salle n\'est pas une fête de rue', () => {
  assert.equal(streetKind(real('60 Juno • Kino Motel', 'SUPERSONIC', 'Concert;Festival', true)), null);
  assert.equal(streetKind(real('#Rdv avec ISAIAS ALVES', 'Le Baiser Salé', 'Concert;Festival', true)), null);
  assert.equal(streetKind(real('Manda Sira', 'La Scène du Canal', 'Concert;Festival', true)), null, '« canal » dans le nom d\'une salle');
  assert.equal(streetKind(real('Jeudi 19 novembre à Ici Demain festival', 'FGO-Barbara', 'Concert;Festival', true)), null);
});
test('streetKind : une fête sans indice de plein air reste en salle', () => {
  assert.equal(streetKind(real('Fête du piano', 'Philharmonie de Paris', '', true)), null);
  assert.equal(streetKind(real('Christmas jazz night au Bal Blomet', 'Le Bal Blomet', '', true)), null);
  assert.equal(streetKind(real('Les Meneuses fêtent leur un an !', 'Les Etoiles', '', true)), null);
  assert.equal(streetKind(real('Marché de Noël Japonais à Ground Control', 'Ground Control', '', true)), null);
  assert.equal(streetKind(real('Kiosques en fete Square Maurice Gardette', 'Square Maurice Gardette', '', false)), 'fete');
  assert.equal(streetKind(real('Marché de Noël des Champs-Elysées', '', '', false)), 'marche', '« dehors » dans l\'agenda suffit');
});
test('streetKind : « en salle » de l\'agenda n\'écarte pas une brocante de boulevard (faux dans l\'agenda)', () => {
  assert.equal(streetKind(real('Brocante - Boulevard Pasteur (15e)', 'Boulevard Pasteur - Paris 15e - Métro Pasteur', '', true)), 'brocante');
  assert.equal(streetKind(real('Marché de Noël alsacien de la Gare de l\'Est', 'Parvis de la Gare de l\'Est', '', true)), 'marche');
});
