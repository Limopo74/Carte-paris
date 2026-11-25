// v437 (mon choix A du 25 nov.) : « Partir de ma position » dans Nouveau parcours, tant qu'il n'y a aucune étape.
// Rien d'automatique : ouvrir Un parcours ne demande pas la position et ne pose aucune étape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const body = (name) => { const i = app.indexOf(`function ${name}(`); assert.ok(i > 0, name); return app.slice(i, app.indexOf('\n}\n', i)); };

test('le bouton : seulement sans étape, dans un parcours (ni circuit, ni étapes d\'un circuit), sous les boutons, avant la barre du bas', () => {
  const show = body('showTrace');
  const line = show.split('\n').find((l) => l.includes("'Partir de ma position'")) ?? '';
  assert.match(line, /!n && !cm && !nc \? el\('button', \{ type: 'button', class: 'btn', onclick: traceFromHere \}, ico\('locate-fixed'\)/);
  const at = show.indexOf("'Partir de ma position'");
  assert.ok(at > show.indexOf("'Retirer cette étape'"), 'sous la zone de l\'étape choisie : rien ne bouge au-dessus');
  assert.ok(at < show.indexOf('foot('), 'avant la barre du bas');
});

test('ouvrir Un parcours ne demande pas la position et ne pose rien', () => {
  const open = body('openNewRoute');
  assert.ok(!/locate|freshHere|traceTap|traceFromHere/.test(open), open);
});

test('traceFromHere : message d\'attente, rien si une étape a été touchée pendant la recherche, hors de Paris dit', () => {
  const f = body('traceFromHere');
  assert.ok(f.indexOf("waitToast('Recherche de ta position…')") < f.indexOf('await locate()'));
  assert.ok(f.includes('if (trace !== t || view !== \'trace\' || t.steps.length) { hideToast(); return; }'));
  assert.ok(f.includes("toast('Tu es hors de Paris : le plan des rues ne couvre que Paris.')"));
  assert.ok(f.indexOf('onPlan(streets, pos)') < f.indexOf('traceTap(pos.lat, pos.lng)'));
});

test('Nouveautés : la ligne en tête, 10 au plus', () => {
  const i = app.indexOf("['sparkles', 'Nouveautés', [");
  const block = app.slice(i, app.indexOf(']],', i));
  const lines = block.split('\n').filter((l) => l.trim().startsWith("'{"));
  assert.equal(lines.length, 10);
  // v451 : sa ligne des Nouveautés est sortie (10 au plus) ; l'Aide de Mes parcours le dit toujours
  assert.match(app, /\*\*Mes parcours\*\* : [^\n]*avant la première, « Partir de ma position/);
});
