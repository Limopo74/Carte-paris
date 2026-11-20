// v258 : « Prise en main » — la première rubrique de l'Aide, fermée comme les autres (choix B), 8 lignes au plus ;
// un bouton « Prise en main » dans la fenêtre « Ta carte est vide » ouvre l'Aide sur elle, déjà ouverte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICON_SVG } from '../js/icons.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const help = app.slice(app.indexOf('const HELP = ['), app.indexOf('/** Une ligne d\'aide'));
const first = help.slice(help.indexOf('['), help.indexOf("  ['map', 'Se repérer'"));

test('la Prise en main est la première rubrique de l\'Aide, 8 lignes au plus', () => {
  assert.match(first, /\['hand', 'Prise en main', \[/);
  const lines = first.match(/\n {4}'/g) ?? [];
  assert.ok(lines.length >= 5 && lines.length <= 8, `${lines.length} lignes`);
});

test('chaque ligne tient en peu de mots (moins de 230 signes)', () => {
  for (const l of first.split('\n').filter((x) => x.startsWith("    '"))) assert.ok(l.length < 230, l);
});

test('ses icônes existent', () => {
  assert.ok(ICON_SVG.hand);
  for (const [, n] of first.matchAll(/\{([a-z0-9-]+)\}/g)) assert.ok(ICON_SVG[n], n);
});

test('la Prise en main est fermée, sauf depuis « Ta carte est vide »', () => {
  assert.match(app, /const openFirst = first === true;/);
  assert.match(app, /el\('details', \{ class: 'help-item', open: openFirst && i === 0 \}/);
  assert.match(app, /row\('circle-help', 'Aide de l\\'appli', [^\n]*, openHelp\)/, 'depuis les Réglages : l\'événement du clic n\'ouvre rien'); // v303 : « Aide de l'appli »
});

test('la fenêtre « Ta carte est vide » propose la Prise en main', () => {
  const vide = app.slice(app.indexOf("openSheet('Ta carte est vide'"), app.indexOf("{ name: 'vide' }"));
  assert.match(vide, /onclick: \(\) => openHelp\(true\) \}, ico\('hand'\), 'Prise en main'/);
});

test('ce qu\'elle cite existe dans l\'appli', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Autour de moi/);
  assert.match(html, /Ajouter/);
  for (const mot of ['Y aller', 'Boussole', 'Métro', 'Mes stations', 'Sauvegarde', 'Mon planning', 'Où suis-je']) assert.ok(app.split(mot).length > 3, mot);
});
