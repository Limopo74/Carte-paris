// v361 : dans Grands lieux, Ouvert tard et Expos de la semaine, la flèche › a sa propre colonne (elle ne tombe plus sous le texte),
// et la petite ligne de Grands lieux se coupe en deux : l'adresse, puis « 5 rendez-vous · 3,0 km ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('plis de Sorties : la flèche dans sa colonne, jamais à la ligne', () => {
  assert.match(css, /\.week-arr summary \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/);
  assert.match(css, /\.week-arr summary::after \{[^}]*grid-column: 2;/);
  assert.doesNotMatch(css, /\.week-arr summary \{[^}]*flex-wrap: wrap/);
});

test('Grands lieux : « rendez-vous » seul, sur sa propre ligne', () => {
  const f = app.slice(app.indexOf('async function openArtPlaces'), app.indexOf('const DAY_NAMES'));
  assert.doesNotMatch(f, /rendez-vous dans l\\'agenda/);
  assert.match(f, /p\.address \? el\('span', \{ class: 'week-arr-sub' \}, p\.address\) : null/);
});

test('Grands lieux : « rien cette semaine », petites lignes à la taille du texte, icône du genre en haut', () => {
  const f = app.slice(app.indexOf('async function openArtPlaces'), app.indexOf('const DAY_NAMES'));
  assert.match(f, /'rien cette semaine'/);
  assert.match(css, /\.week-arr-sub \{[^}]*font-size: var\(--t14\)/);
  assert.match(css, /\.ev-main > \.genre \{[^}]*align-self: start;/);
});
