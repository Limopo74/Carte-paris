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
