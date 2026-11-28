// v370 : une petite image à droite du titre de Sorties allumait « Photos dans Sorties ».
// v560 (mon choix A du 28 nov.) : le « ? » (aide de Sorties) prend sa place ; le réglage reste dans Réglages → Autres réglages → Sorties.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');
const f = app.slice(app.indexOf('async function openEvents('), app.indexOf('async function openEvents(') + 30000);

test('Sorties : le « ? » à la place de l\'image Photos ; Photos dans Sorties reste un réglage', () => {
  assert.doesNotMatch(f, /title-photo/);
  assert.match(f, /class: 'title-maj title-help'[^\n]*onclick: \(\) => openSortiesHelp\(\)/);
  assert.match(app, /evThumbs/); // le réglage existe toujours
});

test('l\'icône pleine existe', () => {
  assert.match(icons, /"image-full": "<rect [^>]*fill=\\"currentColor\\"/);
});
