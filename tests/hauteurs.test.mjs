// Hauteurs de fenêtre (v332 trois, v333 quatre avec « basse », mes choix du 20 nov.) : js/hauteurs.js et son emploi dans app.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sheetStep } from '../js/hauteurs.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

// écran de 740 px : réduite 70, basse 33 % = 244, moitié 58 % = 429, grande 85 % = 629
const H = { mini: 70, low: 244, mid: 429, tall: 629 };

test('hauteurs : un petit mouvement ne change rien', () => {
  assert.equal(sheetStep(20, 'mid', H, 'mid'), 'mid');
  assert.equal(sheetStep(-20, 'mid', H, 'mid'), 'mid');
  assert.equal(sheetStep(40, 'tall', H, 'tall'), 'tall');
});

test('hauteurs : un court glissement passe à la hauteur voisine', () => {
  assert.equal(sheetStep(60, 'tall', H, 'tall'), 'mid', 'grande vers le bas : moitié');
  assert.equal(sheetStep(60, 'mid', H, 'mid'), 'low', 'moitié vers le bas : basse');
  assert.equal(sheetStep(60, 'low', H, 'low'), 'mini', 'basse vers le bas : réduite');
  assert.equal(sheetStep(-40, 'low', H, 'low'), 'mid', 'basse vers le haut : moitié');
  assert.equal(sheetStep(-40, 'mid', H, 'mid'), 'tall', 'moitié vers le haut : grande');
  assert.equal(sheetStep(-40, 'tall', H, 'tall'), 'tall', 'déjà en haut');
  assert.equal(sheetStep(80, 'mini', H, 'mid'), 'mini', 'déjà en bas');
});

test('hauteurs : un long glissement va à la hauteur la plus proche du doigt', () => {
  assert.equal(sheetStep(520, 'tall', H, 'tall'), 'mini', 'de grande jusqu\'en bas : réduite');
  assert.equal(sheetStep(-520, 'mini', H, 'mid'), 'tall', 'de réduite jusqu\'en haut : grande');
  assert.equal(sheetStep(-340, 'mini', H, 'tall'), 'mid', 'de réduite à mi-écran : moitié');
  assert.equal(sheetStep(-170, 'mini', H, 'tall'), 'low', 'de réduite au tiers : basse');
  assert.equal(sheetStep(380, 'tall', H, 'tall'), 'low', 'de grande au tiers : basse');
});

test('hauteurs : réduite, un court glissement vers le haut rend la hauteur d\'avant', () => {
  assert.equal(sheetStep(-40, 'mini', H, 'tall'), 'tall');
  assert.equal(sheetStep(-40, 'mini', H, 'mid'), 'mid');
});

test('hauteurs : une page courte n\'a que deux hauteurs (un seul glissement pour la réduire)', () => {
  const court = { mini: 70, low: 200, mid: 200, tall: 200 }; // contenu de 200 px : basse, moitié et grande sont pareilles
  assert.equal(sheetStep(60, 'tall', court, 'tall'), 'mini');
  assert.equal(sheetStep(60, 'mid', court, 'mid'), 'mini');
  assert.equal(sheetStep(-40, 'mid', court, 'mid'), 'mid');
  assert.equal(sheetStep(-40, 'mini', court, 'tall'), 'tall');
});

test('hauteurs : une page moyenne a trois hauteurs', () => {
  const moyen = { mini: 70, low: 244, mid: 300, tall: 300 }; // contenu de 300 px
  assert.equal(sheetStep(60, 'tall', moyen, 'tall'), 'low');
  assert.equal(sheetStep(-40, 'low', moyen, 'low'), 'mid', 'le groupe garde le nom « moitié »');
  assert.equal(sheetStep(-40, 'mini', moyen, 'tall'), 'tall', 'réduite : la hauteur d\'avant');
});

test('hauteurs : la barre du titre et l\'ouverture d\'un écran', () => {
  assert.match(app, /import \{ sheetStep, SHARE \} from '\.\/hauteurs\.js'/);
  assert.match(app, /sheetStep\(/, 'le glissement passe par sheetStep');
  assert.match(app, /userSize/, 'un écran redessiné garde la hauteur choisie au doigt');
  assert.match(css, /\.sheet\.low\b[^{]*\{[^}]*max-height: 33vh/, 'la hauteur basse');
  assert.ok(sw.includes("'js/hauteurs.js'"), 'le module est dans le cache hors ligne');
});
