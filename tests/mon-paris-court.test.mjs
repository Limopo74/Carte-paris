// v445 (mes choix 1A 2A 3B 4A du 25 nov.) : Mon Paris tient sur un écran ; Mes arrondissements et Mes chiffres ont leur page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const body = (name) => { const i = app.indexOf(`function ${name}(`); return app.slice(i, app.indexOf('\n}\n', i)); };

test('Mon Paris : planning, calendrier, puis Mes arrondissements et Mes chiffres ; ni grille ni chiffres dans la page', () => {
  const b = body('openMyParis');
  assert.match(b, /\[ico\('map'\), ' Mon Paris'\]/);
  const cal = b.indexOf('journalCalendar()'), arr = b.indexOf("'Mes arrondissements'"), st = b.indexOf("'Mes chiffres'");
  assert.ok(b.indexOf("'Mon planning'") < cal && cal < arr && arr < st);
  assert.doesNotMatch(b, /myStats\(\)|arr-grid/);
});

test('Mes arrondissements : une case touchée ouvre ses lieux, et la liste revient à Mes arrondissements', () => {
  const b = body('openMyArr');
  assert.match(b, /el\('button', \{ type: 'button', class: `arr l\$\{level\}`/);
  assert.match(b, /pickArr\(Number\(n\), self\)/);
  assert.match(body('openArrList'), /foot\(backBtn\(arrListBack \?\? openFilters\)\)/);
  assert.match(app, /onclick: \(\) => pickArr\(a, null\)/, 'depuis Filtres, le retour reste Filtres');
});

test('Mes chiffres : seulement ce qui suit la période, accord au singulier, sans le doublon des arrondissements', () => {
  const b = body('myStats');
  assert.doesNotMatch(b, /'favoris'|étoiles en moyenne|Lieux par catégorie|arrondissement/);
  assert.match(b, /ps\.added > 1 \? 'ajoutés' : 'ajouté'/);
  assert.match(b, /statsDays = n; openMyStats\(\)/);
  assert.match(b, /Ce que j\\'utilise le plus/, 'mon choix 4A : il reste');
});
