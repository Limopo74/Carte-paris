// v415 (mes choix 1A 2A 3A 4A du 24 nov.) : + Ajouter rangé en trois groupes titrés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');
const add = app.slice(app.indexOf('function openAddChoice()'), app.indexOf("{ name: 'add', again: openAddChoice }"));

test('ordre : Vu en passant, Un lieu, Un tracé sur la carte, Mes photos', () => {
  const order = ["'Vu en passant'", "'Un lieu'", "'À ma position'", "'Avec un nom ou une adresse'", "'Depuis ma galerie'",
    "'Un tracé sur la carte'", "'Un parcours'", "'Un circuit'", "'Une rue d\\'intérêt'", "'Mes photos'", '`Mes Vu en passant'].map((t) => add.indexOf(t));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), JSON.stringify(order));
  assert.equal((add.match(/class: 'fiche-sec'/g) ?? []).length, 3, 'trois titres');
  assert.doesNotMatch(add, /'Une balade'|'Une rue'\)/, 'les anciens titres sont partis');
});

test('pas de texte gris visible dans + Ajouter : les explications vont dans « Aide »', () => {
  assert.doesNotMatch(add, /class: 'help' \}/);
});

test('une rue d\'intérêt a son icône, plus celle des parcours', () => {
  assert.match(add, /ico\('git-commit-horizontal'\), 'Une rue d\\'intérêt'\)/);
  assert.match(icons, /^"git-commit-horizontal": /m);
  assert.doesNotMatch(app, /ico\('route'\), ' Une rue d\\'intérêt'|\{route\} \*\*[^*]*rue d\\'intérêt/);
});
