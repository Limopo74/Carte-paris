// v212 : Chercher une sortie depuis Sorties — l'agenda de la semaine, seulement ce que montre l'onglet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIND_LABEL, findOutings } from '../js/art.js';

const d = (j) => new Date(Date.UTC(2026, 10, 19 + j, 12));
const ev = (title, extra = {}) => ({ title, place: 'Square Montholon', tags: '', lat: 48.88, lng: 2.34, free: false, end: d(1), ...extra });
const ITEMS = [
  ev('Concert de jazz au square', { tags: 'Concerts -> Jazz', end: d(3) }),
  ev('Jazz manouche : trio', { free: true, place: 'Sunset-Sunside', end: d(2) }),
  ev('Django Reinhardt, swing de Paris', { tags: 'Expositions -> Musique -> Jazz', free: true, place: 'Philharmonie de Paris', end: d(60) }),
  ev('Exposition photo : Paris la nuit', { tags: 'Expositions -> Photographie', place: 'Galerie du 9e', end: d(4) }),
  ev('Concert de jazz au square', { tags: 'Concerts -> Jazz', end: d(5) }), // même titre, même lieu : un seul
];

test('un bouton pour Tout, Gratuit et Expos, aucun pour Navigo', () => {
  assert.deepEqual(Object.keys(FIND_LABEL), ['all', 'free', 'art']);
  assert.equal(FIND_LABEL.navigo, undefined);
  assert.equal(FIND_LABEL.free, 'Chercher du gratuit');
  assert.equal(FIND_LABEL.art, 'Chercher une expo');
});

test('Tout : tout l\'agenda, sans doublon, celles qui finissent d\'abord', () => {
  const r = findOutings(ITEMS, 'jazz', 'all');
  assert.deepEqual(r.map((e) => e.title), ['Jazz manouche : trio', 'Concert de jazz au square', 'Django Reinhardt, swing de Paris']);
});

test('Gratuit : seulement le gratuit ; Expos : seulement les expos', () => {
  assert.deepEqual(findOutings(ITEMS, 'jazz', 'free').map((e) => e.title), ['Jazz manouche : trio', 'Django Reinhardt, swing de Paris']);
  assert.deepEqual(findOutings(ITEMS, 'jazz', 'art').map((e) => e.title), ['Django Reinhardt, swing de Paris']);
  assert.deepEqual(findOutings(ITEMS, 'photo', 'art').map((e) => e.title), ['Exposition photo : Paris la nuit']);
  assert.equal(findOutings([ev('Bal', { free: 'oui' })], 'bal', 'free').length, 0, 'gratuit seulement quand c\'est sûr');
});

test('cherche aussi le lieu, sans accents ni majuscules ; moins de 3 lettres : rien', () => {
  assert.equal(findOutings(ITEMS, 'PHILHARMONIE', 'all').length, 1);
  assert.equal(findOutings(ITEMS, 'galérie du 9e', 'all').length, 1);
  assert.equal(findOutings(ITEMS, 'ja', 'all').length, 0);
  assert.deepEqual(findOutings(null, 'jazz'), []);
});

test('Sorties : le bouton suit FIND_LABEL (pas de bouton dans Navigo) et la loupe du haut cherche de la même façon', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /FIND_LABEL\[mode\] \? el\('button', \{ type: 'button', class: 'btn c-disc ev-findrow'/);
  assert.match(app, /const found = findOutings\(weekCache\?\.items, q\);/);
  assert.match(app, /weekLoading \?\?=/, 'un seul téléchargement de la semaine à la fois');
});
