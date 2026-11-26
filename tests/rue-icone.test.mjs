// v542 (mon choix 2 du 26 nov., sur visuel) : la goutte d'une rue d'intérêt montre le symbole rue, la couleur de sa catégorie reste.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');

test('goutte d\'une rue : symbole rue, couleur de la catégorie', () => {
  const f = app.slice(app.indexOf('function renderMarkers('), app.indexOf('/* Miniatures des notes'));
  assert.match(f, /p\.line \? svgIcon\('git-commit-horizontal'/);
  assert.match(f, /style="background:\$\{c\.color\}/);
  assert.match(icons, /^"git-commit-horizontal": /m);
});

test('même symbole que le filtre et le bouton « Une rue d\'intérêt »', () => {
  assert.match(app, /sw\(Boolean\(state\.showRues\), 'git-commit-horizontal'/);
  assert.match(app, /ico\('git-commit-horizontal'\), 'Une rue d\\'intérêt'/);
});
