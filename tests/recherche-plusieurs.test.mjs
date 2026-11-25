// v248 : « Sur ta carte » dans les résultats de « Avec un nom ou une adresse » (myPlaceFor) et retour aux résultats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { myPlaceFor } from '../js/explore.js';

const at = (lat, lng, extra) => ({ id: 'p' + Math.random(), lat, lng, ...extra });
// 1e-4 de latitude ≈ 11 m
test('même nom à moins de 60 m : sur ta carte ; à 70 m : non', () => {
  const p = at(48.86, 2.34, { name: 'Galerie Templon' });
  assert.equal(myPlaceFor([p], { name: 'galerie templon', lat: 48.8604, lng: 2.34 }), p);
  assert.equal(myPlaceFor([p], { name: 'Galerie Templon', lat: 48.86063, lng: 2.34 }), null);
});
test('un voisin du même immeuble avec un autre nom n\'est pas « sur ta carte »', () => {
  const p = at(48.86, 2.34, { name: 'Boulangerie Paul' });
  assert.equal(myPlaceFor([p], { name: 'Pharmacie du Louvre', lat: 48.86, lng: 2.34 }), null);
});
test('nom contenu dans l\'autre : seulement à moins de 30 m et 6 lettres au moins', () => {
  const p = at(48.86, 2.34, { name: 'Monoprix' });
  assert.equal(myPlaceFor([p], { name: 'Monoprix Opéra', lat: 48.8602, lng: 2.34 }), p);
  assert.equal(myPlaceFor([p], { name: 'Monoprix Opéra', lat: 48.8604, lng: 2.34 }), null);
  const c = at(48.86, 2.34, { name: 'Café' });
  assert.equal(myPlaceFor([c], { name: 'Café de Flore', lat: 48.86, lng: 2.34 }), null);
});
test('une adresse : même adresse enregistrée à moins de 60 m', () => {
  const p = at(48.86, 2.34, { name: 'Chez Léa', address: '12 Rue de Rivoli 75004 Paris' });
  assert.equal(myPlaceFor([p], { label: '12 rue de Rivoli 75004 Paris', type: 'housenumber', lat: 48.8601, lng: 2.34 }), p);
  assert.equal(myPlaceFor([p], { label: '14 Rue de Rivoli 75004 Paris', type: 'housenumber', lat: 48.8601, lng: 2.34 }), null);
});
test('rien sans position ni nom, et le plus proche gagne', () => {
  const a = at(48.86, 2.34, { name: 'Musée' }); const b = at(48.8603, 2.34, { name: 'Musée' });
  assert.equal(myPlaceFor([b, a], { name: 'Musée', lat: 48.86, lng: 2.34 }), a);
  assert.equal(myPlaceFor([a], { name: '', lat: 48.86, lng: 2.34 }), null);
  assert.equal(myPlaceFor([a], { name: 'Musée' }), null);
  assert.equal(myPlaceFor(undefined, { name: 'Musée', lat: 48.86, lng: 2.34 }), null);
});
test('la fiche venue d\'une recherche revient aux résultats après Enregistrer et Annuler (liste et ronds)', () => {
  const s = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(s, /draft\.onSaved\) draft\.onSaved\(created\)/);
  // v468 : `done` = toList, sauf depuis Lieux du jour (le lieu enregistré revient coché pour aujourd'hui)
  assert.match(s, /const done = saved \?\? toList;/);
  assert.equal((s.match(/onCancel: toList, onSaved: done/g) ?? []).length, 2);
  assert.match(s, /onCancel: again, onSaved: saved \?\? again/);
});
