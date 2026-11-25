// v506 (ma réponse 10 A du 25 nov.) : en mode crise Canicule, « Lieux frais près de moi » en haut d'Autour de moi ;
// la recherche donne le lieu frais (îlots de fraîcheur de la Ville) même sous 28° ; Préparer hors ligne les garde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('mode Canicule : lieux frais en haut d\'Autour de moi, même sous 28°, gardés hors ligne', () => {
  assert.match(app, /crisis\.k === 'canicule' \? el\('div', \{ class: 'menu' \}, row\('trees', 'Lieux frais près de moi', 'Fontaine, toilettes, lieu frais', nearestPratique\)\) : null/);
  assert.match(app, /if \(meteo\?\.temp >= 28 \|\| crisis\?\.k === 'canicule'\) \{ showPratique\(/);
  assert.match(app, /loadRatpToilets\(\), loadPratique\('fraisLieux'\), loadPratique\('fraisParcs'\)\]\)/);
});
