// v427 (mes choix 1A 2A 3A 4A du 25 nov. : « en appuyant sur Tout, désactiver l'affichage de tous les lieux ») :
// Tout déjà allumé masque mes lieux sur la carte seule, le temps de la session ; une étiquette le dit ; la fiche ouverte garde sa goutte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Tout : allumé quand tout est affiché, un appui masque, sinon il remet tout', () => {
  assert.match(app, /const allShown = \(\) => !filterCats\.size && !favOnly && !hideAll;/);
  const fn = app.match(/function pressAll\(\) \{([\s\S]*?)\n\}/);
  assert.ok(fn, 'pressAll absente');
  assert.match(fn[1], /if \(allShown\(\)\) \{ hideAll = true;/);
  assert.match(fn[1], /else \{ filterCats\.clear\(\); favOnly = false; hideAll = false;/);
  assert.match(app, /make: \(\) => chip\('Tout', allShown\(\), pressAll/);
});

test('la carte seule : onMap vide (sauf la fiche ouverte), visible() ne change pas', () => {
  assert.match(app, /const onMap = \(\) => \(hideAll \? state\.points\.filter\(\(p\) => String\(p\.id\) === hideShown\)/);
  const vis = app.match(/const visible = \(\) => state\.points\.filter\(\(p\) =>([\s\S]*?)\);\n/);
  assert.ok(vis && !/hideAll/.test(vis[1]), 'Autour de moi, la loupe et les listes gardent mes lieux');
  assert.match(app, /if \(hideAll && id !== hideShown\) \{ hideShown = id; renderMarkers\(\); \}/);
});

test('le temps de la session : jamais gardé', () => {
  assert.match(app, /^let hideAll = false;$/m);
  assert.doesNotMatch(app, /state\.hideAll/);
});

test('une catégorie ou Favoris sort du masquage', () => {
  assert.match(app, /function toggleCat\(id\) \{\n  hideAll = false;/);
  assert.equal((app.match(/hideAll = false; favOnly = !favOnly;/g) || []).length, 2);
});

test('l\'étiquette sous la barre le dit et remet les lieux', () => {
  assert.match(app, /\(hideAll \? \{ text: 'Lieux masqués · Afficher', act: 'showall' \} : null\)/);
  assert.match(app, /n\?\.act === 'showall'\) pressAll\(\);/);
});
