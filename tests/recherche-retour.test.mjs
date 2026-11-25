// v467 : « + Ajouter → Avec un nom ou une adresse » montrait « ← openAddChoice » (nom interne de la fonction) et un retour sans effet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('le retour de la recherche par nom passe par backBtn (nom affiché, bouton actif)', () => {
  assert.ok(!app.includes("info, out, back ? foot(el('button', { type: 'button', class: 'btn', onclick: back.fn }"));
  assert.match(app, /info, out, back \? foot\(backBtn\(back\)\) : null\)/);
});
