// v420 (ma demande du 24 nov. : « Corrige ») : une étiquette de cercle ne couvre jamais le point bleu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('étiquette de cercle : mesurée, retirée si son bord passe à moins de 16 px du centre', () => {
  assert.match(app, /const RING_LABEL_GAP = 16;/);
  const b = app.slice(app.indexOf('function drawRings('), app.indexOf('function listRingsAt('));
  assert.match(b, /getBoundingClientRect\(\)\.width/);
  assert.match(b, /if \(px - w \/ 2 < RING_LABEL_GAP\) \{ layer\.removeLayer\(m\); return; \}/);
  assert.ok(b.indexOf('RING_LABEL_GAP) {') < b.indexOf('last[side] = px;'), 'une étiquette retirée ne bloque pas la place de la suivante');
});
