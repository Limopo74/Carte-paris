import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaveAt } from '../js/art.js';
import { cleanTuning } from '../js/reglages.js';

// v365 (ma demande du 21 nov.) : la marge de « Pars à » se règle, 20 min au départ
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('« Pars à » : 20 min de marge au départ, en plus du trajet', () => {
  const at = new Date(2026, 10, 21, 15, 0).getTime();
  const m = cleanTuning().leaveMin;
  assert.equal(m, 20);
  const d = leaveAt(at, 18, m);
  assert.equal(d.getHours() * 60 + d.getMinutes(), 14 * 60 + 22);
});

test('le départ calculé lit le réglage, pas une marge fixe', () => {
  assert.match(app, /leaveAt\(p\.ticket\.at, travel, tune\('leaveMin'\)\)/);
  assert.match(app, /tuneRow\('leaveMin'/);
  assert.match(app, /PAGE_KEYS = \[[^\]]*'leaveMin'/);
  assert.ok(!/plus 5 min de marge/.test(app), 'l\'aide ne dit plus 5 min');
});
