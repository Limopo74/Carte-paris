// Mots des Réglages (v283 et suivantes) : un bouton dit ce qu'il fait, rien de plus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Boutons de la carte (v283) : le bouton de remise ne promet pas « Tout » (le côté de l\'écran et l\'essentiel restent)', () => {
  assert.ok(!app.includes("'Tout remettre comme au début'"), 'ancien mot');
  const i = app.indexOf("'Boutons comme au début'");
  assert.ok(i > 0, 'nouveau mot, comme « Barre du haut comme au début »');
  const before = app.slice(app.lastIndexOf("el('button'", i), i);
  assert.ok(!/toolsSide\s*=/.test(before), 'le côté de l\'écran n\'est pas touché');
  assert.ok(!/essentials\s*=/.test(before), 'l\'essentiel n\'est pas touché');
});
