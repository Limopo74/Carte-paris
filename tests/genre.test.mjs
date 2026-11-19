import test from 'node:test';
import assert from 'node:assert/strict';
import { genreOf, startsLater } from '../js/events.js';

test('genre : brocante, fête et expo passent avant le reste', () => {
  assert.equal(genreOf({ title: 'Vide-greniers de la rue Oberkampf', tags: '' }), 'chiner');
  assert.equal(genreOf({ title: 'Fête de la musique', tags: 'Concert' }), 'fete');
  assert.equal(genreOf({ title: 'Photographies', tags: 'Expo' }, { expo: true }), 'expo');
});

test('genre : un seul indice donne le genre', () => {
  assert.equal(genreOf({ title: 'Concert de jazz manouche', tags: '' }), 'musique');
  assert.equal(genreOf({ title: 'Ciné-club : courts métrages', tags: '' }), 'cine');
  assert.equal(genreOf({ title: 'Visite des passages couverts', tags: '' }), 'balade');
  assert.equal(genreOf({ title: 'Atelier origami', tags: '' }), 'atelier');
  assert.equal(genreOf({ title: 'Théâtre : Le Misanthrope', tags: '' }), 'scene');
});

test('genre : en famille l\'emporte', () => {
  assert.equal(genreOf({ title: 'Atelier origami, dès 6 ans', tags: '' }), 'famille');
  assert.equal(genreOf({ title: 'Spectacle', tags: 'Enfants' }), 'famille');
});

test('genre : pas sûr, pas de genre', () => {
  assert.equal(genreOf({ title: 'Spectacle musical', tags: '' }), null); // scène ou musique ?
  assert.equal(genreOf({ title: 'Journée portes ouvertes', tags: '' }), null);
  assert.equal(genreOf({}), null);
  assert.equal(genreOf({ title: 'Rock and roll', tags: '' }), 'musique');
  assert.equal(genreOf({ title: 'Les rochers du parc', tags: '' }), null); // « roch » n'est pas « rock »
});

test('en ce moment ou plus tard', () => {
  const now = new Date('2026-11-16T15:00:00');
  assert.equal(startsLater({ start: new Date('2026-11-16T18:30:00') }, now), true);
  assert.equal(startsLater({ start: new Date('2026-11-01T10:00:00') }, now), false);
  assert.equal(startsLater({ start: null }, now), false);
});

test('genre (v220) : « Festival » n\'est plus une fête ; les étiquettes de l\'agenda donnent l\'activité', async () => {
  const { tagGenre } = await import('../js/events.js');
  assert.equal(genreOf({ title: 'Eboni Fondren 4tet', tags: 'Concert;Festival' }), 'musique');
  assert.equal(genreOf({ title: 'Rire en Scène', tags: 'Festival;Humour;Théâtre' }), 'scene');
  assert.equal(genreOf({ title: 'Le Mois du doc : projection', tags: 'Ecrans;Festival' }), 'cine');
  assert.equal(genreOf({ title: 'Sur les pas de Victor Hugo', tags: 'Balade urbaine;Histoire;Loisirs' }), 'balade');
  assert.equal(genreOf({ title: 'Livres en Tête', tags: 'Festival;Littérature' }), null, 'pas d\'indice : pas de genre');
  assert.equal(genreOf({ title: 'Les Meneuses fêtent leur un an', tags: '' }), null, '« fêtent » n\'est pas une fête');
  assert.equal(genreOf({ title: 'Bals d\'époque', tags: '' }), 'fete');
  assert.equal(tagGenre('Danse;Spectacle musical;Théâtre'), null, 'deux genres : on se rabat sur le titre');
  assert.equal(tagGenre('Concert;Spectacle musical'), 'musique');
});
