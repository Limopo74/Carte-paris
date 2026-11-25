// v446 (mes choix 1A 2A 3A du 25 nov.) : les grandes fonctions de Bienvenue suivent la colonne de boutons d'une appli neuve,
// la Prise en main aussi ; plus de « Rentrer dans ⋯ Plus » : au départ, Rentrer est dans la colonne.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRESH_TOOLS } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const shown = FRESH_TOOLS.mapTools.filter((t) => !FRESH_TOOLS.hiddenTools.includes(t) && !FRESH_TOOLS.moreTools.includes(t));

test('Bienvenue décrit chaque bouton de la colonne d\'une appli neuve, en 6 lignes au plus', () => {
  assert.match(app, /el\('div', \{ class: 'help-list' \}, \.\.\.welcomeLines\(\)\.map/);
  const table = app.slice(app.indexOf('const WELCOME_TOOL_LINES = {'), app.indexOf('function welcomeLines()'));
  for (const t of shown) assert.match(table, new RegExp(`\\b${t}: '`), t);
  assert.deepEqual(shown, ['locate', 'sorties', 'planning', 'vu', 'home'], 'la colonne d\'une appli neuve a changé : revoir Bienvenue et la Prise en main');
  // 4 lignes de boutons (Sorties et Mon planning sur une ligne) + Autour de moi + Ajouter
  assert.match(app, /if \(out\.length === 4\) break;/);
});

test('Bienvenue ne nomme plus « Où suis-je » le bouton Ma position (c\'est un bouton d\'Autour de moi)', () => {
  const page = app.slice(app.indexOf("1: ['Bienvenue', ["), app.indexOf("2: ['Taille du texte', ["));
  assert.doesNotMatch(page, /Où suis-je/);
});

test('la Prise en main suit la colonne et cite Vu en passant ; Rentrer n\'est plus dit « dans ⋯ Plus »', () => {
  const first = app.slice(app.indexOf("['hand', 'Prise en main', ["), app.indexOf("  ['map', 'Se repérer'"));
  const at = (s) => first.indexOf(s);
  for (const s of ['**Ma position**', '**Sorties**', '**Vu en passant**', '**Rentrer**', '**Autour de moi**']) assert.ok(at(s) > 0, s);
  assert.ok(at('**Ma position**') < at('**Sorties**') && at('**Sorties**') < at('**Vu en passant**') && at('**Vu en passant**') < at('**Rentrer**'));
  assert.doesNotMatch(first, /\(au départ dans ⋯ Plus ; tes stations/); assert.match(first, /\*\*M\*\*, la station la plus proche, est au départ dans ⋯ Plus/);
  assert.doesNotMatch(app, /Rentrer est rangé dans ⋯ Plus/);
});
