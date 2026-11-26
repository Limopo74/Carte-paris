// v537 (mon choix A du 26 nov.) : toucher une crise ouvre tout de suite Autour de moi, en grand ;
// tant que le mode est allumé, Autour de moi s'ouvre toujours en grand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('choisir une crise ouvre Autour de moi ; en mode crise, Autour de moi en grand', () => {
  const page = app.slice(app.indexOf('function openCrisis('), app.indexOf('function crisisBlock()'));
  assert.match(page, /if \(!on\) setCrisis\(c\.k\); closeSheetThen\(openNear\);/);
  assert.match(app, /\{ name: 'near', again: nearAgain, tall: Boolean\(crisis\) \}/);
  assert.match(app, /\*\*Mode crise\*\*[^\n]*s\\'ouvre tout de suite, en grand/, 'Aide');
});
