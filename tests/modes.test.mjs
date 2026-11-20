// v270 : les modes qui restent allumés d'un écran à l'autre ne doivent jamais tourner sans que rien ne le montre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const body = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));

test('Ma position et direction : masquer son bouton arrête le suivi (GPS et écran allumé), et le message le dit', () => {
  const order = body('function applyToolOrder()', 'applyToolOrder();\n');
  assert.match(order, /if \(following && hidden\.includes\('locate'\)\) stopFollow\(\);/);
  assert.match(app, /\$\{was && !following \? '\. Le suivi de ta position est arrêté\.' : ''\}/);
});

test('Ma position rangée dans ⋯ Plus dit si elle suit (« allumée », aria-pressed)', () => {
  const more = body('function openMore()', 'function closeMore()');
  assert.match(more, /t === 'locate' && following \? 'allumée'/);
  assert.match(more, /'aria-pressed': String\(following\)/);
});

test('Bandeau « Maintenant » : la croix le cache pour la journée seulement (appli restée en mémoire)', () => {
  const tick = body('let markersDay', 'document.addEventListener(\'visibilitychange\'');
  assert.match(tick, /markersDay = new Date\(\)\.toDateString\(\); nowHidden = false;/);
});

test('Nouveau parcours ou nouveau circuit : dès 2 étapes, croix, Annuler et retour du téléphone demandent confirmation (v271, ma réponse 2a)', () => {
  const ask = body('function traceAsk(how)', '\n}\n');
  assert.match(ask, /t\.id \|\| t\.circuit \|\| t\.ask \|\| t\.steps\.length < 2\) return false;/);
  assert.match(app, /addEventListener\('click', \(\) => \{ if \(traceAsk\('close'\)\) return; closeSheet\(\); \}\)/);
  assert.match(app, /onclick: \(\) => \{ if \(!traceAsk\('leave'\)\) leave\(\); \} \}, 'Annuler'\)/);
  const pop = body("window.addEventListener('popstate', () => {\n  if (compassOpen", 'navStack.pop();');
  assert.match(pop, /if \(view === 'trace' && trace\?\.ask\) \{ trace\.ask = null;/);
  assert.match(pop, /if \(traceAsk\('back'\)\)/);
});

test('Après Enregistrer un nouveau parcours, le retour ne rouvre pas le tracé vide (il plantait)', () => {
  assert.match(app, /persist\(\); trace = null;\n    navStack = navStack\.filter\(\(e\) => e\.name !== 'trace'\);/);
});

// v277 (mon choix A du 20 nov.) : le lien Uber ne remplit la destination qu'avec l'appli Uber ; sans elle, le site Uber s'ouvre vide.
test('Uber jusqu\'ici : la petite ligne dit que la destination n\'est remplie que dans l\'appli Uber', () => {
  assert.match(app, /'Appli Uber, destination déjà remplie'/);
  assert.doesNotMatch(app, /'Ouvre Uber, destination déjà remplie'/);
});
