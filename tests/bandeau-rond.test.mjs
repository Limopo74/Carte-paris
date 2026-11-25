// v450 (ma demande du 25 nov.) : Sorties → Carte, page d'un lieu ouverte depuis le bandeau : toucher un autre rond
// ouvrait seulement le bandeau, caché sous la page ; la page restait sur la première sortie. Le rond touché ouvre sa page.
// Vaut pour tous les bandeaux (showPeek) : Sorties, Gratuit, Expos, Navigo, Grands lieux, Art dans la rue, Rentrer…
// L'essai dans la vraie appli (Playwright, 360 px) est décrit dans claude/reprise-v450.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const peek = app.slice(app.indexOf('function showPeek('), app.indexOf('/** Une galerie touchée sur la carte'));

test('un rond du bandeau touché, page ouverte : sa page s\'ouvre, avec le retour vers le bandeau sur ce rond', () => {
  const click = peek.match(/\.on\('click', \(\) => \{(.*?)\}\)\n/);
  assert.ok(click, 'le rond du bandeau a un appui');
  assert.match(click[1], /go\(k, false\)/, 'le bandeau suit le rond');
  assert.match(click[1], /if \(!sheet\.hidden\) \{ navStack = \[\]; open\(items\[k\], back2\(k\)\); \}/, 'page ouverte : la page du rond touché, à la place de la page d\'avant (le retour ramène au bandeau)');
});
