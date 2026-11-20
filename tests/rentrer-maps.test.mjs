// v276 (mon choix C du 20 nov. 2026) : Rentrer a un bouton « Google Maps » : le trajet en transports
// jusqu'à ma station Maison, avec les horaires, sans point de départ dans le lien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Rentrer : « Google Maps » en transports vers la station Maison, sans ma position', () => {
  const i = app.indexOf('async function openHomePlan');
  assert.ok(i > 0);
  const body = app.slice(i, app.indexOf('\n}\n', i));
  const m = body.match(/href: `(https:\/\/www\.google\.com\/maps\/dir\/[^`]+)`/);
  assert.ok(m, 'un lien Google Maps dans Rentrer');
  assert.match(m[1], /destination=\$\{home\.st\.lat\},\$\{home\.st\.lng\}/);
  assert.match(m[1], /travelmode=transit/);
  assert.equal(m[1].includes('origin='), false, 'jamais de point de départ envoyé');
  // une seule plaque pleine dans l'écran, et sous « Mes stations » (rien ne bouge au-dessus)
  assert.equal((body.match(/class: 'btn primary'/g) ?? []).length, 1);
  assert.ok(body.indexOf("'Mes stations'") < body.indexOf("'Google Maps'"));
});
