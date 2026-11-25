// Sorties, haut de la page (mes choix 1A 2A 3A du 25 nov. : « Tout conseillé ») :
// 1A Dehors / À l'abri sur la ligne de Chercher ; 2A loin (plus de 3 h à pied, v217) : les km seuls ; 3A Mes salles suit le filtre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passWhere } from '../js/events.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const body = (name) => {
  const start = app.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `${name} existe`);
  const next = app.slice(start + 10).search(/^(async )?function /m);
  return app.slice(start, next < 0 ? undefined : start + 10 + next);
};

test('1A : Dehors et À l\'abri sont sur la ligne de Chercher, avec un mot visible en Grand et Très grand', () => {
  const ev = body('openEvents');
  assert.match(ev, /class: 'ev-findline'/);
  assert.match(ev, /ev-findline[\s\S]{0,400}ev-wherebox/, 'les puces sont dans la ligne de Chercher');
  assert.match(ev, /'aria-label': `\$\{label\}/, 'chaque puce garde son nom pour TalkBack');
  assert.match(ev, /Seulement les sorties dehors/);
  assert.match(css, /\.ev-where-label \{ display: none; \}/);
  assert.match(css, /:root:is\(\[data-text="grand"\], \[data-text="tresgrand"\]\) \.ev-where-label \{ display: inline; \}/);
});
