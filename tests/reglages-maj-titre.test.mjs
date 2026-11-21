// v342 (ma demande du 21 nov.) : à côté du titre Réglages, une petite icône met l'appli à jour en 1 appui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('le titre de Réglages porte le bouton, qui lance updateApp', () => {
  const app = src('js/app.js');
  const at = app.indexOf("openSheet([ico('settings'), ' Réglages'");
  assert.ok(at > 0);
  const head = app.slice(at, app.indexOf("el('div', { class: 'menu' }", at));
  assert.match(head, /class: 'title-maj'/);
  assert.match(head, /'aria-label': 'Mettre à jour l\\'appli'/, 'même nom que le bouton de Mise à jour et confidentialité');
  assert.match(head, /onclick: updateApp/);
  assert.match(head, /ico\('rotate-cw'/, 'même icône que l\'étiquette Nouvelle version');
});

test('charte : zone d\'appui d\'au moins 44 px, même petite', () => {
  const css = src('css/style.css');
  const r = /#sheetTitle \.title-maj \{([^}]*)\}/.exec(css);
  assert.ok(r);
  assert.match(r[1], /width: 44px/);
  assert.match(r[1], /height: 44px/);
});
