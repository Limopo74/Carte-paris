// v387 (ma demande du 24 nov. : « corrige les deux défauts ») : une rue d'intérêt n'a pas « Déplacer le point » (le trait restait en place) ;
// la page des fonds (petit rond) tient sans défiler, en Normal comme en Très grand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('rue d\'intérêt : pas de « Déplacer le point »', () => {
  assert.ok(app.includes("p.line ? null : row('move', 'Déplacer le point'"));
});

test('fonds : vignettes basses et page haute', () => {
  assert.ok(app.includes("el('div', { class: 'style-grid compact' }"));
  assert.ok(app.includes("{ name: 'style-picker', again: openStylePicker, tall: true }"));
  assert.match(css, /\.style-grid\.compact \.style-prev \{ height: 36px; \}/);
});
