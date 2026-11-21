// v374 (mes choix 1B 2A du 21 nov.) : sur la fiche d'un lieu, l'adresse est juste sous « Aujourd'hui / Métro »,
// avant le commentaire et les boutons Favori, Déjà visité ; le bouton Copier a un cadre de 48 px.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('fiche : l\'adresse vient juste après Aujourd\'hui / Métro, avant le commentaire et les boutons', () => {
  const body = app.slice(app.indexOf("// L'état d'abord (v176)"));
  const f2 = body.indexOf('    facts2,');
  const addr = body.indexOf("p.address ? el('div', { class: 'copy-row' }");
  const note = body.indexOf("p.note ? el('p', { class: 'fiche-lede' }");
  const tog = body.indexOf('    toggles,');
  assert.ok(f2 > 0 && addr > f2 && addr < note && note < tog);
});

test('Copier : un cadre de 48 px, l\'adresse en encre', () => {
  assert.match(css, /\.go-compass\.copy-btn \{[^}]*width: 48px;[^}]*min-height: 48px;[^}]*border: 2px solid/);
  assert.match(css, /\.copy-row > \.where \{ color: var\(--ink\); font-size: var\(--t18\); \}/);
});
