// v354 (ma demande du 21 nov., mon choix 2A) : une petite roue à côté du titre « Mes Vu en passant » ouvre Réglages → Vu en passant.
// Exception : pas de règle générale (avis donné le 21 nov. : titres trop étroits, petite icône mal vue au soleil).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mosaic = app.slice(app.indexOf('function openSeenPhotos('), app.indexOf('function openSeenPhotos(') + 6000);

test('La roue du titre de Mes Vu en passant ouvre Réglages → Vu en passant', () => {
  assert.match(mosaic, /el\('span', \{ class: 'title-tail' \}, 'en passant',/);
  assert.match(mosaic, /class: 'title-maj', 'aria-label': 'Réglages de Vu en passant'[^\n]*onclick: \(\) => openSettings\('vu'\) \}, ico\('settings', \{ size: 18 \}\)/);
});
