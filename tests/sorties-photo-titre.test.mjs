// v369 : en haut de Sorties, une petite image à droite du titre allume ou éteint « Photos dans Sorties » ;
// image pleine = photos affichées, image vide = icône du genre. Pas dans l'onglet Navigo (ses lignes n'ont pas de photo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');
const f = app.slice(app.indexOf('async function openEvents('), app.indexOf('async function openEvents(') + 30000);

test('Sorties : l\'image du titre change le même réglage que Autres réglages', () => {
  assert.match(f, /class: 'title-maj title-photo', 'aria-pressed': String\(photosOn\)/);
  assert.match(f, /state\.evThumbs = !photosOn; persist\(\)/);
  assert.match(f, /ico\(photosOn \? 'image-full' : 'image'/);
  assert.match(f, /mode === 'navigo' \? null/);
});

test('l\'icône pleine existe', () => {
  assert.match(icons, /"image-full": "<rect [^>]*fill=\\"currentColor\\"/);
});
