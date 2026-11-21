// v339 (mon choix 3A du 21 nov.) : créer un parcours hors de Paris disait « touche plus près d'une rue » ;
// pendant le tracé, les épingles des calques ouvraient leur page au lieu de poser une étape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPlan, onPlan, snap } from '../js/rues.js';

const plan = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('onPlan : vrai dans Paris, y compris loin d\'une rue (Seine, bois), faux hors du plan', () => {
  assert.ok(plan, 'plan des rues lisible');
  assert.equal(onPlan(plan, { lat: 48.8676, lng: 2.3636 }), true); // République
  assert.equal(onPlan(plan, { lat: 48.8579, lng: 2.3420 }), true); // sur la Seine, Pont-Neuf
  assert.equal(onPlan(plan, { lat: 48.8620, lng: 2.2490 }), true); // bois de Boulogne
  assert.equal(onPlan(plan, { lat: 45.8992, lng: 6.1294 }), false); // Annecy
  assert.equal(snap(plan, { lat: 45.8992, lng: 6.1294 }), null);
  assert.equal(onPlan(plan, { lat: 48.7000, lng: 2.1000 }), false); // au-delà des abords de Paris
  assert.equal(onPlan(null, { lat: 48.86, lng: 2.35 }), false);
});

test('hors du plan, le message dit de déplacer la carte sur Paris', () => {
  const line = app.split('\n').find((l) => l.includes('if (!s) { toast(onPlan(streets, at) ?')) ?? '';
  assert.ok(line.includes(": 'Le plan des rues ne couvre que Paris : déplace la carte sur Paris.'"), line);
});

test('pendant le tracé, chaque épingle de calque pose une étape (orTrace)', () => {
  for (const open of ['openVelibStation(s.id)', 'openPratSpot(x)', 'openMarket(m)', 'openStreetEvent(e)', 'openTtbPlace(x, arrBack())', 'openArcade(a))).addTo', 'ARCADE_LINE_ZOOM + 1)))']) {
    const i = app.indexOf(open);
    assert.ok(i > 0, open);
    assert.match(app.slice(i - 60, i), /orTrace\(/, `${open} passe par orTrace`);
  }
  assert.match(app, /function orTrace\(fn\) \{ return \(e\) => \{ if \(view === 'trace'\) \{ if \(e\?\.latlng\) traceTap\(e\.latlng\.lat, e\.latlng\.lng\); return; \} fn\(e\); \}; \}/);
});
