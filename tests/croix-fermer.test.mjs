// v453 (mes choix 1A 2A du 25 nov.) : la croix Fermer de la feuille était le caractère ✕, fin et pâle au soleil selon la police.
// Elle devient l'icône dessinée « x », trait 3, 24 px, en encre (sans couleur ni fond : CHARTE « la couleur signale »). Même place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('la croix Fermer est dessinée au trait épais, à la même place', () => {
  assert.match(app, /document\.getElementById\('sheetClose'\)\.replaceChildren\(ico\('x', \{ stroke: 3 \}\)\);/);
  assert.match(css, /#sheetClose \.ico svg \{ width: 24px; height: 24px; \}/);
  // ni couleur ni fond : le bouton garde le contour encre de l'en-tête
  assert.doesNotMatch(css, /(?<!\()#sheetClose[^{)]*\{[^}]*(background|color)\s*:/);
  // ⌄ reste juste avant la croix
  assert.match(app, /document\.getElementById\('sheetClose'\)\.before\(sheetMin\);/);
});
