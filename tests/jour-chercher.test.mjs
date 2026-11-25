// v468 (mon choix 1A du 25 nov.) : Lieux du jour cherche aussi dans Paris un lieu qui n'est pas encore sur ma carte ; enregistré, il revient coché.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('le bouton apparaît dès qu\'un mot est tapé, sous la liste, et passe par la recherche de la loupe', () => {
  assert.match(app, /fill\(findBox, input\.value\.trim\(\) \? el\('button'[^\n]*`Chercher « \$\{input\.value\.trim\(\)\} » dans Paris`/);
  assert.match(app, /list, more, findBox,/);
  assert.match(app, /openPlaceSearch\(q, true, named\('Lieux du jour', \(\) => openDayPicker\(sel, q\)\), null, \(p\) => \{/);
});

test('le lieu enregistré revient coché, jamais au-delà de 8 ni s\'il est déjà prévu un autre jour', () => {
  assert.match(app, /if \(p && !busy\(p\) && sel\.size < DAY_MAX\) \{ sel\.add\(p\.id\);/);
  assert.match(app, /function openPlaceSearch\(initial = '', autoRun = false, back = null, kept = null, saved = null\)/);
});
