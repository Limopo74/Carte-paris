// v334 (mon choix 2A du 20 nov.) : Confidentialité aussi dans l'Aide, tout en bas, avec le même texte que Réglages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICON_SVG } from '../js/icons.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Aide : la rubrique Confidentialité est la dernière (elle ne pousse rien)', () => {
  const help = app.slice(app.indexOf('const HELP = ['), app.indexOf('\n];\n', app.indexOf('const HELP = [')));
  const titles = [...help.matchAll(/^ {2}\['[a-z-]+', '([^']+(?:\\'[^']*)*)'/gm)].map((m) => m[1]);
  assert.equal(titles.at(-1), 'Confidentialité');
  assert.equal(titles.at(-2), 'Nouveautés');
  assert.match(help, /\['lock', 'Confidentialité', \[\.\.\.PRIVACY_LINES, USAGE_PRIVACY\]\]/);
  assert.ok(ICON_SVG.lock);
});

test('un seul texte : Réglages le montre d\'un bloc, depuis la même liste', () => {
  assert.match(app, /el\('p', \{ class: 'help' \}, PRIVACY_LINES\.join\(' '\)\)/);
  assert.equal((app.match(/Tes lieux, tes photos et ta position restent sur ce téléphone/g) ?? []).length, 1);
  assert.match(app, /el\('p', \{ class: 'help' \}, USAGE_PRIVACY\)/);
});

test('v336 (mon choix 2A du 21 nov.) : dans l\'Aide, aucune ligne de Confidentialité de plus de 300 signes', () => {
  const block = app.slice(app.indexOf('const PRIVACY_LINES = ['), app.indexOf('];', app.indexOf('const PRIVACY_LINES = [')));
  const lines = [...block.matchAll(/^ {2}'(.*)',$/gm)].map((m) => m[1].replace(/\\'/g, "'"));
  assert.ok(lines.length >= 12);
  for (const l of lines) assert.ok(l.length <= 300, `${l.length} signes : ${l.slice(0, 60)}…`);
  assert.match(lines.join(' '), /les fonds de carte \(OpenStreetMap, CARTO, OpenStreetMap France ou l'IGN .* et Vélib' \(aucune position envoyée\),/); // v498 : la Seine suit
  assert.match(lines.join(' '), /la hauteur de la Seine à Austerlitz \(Hub'Eau, eaufrance, aucune position envoyée ; seulement si tu l'allumes dans la pastille ou en mode crise Crue\)\./); // v382 : l'IGN
});
